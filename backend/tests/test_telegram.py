import hashlib
import importlib.util
import io
import json
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from pathlib import Path
from types import SimpleNamespace
from uuid import UUID, uuid4

import pytest
from conftest import mutation_headers
from pydantic import SecretStr, ValidationError
from sqlalchemy import delete, func, select
from test_appeal import post, upload

from app.config import Settings
from app.models import Property, RiskFactor, TelegramNotification, utcnow
from app.notifications import enqueue_risk_notification, process_telegram_one
from app.seed import demo_id
from app.telegram import NoRedirect, TelegramClient, TelegramError
from app.views import factor_views, property_view

TOKEN = '123456789:' + 'a' * 35


@pytest.fixture(autouse=True)
def no_live_telegram(monkeypatch):
    def denied(*_):
        pytest.fail('Real Telegram traffic is forbidden in automated tests')

    monkeypatch.setattr('app.telegram.build_opener', denied)


@pytest.fixture
def telegram_settings(settings):
    return settings.model_copy(
        update={
            'telegram_enabled': True,
            'telegram_bot_token': SecretStr(TOKEN),
            'telegram_chat_id': '123456',
            'telegram_include_demo': True,
        }
    )


@pytest.fixture
def notification_source(signed):
    with signed.app.state.sessions.begin() as db:
        original = db.get(Property, demo_id('ertis'))
        prop = Property(
            name='DEMO Құрылыс',
            city=original.city,
            address='DEMO',
            developer_id=original.developer_id,
            last_reviewed_at=utcnow(),
        )
        db.add(prop)
        db.flush()
        factor = RiskFactor(
            property_id=prop.id, code='R4', status='CONFIRMED', as_of=utcnow(), reviewed_at=utcnow(), evidence_ids=[]
        )
        db.add(factor)
        db.flush()
        ids = prop.id, factor.id
    yield ids
    with signed.app.state.sessions.begin() as db:
        db.execute(delete(TelegramNotification).where(TelegramNotification.property_id == ids[0]))
        db.execute(delete(RiskFactor).where(RiskFactor.id == ids[1]))
        db.execute(delete(Property).where(Property.id == ids[0]))


def enqueue(signed, configured, ids, before='PENDING'):
    with signed.app.state.sessions.begin() as db:
        prop, factor = db.get(Property, ids[0]), db.get(RiskFactor, ids[1])
        return enqueue_risk_notification(
            db, configured, prop, factor, property_view(prop, factor_views(db, prop.id)).risk, before
        )


def row_state(signed, event_id):
    with signed.app.state.sessions() as db:
        row = db.get(TelegramNotification, event_id)
        return row.state, row.attempt, row.error_code


def test_notification_snapshot_deduplication_and_disabled_demo(
    signed, settings, telegram_settings, notification_source
):
    assert enqueue(signed, settings, notification_source) is None
    assert (
        enqueue(signed, telegram_settings.model_copy(update={'telegram_include_demo': False}), notification_source)
        is None
    )
    assert enqueue(signed, telegram_settings, notification_source, before='CONFIRMED') is None
    event = enqueue(signed, telegram_settings, notification_source)
    assert event and enqueue(signed, telegram_settings, notification_source) is None
    with signed.app.state.sessions() as db:
        row = db.get(TelegramNotification, event)
        assert 'DEMO' in row.text and 'Құрылыс' in row.text and '15 баллов' in row.text
        assert TOKEN not in row.text and 'http://localhost' not in row.text
        assert row.state == 'QUEUED' and row.attempt == 0
        assert (
            db.scalar(
                select(func.count())
                .select_from(TelegramNotification)
                .where(TelegramNotification.property_id == notification_source[0])
            )
            == 1
        )


def test_outbox_rollback_does_not_leave_a_notification(signed, telegram_settings, notification_source):
    with signed.app.state.sessions() as db:
        prop, factor = db.get(Property, notification_source[0]), db.get(RiskFactor, notification_source[1])
        event = enqueue_risk_notification(
            db, telegram_settings, prop, factor, property_view(prop, factor_views(db, prop.id)).risk, 'PENDING'
        )
        db.rollback()
    with signed.app.state.sessions() as db:
        assert db.get(TelegramNotification, event) is None


def test_confirm_api_queues_once_and_reconfirmation_does_not_repeat(signed, settings, telegram_settings, monkeypatch):
    asset = upload(signed).json()
    evidence = post(
        signed,
        '/evidence',
        {
            'property_id': str(demo_id('ertis')),
            'asset_id': asset['id'],
            'kind': 'COLLECTIVE_APPEAL',
            'description': 'DEMO Telegram test',
            'source_label': 'DEMO',
            'event_at': None,
            'is_demo': True,
        },
    ).json()
    detail = signed.get(f'/api/v1/properties/{demo_id("ertis")}').json()
    factor = next((f for f in detail['factors'] if f['code'] == 'R4'), None)
    created_factor = factor is None
    payload = {'evidence_ids': [evidence['id']], 'reason': 'DEMO Telegram API', 'status': 'PENDING'}
    if factor:
        factor = post(
            signed, f'/risk-factors/{factor["id"]}/review', payload | {'expected_revision': factor['revision']}
        ).json()['factor']
    else:
        factor = post(
            signed,
            f'/properties/{demo_id("ertis")}/risk-factors',
            {k: v for k, v in (payload | {'code': 'R4', 'as_of': utcnow().isoformat()}).items() if k != 'status'},
        ).json()['factor']
    monkeypatch.setattr(signed.app.state, 'settings', telegram_settings)
    body = payload | {'expected_revision': factor['revision'], 'status': 'CONFIRMED'}
    key = uuid4()
    response = signed.post(
        f'/api/v1/risk-factors/{factor["id"]}/review', json=body, headers=mutation_headers(signed, key)
    )
    assert response.status_code == 200, response.text
    assert (
        signed.post(
            f'/api/v1/risk-factors/{factor["id"]}/review', json=body, headers=mutation_headers(signed, key)
        ).json()
        == response.json()
    )
    repeated = post(
        signed,
        f'/risk-factors/{factor["id"]}/review',
        body | {'expected_revision': response.json()['factor']['revision']},
    )
    assert repeated.status_code == 200
    with signed.app.state.sessions() as db:
        rows = list(
            db.scalars(select(TelegramNotification).where(TelegramNotification.factor_id == UUID(factor['id'])))
        )
        assert len(rows) == 1 and rows[0].state == 'QUEUED'
        assert db.get(RiskFactor, UUID(factor['id'])).status == 'CONFIRMED'
    # Complete the DEMO workflow normally; retain its evidence/audit.
    post(
        signed,
        f'/risk-factors/{factor["id"]}/review',
        payload | {'expected_revision': repeated.json()['factor']['revision'], 'status': 'REJECTED'},
    )
    with signed.app.state.sessions.begin() as db:
        db.execute(delete(TelegramNotification).where(TelegramNotification.factor_id == UUID(factor['id'])))
        if created_factor:
            db.execute(delete(RiskFactor).where(RiskFactor.id == UUID(factor['id'])))


def test_worker_delivery_is_once_and_does_not_recalculate_risk(
    signed, telegram_settings, notification_source, monkeypatch
):
    event = enqueue(signed, telegram_settings, notification_source)
    sent = []
    monkeypatch.setattr(TelegramClient, 'send', lambda self, chat, text: sent.append((chat, text)) or 77)
    assert process_telegram_one(signed.app.state.sessions, telegram_settings)
    assert row_state(signed, event) == ('SENT', 1, None)
    assert not process_telegram_one(signed.app.state.sessions, telegram_settings)
    assert len(sent) == 1 and sent[0][0] == telegram_settings.telegram_chat_id
    with signed.app.state.sessions() as db:
        assert db.get(TelegramNotification, event).message_id == 77
        assert db.get(RiskFactor, notification_source[1]).status == 'CONFIRMED'


@pytest.mark.parametrize(
    ('failure', 'state'),
    [(TelegramError('TG_403'), 'FAILED'), (TelegramError('TRANSPORT_UNKNOWN', uncertain=True), 'UNKNOWN')],
)
def test_permanent_and_uncertain_failures_never_repeat_automatically(
    signed, telegram_settings, notification_source, monkeypatch, failure, state
):
    event = enqueue(signed, telegram_settings, notification_source)

    def fail(*_):
        raise failure

    monkeypatch.setattr(TelegramClient, 'send', fail)
    assert process_telegram_one(signed.app.state.sessions, telegram_settings)
    assert row_state(signed, event) == (state, 1, failure.code)
    assert not process_telegram_one(signed.app.state.sessions, telegram_settings)


def test_rate_limit_waits_and_then_delivers(signed, telegram_settings, notification_source, monkeypatch):
    event = enqueue(signed, telegram_settings, notification_source)
    with signed.app.state.sessions.begin() as db:
        db.get(RiskFactor, notification_source[1]).revision += 1
    assert enqueue(signed, telegram_settings, notification_source)
    calls = []

    def send(*_):
        calls.append(1)
        if len(calls) == 1:
            raise TelegramError('TG_429', retry_after=120)
        return 99

    monkeypatch.setattr(TelegramClient, 'send', send)
    assert process_telegram_one(signed.app.state.sessions, telegram_settings)
    assert row_state(signed, event) == ('QUEUED', 1, 'TG_429')
    assert not process_telegram_one(signed.app.state.sessions, telegram_settings)
    assert len(calls) == 1
    with signed.app.state.sessions.begin() as db:
        row = db.get(TelegramNotification, event)
        assert row.next_attempt_at > utcnow() + timedelta(seconds=110)
        row.next_attempt_at = utcnow() - timedelta(seconds=1)
    assert process_telegram_one(signed.app.state.sessions, telegram_settings)
    assert row_state(signed, event) == ('SENT', 2, None)


@pytest.mark.parametrize('change', ['factor', 'chat', 'bot', 'expired'])
def test_cancelled_target_and_expired_lease_cannot_send(
    signed, telegram_settings, notification_source, monkeypatch, change
):
    event = enqueue(signed, telegram_settings, notification_source)
    monkeypatch.setattr(TelegramClient, 'send', lambda *_: pytest.fail('network must not run'))
    configured = telegram_settings
    with signed.app.state.sessions.begin() as db:
        row = db.get(TelegramNotification, event)
        if change == 'factor':
            db.get(RiskFactor, notification_source[1]).status = 'REJECTED'
        elif change == 'expired':
            row.state, row.attempt = 'SENDING', 1
            row.lease_until = utcnow() - timedelta(seconds=1)
        elif change == 'chat':
            configured = configured.model_copy(update={'telegram_chat_id': '999'})
        else:
            configured = configured.model_copy(update={'telegram_bot_token': SecretStr('987654321:' + 'b' * 35)})
    assert process_telegram_one(signed.app.state.sessions, configured)
    assert row_state(signed, event)[0] == ('UNKNOWN' if change == 'expired' else 'CANCELLED')


def test_two_workers_claim_one_notification(signed, telegram_settings, notification_source, monkeypatch):
    event = enqueue(signed, telegram_settings, notification_source)
    entered, release = threading.Event(), threading.Event()
    calls = []

    def send(*_):
        calls.append(1)
        entered.set()
        assert release.wait(5)
        return 101

    monkeypatch.setattr(TelegramClient, 'send', send)
    with ThreadPoolExecutor(max_workers=2) as pool:
        first = pool.submit(process_telegram_one, signed.app.state.sessions, telegram_settings)
        try:
            assert entered.wait(5)
            assert not process_telegram_one(signed.app.state.sessions, telegram_settings)
        finally:
            release.set()
        assert first.result(5)
    assert len(calls) == 1 and row_state(signed, event)[0] == 'SENT'


def test_late_sender_cannot_replace_unknown_and_retry_limit_is_respected(
    signed, telegram_settings, notification_source, monkeypatch
):
    event = enqueue(signed, telegram_settings, notification_source)

    def late(*_):
        with signed.app.state.sessions.begin() as db:
            db.get(TelegramNotification, event).state = 'UNKNOWN'
        return 123

    monkeypatch.setattr(TelegramClient, 'send', late)
    assert process_telegram_one(signed.app.state.sessions, telegram_settings)
    assert row_state(signed, event)[0] == 'UNKNOWN'
    with signed.app.state.sessions.begin() as db:
        row = db.get(TelegramNotification, event)
        row.state, row.attempt = 'QUEUED', 0

    def limited(*_):
        raise TelegramError('TG_429', retry_after=120)

    monkeypatch.setattr(TelegramClient, 'send', limited)
    configured = telegram_settings.model_copy(update={'telegram_max_attempts': 1})
    assert process_telegram_one(signed.app.state.sessions, configured)
    assert row_state(signed, event) == ('FAILED', 1, 'TG_429')


def test_valid_transport_preserves_unicode_and_accepts_only_the_expected_chat(monkeypatch):
    sent = []

    def open_request(request, timeout):
        sent.append(json.loads(request.data))
        return io.BytesIO(json.dumps({'ok': True, 'result': {'message_id': 1, 'chat': {'id': 123456}}}).encode())

    monkeypatch.setattr('app.telegram.build_opener', lambda *_: SimpleNamespace(open=open_request))
    assert TelegramClient(TOKEN).send('123456', 'DEMO Құрылыс <без HTML>') == 1
    assert sent[0]['text'] == 'DEMO Құрылыс <без HTML>' and 'parse_mode' not in sent[0]


@pytest.mark.parametrize(
    ('body', 'expected', 'retry', 'uncertain'),
    [
        ({'ok': False, 'error_code': 429, 'parameters': {'retry_after': 17}}, 'TG_429', 17, False),
        ({'ok': False, 'error_code': 403, 'description': TOKEN}, 'TG_403', None, False),
        ({'ok': False, 'error_code': 500}, 'TG_SERVER_ERROR', 30, False),
        ({'ok': False}, 'RESPONSE_UNKNOWN', None, True),
        ({'ok': 'yes'}, 'TRANSPORT_UNKNOWN', None, True),
        ({'ok': True, 'result': {'message_id': 1, 'chat': {'id': 999}}}, 'MESSAGE_RESULT_UNKNOWN', None, True),
    ],
)
def test_transport_errors_are_bounded_and_never_expose_tokens(monkeypatch, body, expected, retry, uncertain):
    def open_request(request, timeout):
        assert request.full_url == f'https://api.telegram.org/bot{TOKEN}/sendMessage'
        assert timeout == 10
        payload = json.loads(request.data)
        assert 'parse_mode' not in payload and payload['link_preview_options']['is_disabled']
        return io.BytesIO(json.dumps(body).encode())

    monkeypatch.setattr('app.telegram.build_opener', lambda *_: SimpleNamespace(open=open_request))
    with pytest.raises(TelegramError) as caught:
        TelegramClient(TOKEN).send('123456', 'DEMO тест')
    assert (caught.value.code, caught.value.retry_after, caught.value.uncertain) == (expected, retry, uncertain)
    assert TOKEN not in str(caught.value)


def test_transport_timeout_oversize_redirect_and_input_guards(monkeypatch):
    def fail(*_, **__):
        raise TimeoutError(TOKEN)

    monkeypatch.setattr('app.telegram.build_opener', lambda *_: SimpleNamespace(open=fail))
    with pytest.raises(TelegramError, match='TRANSPORT_UNKNOWN') as caught:
        TelegramClient(TOKEN).send('123456', 'DEMO')
    assert caught.value.uncertain and TOKEN not in str(caught.value)
    monkeypatch.setattr(
        'app.telegram.build_opener', lambda *_: SimpleNamespace(open=lambda *_args, **_kw: io.BytesIO(b'x' * 65_537))
    )
    with pytest.raises(TelegramError, match='TRANSPORT_UNKNOWN'):
        TelegramClient(TOKEN).send('123456', 'DEMO')
    assert NoRedirect().redirect_request(None, None, 302, '', {}, 'https://example.com') is None
    for chat, text in [('-123', 'DEMO'), ('123', ''), ('123', '😀' * 2049)]:
        with pytest.raises(TelegramError, match='MESSAGE_INVALID'):
            TelegramClient(TOKEN).send(chat, text)
    with pytest.raises(TelegramError, match='TOKEN_INVALID'):
        TelegramClient('invalid')
    with pytest.raises(TelegramError, match='METHOD_NOT_ALLOWED'):
        TelegramClient(TOKEN).call('deleteWebhook')


def test_telegram_configuration_validation_masks_private_input():
    values = {
        '_env_file': None,
        'database_url': 'postgresql+psycopg://test:test@localhost/test',
        'session_secret': 's' * 32,
        'bootstrap_analyst_password': 'test-password-123',
    }
    with pytest.raises(ValidationError) as error:
        Settings(**values, telegram_enabled=True, telegram_bot_token='PRIVATE-INVALID', telegram_chat_id='123')
    assert 'PRIVATE-INVALID' not in str(error.value)
    with pytest.raises(ValidationError):
        Settings(**values, telegram_web_base_url='https://user:password@example.com')
    configured = Settings(**values, telegram_enabled=True, telegram_bot_token=TOKEN, telegram_chat_id='123')
    assert TOKEN not in repr(configured)


@pytest.fixture(scope='module')
def setup():
    path = Path(__file__).resolve().parents[2] / 'scripts/configure_telegram.py'
    spec = importlib.util.spec_from_file_location('saq_telegram_setup', path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_pairing_requires_private_chat_and_one_time_code(setup):
    code = 'x' * 43
    state = {'code_hash': hashlib.sha256(code.encode()).hexdigest()}
    valid = {
        'update_id': 1,
        'message': {
            'text': '/start ' + code,
            'chat': {'id': 123, 'type': 'private'},
            'from': {'id': 123, 'is_bot': False},
        },
    }
    assert setup.matching_chats([valid], state) == {'123'}
    for changes in [
        {'text': '/start'},
        {'text': '/start ' + 'y' * 43},
        {'chat': {'id': -123, 'type': 'group'}},
        {'from': {'id': 999, 'is_bot': False}},
        {'forward_origin': {'type': 'user'}},
        {'from': {'id': 123, 'is_bot': True}},
    ]:
        assert setup.matching_chats([{'message': valid['message'] | changes}], state) == set()


def test_pairing_is_consumed_and_environment_preserves_other_secrets(tmp_path, monkeypatch, settings, setup):
    monkeypatch.setattr(setup, 'ROOT', tmp_path)
    monkeypatch.setattr(setup, 'PAIR_FILE', tmp_path / 'pairing.json')
    code = 'x' * 43
    state = {
        'bot_id': 123456789,
        'code_hash': hashlib.sha256(code.encode()).hexdigest(),
        'created_at': time.time(),
        'offset': 0,
        'completed': False,
    }
    setup.PAIR_FILE.write_text(json.dumps(state), encoding='utf-8')
    (tmp_path / '.env').write_text('KEEP=existing\nPOSTGRES_PASSWORD=unchanged\n', encoding='utf-8')
    updates = [
        {
            'update_id': 1,
            'message': {
                'text': '/start ' + code,
                'chat': {'id': 123, 'type': 'private'},
                'from': {'id': 123, 'is_bot': False},
            },
        }
    ]
    sent = []
    fake = SimpleNamespace(call=lambda *_: updates, send=lambda *args: sent.append(args) or 1)
    monkeypatch.setattr(setup, 'bot_client', lambda _: (fake, TOKEN))
    setup.complete(settings, False)
    content = (tmp_path / '.env').read_text(encoding='utf-8')
    assert 'KEEP=existing' in content and 'POSTGRES_PASSWORD=unchanged' in content
    assert 'TELEGRAM_CHAT_ID=123' in content and 'TELEGRAM_ENABLED=true' in content
    assert len(sent) == 1
    with pytest.raises(ValueError, match='уже использован'):
        setup.complete(settings, False)
    with pytest.raises(ValueError, match='уже настроен'):
        setup.update_environment({'TELEGRAM_CHAT_ID': '456'})


def test_disable_does_not_require_a_valid_token_or_database(tmp_path, monkeypatch, setup):
    monkeypatch.setattr(setup, 'ROOT', tmp_path)
    (tmp_path / '.env').write_text('KEEP=existing\nTELEGRAM_ENABLED=true\n', encoding='utf-8')
    monkeypatch.setattr(setup.sys, 'argv', ['configure_telegram.py', 'disable'])
    monkeypatch.setattr(setup, 'Settings', lambda: pytest.fail('disable must not load incomplete configuration'))
    assert setup.main() == 0
    assert (tmp_path / '.env').read_text(encoding='utf-8') == 'KEEP=existing\nTELEGRAM_ENABLED=false\n'
