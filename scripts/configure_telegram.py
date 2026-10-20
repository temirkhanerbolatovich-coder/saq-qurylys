"""Pair the notification bot with an explicitly selected private chat. Never print credentials."""

import argparse
import hashlib
import hmac
import json
import os
import re
import secrets
import sys
import time
from pathlib import Path
from uuid import UUID, uuid4

from sqlalchemy import create_engine, func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'backend'))

from app.config import Settings  # noqa: E402
from app.models import TelegramNotification, utcnow  # noqa: E402
from app.telegram import TelegramClient, TelegramError  # noqa: E402

PAIR_FILE = ROOT / '.local/telegram-pairing.json'
TOKEN_FILE = ROOT / '.local/telegram-bot-token.txt'


def write_private(path, text):
    temporary = path.with_name(path.name + '.' + uuid4().hex)
    path.parent.mkdir(parents=True, exist_ok=True)
    try:
        with temporary.open('x', encoding='utf-8') as stream:
            os.chmod(temporary, 0o600)
            stream.write(text)
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)


def update_environment(values, *, replace=False):
    path = ROOT / '.env'
    content = path.read_text(encoding='utf-8')
    lines = content.splitlines()
    current = dict(line.split('=', 1) for line in lines if '=' in line and not line.lstrip().startswith('#'))
    for key in ('TELEGRAM_CHAT_ID', 'TELEGRAM_BOT_TOKEN'):
        if key in values and current.get(key) and current[key] != values[key] and not replace:
            raise ValueError('Telegram уже настроен. Для явной смены чата/бота используйте complete --replace.')
    output = [line for line in lines if line.split('=', 1)[0] not in values]
    output.extend(f'{key}={value}' for key, value in values.items())
    write_private(path, '\n'.join(output) + '\n')


def bot_client(settings):
    token = TOKEN_FILE.read_text(encoding='utf-8-sig').strip() if TOKEN_FILE.exists() else ''
    token = token or settings.telegram_bot_token.get_secret_value()
    return TelegramClient(token, settings.telegram_timeout_seconds), token


def identity(client):
    bot = client.call('getMe')
    if not isinstance(bot, dict) or bot.get('is_bot') is not True or type(bot.get('id')) is not int or bot['id'] <= 0:
        raise ValueError('Telegram не подтвердил идентичность бота.')
    username = bot.get('username', '')
    if not isinstance(username, str) or not re.fullmatch(r'[A-Za-z0-9_]{5,32}', username):
        raise ValueError('Telegram не вернул корректный username бота.')
    webhook = client.call('getWebhookInfo')
    if not isinstance(webhook, dict) or webhook.get('url') != '':
        raise ValueError('У бота установлен webhook. Настройка сохранена; автоматического удаления webhook нет.')
    return bot


def matching_chats(updates, state):
    """An ordinary /start, a group, a forwarded command or an expired code cannot bind a chat."""
    found = set()
    for update in updates:
        if not isinstance(update, dict):
            continue
        message = update.get('message')
        if not isinstance(message, dict) or message.get('forward_origin') or message.get('via_bot'):
            continue
        chat, sender = message.get('chat'), message.get('from')
        if not isinstance(chat, dict) or not isinstance(sender, dict):
            continue
        chat_id = chat.get('id')
        if chat.get('type') != 'private' or type(chat_id) is not int or not 0 < chat_id < 2**52:
            continue
        if sender.get('id') != chat_id or sender.get('is_bot') is not False:
            continue
        text = message.get('text', '')
        if not isinstance(text, str) or not text.startswith('/start '):
            continue
        code = text[7:]
        if not 32 <= len(code) <= 64:
            continue
        digest = hashlib.sha256(code.encode('utf-8')).hexdigest()
        if hmac.compare_digest(digest, state['code_hash']):
            found.add(str(chat_id))
    return found


def pair(settings):
    client, _ = bot_client(settings)
    bot = identity(client)
    code = secrets.token_urlsafe(32)
    state = {
        'bot_id': bot['id'],
        'code_hash': hashlib.sha256(code.encode()).hexdigest(),
        'created_at': time.time(),
        'offset': 0,
        'completed': False,
    }
    write_private(PAIR_FILE, json.dumps(state))
    print(
        f'Откройте ссылку в личном Telegram и нажмите Start (действует 10 минут):\nhttps://t.me/{bot["username"]}?start={code}'
    )
    print('После Start выполните: .venv\\Scripts\\python.exe scripts/configure_telegram.py complete')


def complete(settings, replace):
    state = json.loads(PAIR_FILE.read_text(encoding='utf-8'))
    if state.get('completed'):
        raise ValueError('Этот код уже использован. Настройка сохранена; для новой привязки выполните pair.')
    if not 0 <= time.time() - state['created_at'] <= 600:
        raise ValueError('Срок кода истёк. Выполните pair снова.')
    client, token = bot_client(settings)
    if int(token.split(':', 1)[0]) != state['bot_id']:
        raise ValueError('Токен относится к другому боту. Выполните pair снова.')
    chats = {state['matched_chat_id']} if state.get('matched_chat_id') else set()
    for _ in range(10):
        if chats:
            break
        updates = client.call(
            'getUpdates',
            {
                'offset': state['offset'],
                'limit': 10,
                'timeout': 0,
                'allowed_updates': ['message'],
            },
        )
        if not isinstance(updates, list):
            raise TypeError('Telegram не вернул список обновлений.')
        chats.update(matching_chats(updates, state))
        ids = [row['update_id'] for row in updates if isinstance(row, dict) and type(row.get('update_id')) is int]
        if ids:
            state['offset'] = max(ids) + 1
        if len(updates) < 10:
            break
    if len(chats) != 1:
        write_private(PAIR_FILE, json.dumps(state))
        raise ValueError(
            'Подтверждённый личный чат пока не найден или код использован в разных чатах. Для повторной привязки выполните pair.'
        )
    chat_id = chats.pop()
    state['matched_chat_id'] = chat_id
    write_private(PAIR_FILE, json.dumps(state))
    update_environment(
        {
            'TELEGRAM_BOT_TOKEN': token,
            'TELEGRAM_CHAT_ID': chat_id,
            'TELEGRAM_ENABLED': 'true',
        },
        replace=replace,
    )
    state['completed'] = True
    write_private(PAIR_FILE, json.dumps(state))
    try:
        client.send(
            chat_id,
            'SAQ QURYLYS: личный чат подключён. Будут приходить новые подтверждённые факторы риска. DEMO-уведомления по умолчанию выключены. Доставка работает, пока запущен worker SAQ.',
        )
        print('Личный чат подключён; Telegram принял приветственное сообщение. Проверьте его получение в приложении.')
    except TelegramError as error:
        print(
            'Личный чат подключён, состояние приветственного сообщения: '
            + error.code
            + '. Автоматического повтора нет; доступна команда test.'
        )
    print('Приватный .env обновлён. Для применения пересоздайте только SAQ api/worker. Токен не напечатан.')


def status(settings):
    engine = create_engine(settings.database_url, hide_parameters=True)
    try:
        with Session(engine) as db:
            counts = dict(
                db.execute(select(TelegramNotification.state, func.count()).group_by(TelegramNotification.state)).all()
            )
            recent = list(
                db.scalars(select(TelegramNotification).order_by(TelegramNotification.created_at.desc()).limit(10))
            )
            print(
                json.dumps(
                    {
                        'enabled': settings.telegram_enabled,
                        'include_demo': settings.telegram_include_demo,
                        'counts': counts,
                        'recent': [
                            {
                                'id': str(row.id),
                                'state': row.state,
                                'attempt': row.attempt,
                                'error_code': row.error_code,
                            }
                            for row in recent
                        ],
                    },
                    ensure_ascii=False,
                )
            )
    finally:
        engine.dispose()


def retry(settings, notification_id, allow_unknown):
    engine = create_engine(settings.database_url, hide_parameters=True)
    try:
        with Session(engine) as db, db.begin():
            row = db.scalar(
                select(TelegramNotification).where(TelegramNotification.id == notification_id).with_for_update()
            )
            if not row or row.state not in {'FAILED', 'UNKNOWN'}:
                raise ValueError('Повтор разрешён только для существующей FAILED/UNKNOWN записи.')
            if row.state == 'UNKNOWN' and not allow_unknown:
                raise ValueError(
                    'Сообщение могло быть доставлено. Сначала проверьте чат; явный повтор требует --allow-unknown и может дать дубль.'
                )
            row.state, row.attempt, row.error_code, row.lease_until = (
                'QUEUED',
                0,
                None,
                None,
            )
            row.next_attempt_at = utcnow()
        print('Запись возвращена в очередь. Worker проверит прежнего получателя и актуальность фактора.')
    finally:
        engine.dispose()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    for name in ('pair', 'check', 'test', 'status', 'disable'):
        sub.add_parser(name)
    sub.add_parser('complete').add_argument('--replace', action='store_true')
    repeat = sub.add_parser('retry')
    repeat.add_argument('id', type=UUID)
    repeat.add_argument('--allow-unknown', action='store_true')
    args = parser.parse_args()
    try:
        if args.command == 'disable':
            update_environment({'TELEGRAM_ENABLED': 'false'})
            print('Telegram выключен в .env. Пересоздайте SAQ api/worker для применения.')
            return 0
        settings = Settings()
        if args.command == 'pair':
            pair(settings)
        elif args.command == 'complete':
            complete(settings, args.replace)
        elif args.command == 'status':
            status(settings)
        elif args.command == 'retry':
            retry(settings, args.id, args.allow_unknown)
        else:
            client, _ = bot_client(settings)
            bot = identity(client)
            if args.command == 'check':
                print('Telegram подтвердил бота @' + bot['username'] + '. Токен не напечатан.')
            else:
                if not settings.telegram_chat_id:
                    raise ValueError('Сначала привяжите личный чат: pair → Start → complete.')
                if str(bot['id']) != settings.telegram_bot_token.get_secret_value().split(':', 1)[0]:
                    raise ValueError(
                        'Токен файла отличается от настроенного бота; тест сохранённому чату не отправлен.'
                    )
                client.send(
                    settings.telegram_chat_id,
                    'SAQ QURYLYS · DEMO\nПроверка доставки уведомлений. Факторы и баллы объектов не изменялись.',
                )
                print('Telegram принял DEMO-сообщение; подтвердите его получение в приложении.')
    except (TelegramError, ValueError, OSError, KeyError) as error:
        print(
            'Настройка Telegram: ' + str(error)
            if isinstance(error, (TelegramError, ValueError))
            else 'Настройка Telegram: проверьте локальные файлы и подключение.',
            file=sys.stderr,
        )
        return 1
    except (TypeError, SQLAlchemyError):
        print(
            'Не удалось выполнить команду Telegram. Проверьте конфигурацию/миграции; приватные значения не выводятся.',
            file=sys.stderr,
        )
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
