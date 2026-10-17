"""A human confirmation queues a snapshot; delivery never runs in that transaction."""

from datetime import timedelta
from uuid import uuid4
from zoneinfo import ZoneInfo

from sqlalchemy import and_, or_, select
from sqlalchemy.dialects.postgresql import insert

from app.models import RiskFactor, TelegramNotification, utcnow
from app.telegram import TelegramClient, TelegramError

FACTOR_LABELS = {
    'R1': 'Отсутствие применимого основания установлено',
    'R2': 'Прямое предложение внести деньги',
    'R3': 'Активная реклама строящегося жилья',
    'R4': 'Коллективное обращение',
    'R5': 'Расхождение готовности не меньше 20 п.п.',
    'R6': 'Подтверждённая задержка',
}


def enqueue_risk_notification(db, settings, prop, factor, risk, before_status):
    if not settings.telegram_enabled or (prop.is_demo and not settings.telegram_include_demo):
        return None
    if factor.status != 'CONFIRMED' or before_status == 'CONFIRMED':
        return None
    event_id = uuid4()
    zone = {'GREEN': 'зелёная', 'YELLOW': 'жёлтая', 'RED': 'красная'}[risk.zone]
    lines = [
        'SAQ QURYLYS' + (' · DEMO' if prop.is_demo else ''),
        'Новый подтверждённый фактор риска',
        'Объект: ' + ' '.join(prop.name.split()),
        f'{factor.code} · {FACTOR_LABELS[factor.code]}',
        f'На момент проверки: {risk.score} баллов, {zone} зона.',
        'Дата оценки фактора: ' + factor.as_of.astimezone(ZoneInfo('Asia/Qyzylorda')).strftime('%d.%m.%Y %H:%M UTC+5'),
        'Проверено: ' + factor.reviewed_at.astimezone(ZoneInfo('Asia/Qyzylorda')).strftime('%d.%m.%Y %H:%M UTC+5'),
        'ID события: ' + str(event_id),
        'Требуется рассмотрение специалистом. Это не установление правонарушения.',
    ]
    if settings.telegram_web_base_url:
        lines.append(f'{settings.telegram_web_base_url.rstrip("/")}/properties/{prop.id}#dossier-history')
    else:
        lines.append('Откройте SAQ QURYLYS → Объекты → История объекта.')
    return db.scalar(
        insert(TelegramNotification)
        .values(
            id=event_id,
            deduplication_key=f'factor:{factor.id}:{factor.revision}',
            property_id=prop.id,
            factor_id=factor.id,
            factor_revision=factor.revision,
            bot_id=settings.telegram_bot_token.get_secret_value().split(':', 1)[0],
            chat_id=settings.telegram_chat_id,
            text='\n'.join(lines),
            state='QUEUED',
            attempt=0,
            next_attempt_at=utcnow(),
            created_at=utcnow(),
        )
        .on_conflict_do_nothing(index_elements=['deduplication_key'])
        .returning(TelegramNotification.id)
    )


def process_telegram_one(sessions, settings):
    if not settings.telegram_enabled:
        return False
    now = utcnow()
    bot_id = settings.telegram_bot_token.get_secret_value().split(':', 1)[0]
    with sessions.begin() as db:
        # A lost lease may follow a successful send. Never automatically repeat it.
        expired = list(
            db.scalars(
                select(TelegramNotification)
                .where(TelegramNotification.state == 'SENDING', TelegramNotification.lease_until < now)
                .with_for_update(skip_locked=True)
                .limit(100)
            )
        )
        for row in expired:
            row.state, row.error_code, row.lease_until = 'UNKNOWN', 'LEASE_EXPIRED', None
        recent = db.scalar(
            select(TelegramNotification.id)
            .where(
                TelegramNotification.bot_id == bot_id,
                TelegramNotification.chat_id == settings.telegram_chat_id,
                or_(
                    TelegramNotification.sent_at > now - timedelta(seconds=1),
                    and_(TelegramNotification.error_code == 'TG_429', TelegramNotification.next_attempt_at > now),
                    TelegramNotification.error_code == 'TG_429_MANUAL',
                ),
            )
            .limit(1)
        )
        if recent:
            return False
        row = db.scalar(
            select(TelegramNotification)
            .where(TelegramNotification.state == 'QUEUED', TelegramNotification.next_attempt_at <= now)
            .order_by(TelegramNotification.created_at, TelegramNotification.id)
            .with_for_update(skip_locked=True)
            .limit(1)
        )
        if not row:
            return bool(expired)
        factor = db.get(RiskFactor, row.factor_id)
        if row.bot_id != bot_id or row.chat_id != settings.telegram_chat_id or factor.status != 'CONFIRMED':
            row.state, row.error_code = 'CANCELLED', 'DESTINATION_OR_FACTOR_CHANGED'
            return True
        row.state, row.attempt = 'SENDING', row.attempt + 1
        row.claim_token = uuid4()
        row.lease_until = now + timedelta(seconds=settings.job_lease_seconds)
        notification_id, claim, chat_id, text = row.id, row.claim_token, row.chat_id, row.text
    failure, message_id = None, None
    try:
        message_id = TelegramClient(
            settings.telegram_bot_token.get_secret_value(), settings.telegram_timeout_seconds
        ).send(chat_id, text)
    except TelegramError as error:
        failure = error
    except Exception:
        failure = TelegramError('DELIVERY_UNKNOWN', uncertain=True)
    with sessions.begin() as db:
        row = db.scalar(
            select(TelegramNotification).where(TelegramNotification.id == notification_id).with_for_update()
        )
        if row.state != 'SENDING' or row.claim_token != claim:
            return True
        row.lease_until = None
        if failure:
            row.error_code = failure.code
            if failure.retry_after:
                row.next_attempt_at = utcnow() + timedelta(seconds=failure.retry_after)
            if failure.uncertain:
                row.state = 'UNKNOWN'
            elif failure.retry_after and row.attempt < settings.telegram_max_attempts:
                row.state = 'QUEUED'
            else:
                row.state = 'FAILED'
        else:
            row.state, row.message_id, row.sent_at, row.error_code = 'SENT', message_id, utcnow(), None
    return True
