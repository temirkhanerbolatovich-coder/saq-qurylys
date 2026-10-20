from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from threading import Barrier
from uuid import UUID, uuid4

import pytest
from conftest import mutation_headers
from sqlalchemy import func, select

from app import url_import
from app.models import Advertisement, AnalysisJob, Asset, RiskFactor, Signal, UrlSchedule, UrlScheduleRun, User, utcnow
from app.url_schedules import tick_url_schedules
from app.worker import claim_job

API = '/api/v1/monitoring/url-schedules'


@pytest.fixture(autouse=True)
def isolated_schedules(signed, monkeypatch):
    monkeypatch.setattr(url_import, 'fetch_html', lambda *a: pytest.fail('Settings/tick must not fetch HTTP'))
    yield
    with signed.app.state.sessions.begin() as db:
        for row in db.scalars(select(UrlSchedule)):
            row.enabled, row.next_run_at = False, None
        for row in db.scalars(select(UrlScheduleRun).where(UrlScheduleRun.state == 'QUEUED')):
            job = db.get(AnalysisJob, row.job_id)
            job.state = 'FAILED'
            row.state, row.finished_at = 'FAILED', utcnow()


def create(client, **changes):
    return client.post(
        API,
        json=dict(
            name='DEMO расписание',
            interval_minutes=60,
            url=f'https://primeminister.kz/ru/news/demo-{uuid4().hex}',
        )
        | changes,
        headers=mutation_headers(client),
    )


def state(client, row, enabled=True, key=None):
    return client.post(
        f'{API}/{row["id"]}/state',
        json=dict(expected_revision=row['revision'], enabled=enabled),
        headers=mutation_headers(client, key),
    )


def due(client, row):
    with client.app.state.sessions.begin() as db:
        db.get(UrlSchedule, UUID(row['id'])).next_run_at = utcnow() - timedelta(days=3)


def tick(client, **changes):
    return tick_url_schedules(client.app.state.sessions, client.app.state.settings, **changes)


def history(client, row):
    return client.get(f'{API}/{row["id"]}/runs').json()['items']


def test_default_off_save_enable_disable_and_reads_never_queue(signed):
    row = create(signed).json()
    assert not row['enabled'] and row['revision'] == 1 and row['next_run_at'] is None
    assert not tick(signed)
    assert history(signed, row) == []
    key = uuid4()
    enabled = state(signed, row, key=key).json()
    assert enabled['enabled'] and enabled['revision'] == 2
    assert state(signed, row, key=key).json() == enabled
    assert not tick(signed)
    assert signed.get(f'{API}/{row["id"]}').json() == enabled
    disabled = state(signed, enabled, False).json()
    assert not disabled['enabled'] and disabled['next_run_at'] is None
    assert not tick(signed)
    assert history(signed, row) == []


@pytest.mark.parametrize(
    'changes',
    [
        dict(url='http://127.0.0.1/a'),
        dict(interval_minutes=59),
        dict(interval_minutes=10081),
        dict(interval_minutes=True),
        dict(name=' '),
        dict(enabled=True),
        dict(profile_id=str(uuid4())),
    ],
)
def test_invalid_settings_rejected(signed, changes):
    payload = dict(name='DEMO', interval_minutes=60, url='https://www.angroups.kz/payment') | changes
    assert signed.post(API, json=payload, headers=mutation_headers(signed)).status_code == 422


def test_settings_conflicts_duplicate_and_immutable_url(signed):
    row = create(signed).json()
    assert create(signed, url=row['url']).status_code == 409
    enabled = state(signed, row).json()
    body = dict(expected_revision=enabled['revision'], name='DEMO новое имя', interval_minutes=120)
    assert signed.post(f'{API}/{row["id"]}/settings', json=body, headers=mutation_headers(signed)).status_code == 409
    assert state(signed, row, False).status_code == 409
    disabled = state(signed, enabled, False).json()
    body['expected_revision'] = disabled['revision']
    edited = signed.post(f'{API}/{row["id"]}/settings', json=body, headers=mutation_headers(signed)).json()
    assert edited['interval_minutes'] == 120 and edited['url'] == row['url'] and not edited['enabled']
    assert history(signed, row) == []


def test_due_two_workers_restart_one_job_and_no_catchup_burst(signed):
    row = state(signed, create(signed).json()).json()
    # The full suite shares a disposable schema. Earlier manual imports must not
    # consume this concurrency scenario's source budget or queue capacity.
    with signed.app.state.sessions.begin() as db:
        for job in db.scalars(select(AnalysisJob).where(AnalysisJob.kind == 'IMPORT_URL')):
            job.created_at, job.state = utcnow() - timedelta(days=1), 'FAILED'
    due(signed, row)
    barrier = Barrier(2)

    def run(_):
        barrier.wait(timeout=10)
        return tick(signed)

    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sorted(pool.map(run, range(2))) == [False, True]
    runs = history(signed, row)
    assert len(runs) == 1 and runs[0]['state'] == 'QUEUED'
    assert runs[0]['configuration']['revision'] == row['revision']
    # A fresh tick/session simulates scheduler restart; pending work is retained.
    due(signed, row)
    assert not tick(signed)
    assert history(signed, row)[0]['job_id'] == runs[0]['job_id']
    disabled = state(signed, row, False).json()
    with signed.app.state.sessions.begin() as db:
        job = db.get(AnalysisJob, UUID(runs[0]['job_id']))
        job.state, job.updated_at = 'SUCCEEDED', utcnow()
    assert not tick(signed)
    assert history(signed, row)[0]['state'] == 'SUCCEEDED'
    assert not signed.get(f'{API}/{disabled["id"]}').json()['enabled']


def test_source_budget_shared_across_urls_and_manual_admissions(signed):
    row = state(signed, create(signed).json()).json()
    with signed.app.state.sessions.begin() as db:
        db.add(
            AnalysisJob(
                kind='IMPORT_URL',
                state='SUCCEEDED',
                created_by=UUID(row['created_by']),
                request_id=uuid4(),
                input_payload=dict(url='https://primeminister.kz/ru/news/manual', source_id=row['source_id']),
            )
        )
    due(signed, row)
    assert tick(signed)
    run = history(signed, row)[0]
    assert run['state'] == 'DEFERRED' and run['reason'] == 'SOURCE_QUOTA' and run['job_id'] is None
    assert not tick(signed)


def test_transient_backoff_and_permanent_pause_are_durable(signed):
    row = state(signed, create(signed).json()).json()
    # Other tests' manual admissions intentionally count against this source.
    with signed.app.state.sessions.begin() as db:
        for job in db.scalars(select(AnalysisJob).where(AnalysisJob.kind == 'IMPORT_URL')):
            job.created_at = utcnow() - timedelta(days=1)
    due(signed, row)
    assert tick(signed)
    run = history(signed, row)[0]
    with signed.app.state.sessions.begin() as db:
        job = db.get(AnalysisJob, UUID(run['job_id']))
        job.state, job.error = 'FAILED', {'error': {'code': 'FETCH_TIMEOUT'}}
    assert not tick(signed)
    changed = signed.get(f'{API}/{row["id"]}').json()
    assert changed['enabled'] and changed['pause_reason'] == 'BACKOFF' and changed['failure_count'] == 1
    with signed.app.state.sessions.begin() as db:
        for job in db.scalars(select(AnalysisJob).where(AnalysisJob.kind == 'IMPORT_URL')):
            job.created_at = utcnow() - timedelta(days=1)
    due(signed, row)
    assert tick(signed)
    with signed.app.state.sessions.begin() as db:
        job = db.get(AnalysisJob, UUID(history(signed, row)[0]['job_id']))
        job.state, job.error = 'BLOCKED', {'error': {'code': 'SOURCE_MARKUP_CHANGED'}}
    assert not tick(signed)
    changed = signed.get(f'{API}/{row["id"]}').json()
    assert not changed['enabled'] and changed['pause_reason'] == 'SOURCE_MARKUP_CHANGED'
    assert changed['revision'] == row['revision'] + 1
    assert history(signed, row)[0]['configuration']['revision'] == row['revision']


def test_old_run_cannot_pause_new_configuration_and_actor_role_is_rechecked(signed):
    row = state(signed, create(signed).json()).json()
    with signed.app.state.sessions.begin() as db:
        for job in db.scalars(select(AnalysisJob).where(AnalysisJob.kind == 'IMPORT_URL')):
            job.created_at = utcnow() - timedelta(days=1)
    due(signed, row)
    assert tick(signed)
    job_id = UUID(history(signed, row)[0]['job_id'])
    row = state(signed, state(signed, row, False).json()).json()
    with signed.app.state.sessions.begin() as db:
        db.get(AnalysisJob, job_id).state = 'BLOCKED'
    assert not tick(signed)
    assert signed.get(f'{API}/{row["id"]}').json()['enabled']
    due(signed, row)
    with signed.app.state.sessions.begin() as db:
        db.get(User, UUID(row['updated_by'])).role = 'viewer'
    try:
        assert tick(signed)
        assert history(signed, row)[0]['reason'] == 'ACTOR_NOT_ANALYST'
        assert state(signed, row).status_code == 403
    finally:
        with signed.app.state.sessions.begin() as db:
            db.get(User, UUID(row['updated_by'])).role = 'analyst'


def test_permissions_csrf_and_protected_data_unchanged(signed, client):
    models = [Advertisement, Asset, RiskFactor, Signal]
    with signed.app.state.sessions() as db:
        before = [db.scalar(select(func.count()).select_from(model)) for model in models]
    row = create(signed).json()
    for path in [API, f'{API}/{row["id"]}', f'{API}/{row["id"]}/runs']:
        assert signed.get(path).status_code == 200
    assert signed.get(f'{API}/{uuid4()}').status_code == 404
    assert (
        signed.post(
            f'{API}/{row["id"]}/state',
            json=dict(expected_revision=1, enabled=True),
            headers={'Origin': 'http://localhost:3000', 'X-CSRF-Token': 'x' * 32, 'Idempotency-Key': str(uuid4())},
        ).status_code
        == 403
    )
    with signed.app.state.sessions() as db:
        assert [db.scalar(select(func.count()).select_from(model)) for model in models] == before
    client.cookies.clear()
    assert client.get(API).status_code == 401


def test_queue_full_hourly_limit_and_existing_job_reuse(signed):
    row = state(signed, create(signed).json()).json()
    sessions = signed.app.state.sessions
    now = utcnow()
    with sessions.begin() as db:
        for job in db.scalars(select(AnalysisJob).where(AnalysisJob.kind == 'IMPORT_URL')):
            job.created_at, job.state = now - timedelta(days=1), 'FAILED'
        actor = UUID(row['created_by'])
        for index in range(12):
            db.add(
                AnalysisJob(
                    kind='IMPORT_URL',
                    state='SUCCEEDED',
                    created_by=actor,
                    request_id=uuid4(),
                    created_at=now - timedelta(minutes=10),
                    input_payload={
                        'url': f'https://primeminister.kz/ru/news/hour-{index}',
                        'source_id': row['source_id'],
                    },
                )
            )
    due(signed, row)
    assert tick(signed, now=now)
    assert history(signed, row)[0]['reason'] == 'SOURCE_QUOTA'
    with sessions.begin() as db:
        for job in db.scalars(select(AnalysisJob).where(AnalysisJob.kind == 'IMPORT_URL')):
            job.created_at = now - timedelta(days=1)
        for index in range(10):
            db.add(
                AnalysisJob(
                    kind='IMPORT_URL',
                    state='QUEUED',
                    created_by=actor,
                    request_id=uuid4(),
                    created_at=now - timedelta(days=1),
                    input_payload={
                        'url': f'https://primeminister.kz/ru/news/full-{index}',
                        'source_id': row['source_id'],
                    },
                )
            )
    due(signed, row)
    assert tick(signed)
    assert history(signed, row)[0]['reason'] == 'QUEUE_FULL'
    with sessions.begin() as db:
        active = db.scalar(select(AnalysisJob).where(AnalysisJob.state == 'QUEUED', AnalysisJob.kind == 'IMPORT_URL'))
        active.input_payload = {'url': row['url'], 'source_id': row['source_id']}
        active_id = active.id
    due(signed, row)
    assert tick(signed)
    assert history(signed, row)[0]['reused_job']
    assert UUID(history(signed, row)[0]['job_id']) == active_id


def test_real_job_lease_recovery_preserves_history_and_does_not_autoanalyse(signed, monkeypatch):
    from test_url_import import source_page

    row = state(signed, create(signed).json()).json()
    sessions, settings = signed.app.state.sessions, signed.app.state.settings
    with sessions.begin() as db:
        for job in db.scalars(select(AnalysisJob).where(AnalysisJob.kind == 'IMPORT_URL')):
            job.created_at, job.state = utcnow() - timedelta(days=1), 'FAILED'
    due(signed, row)
    assert tick(signed)
    run = history(signed, row)[0]
    with sessions.begin() as db:
        db.get(AnalysisJob, UUID(run['job_id'])).created_at = utcnow() - timedelta(days=365)
    job_id, old_token, _, attempt = claim_job(sessions, settings)
    assert str(job_id) == run['job_id']
    with sessions.begin() as db:
        db.get(AnalysisJob, job_id).lease_until = utcnow() - timedelta(seconds=1)
    recovered, token, _, _ = claim_job(sessions, settings)
    assert recovered == job_id and token != old_token
    from dataclasses import replace

    monkeypatch.setattr(
        url_import, 'fetch_html', lambda *a: replace(source_page(), requested_url=row['url'], final_url=row['url'])
    )
    url_import.process_import_job(sessions, settings, job_id, old_token, attempt)
    assert history(signed, row)[0]['state'] == 'RUNNING'
    url_import.process_import_job(sessions, settings, job_id, token, attempt + 1)
    assert not tick(signed)
    result = history(signed, row)[0]
    assert result['state'] == 'SUCCEEDED' and result['advertisement_id']
    ad = signed.get('/api/v1/advertisements/' + result['advertisement_id']).json()
    assert ad['status'] == 'NEW' and ad['confirmed_property_id'] is None
    assert signed.get('/api/v1/advertisements/' + ad['id'] + '/extractions').json() == []


def test_three_transient_failures_pause_until_explicit_reenable(signed):
    row = state(signed, create(signed).json()).json()
    sessions = signed.app.state.sessions
    for failure in range(1, 4):
        with sessions.begin() as db:
            for job in db.scalars(select(AnalysisJob).where(AnalysisJob.kind == 'IMPORT_URL')):
                job.created_at, job.state = utcnow() - timedelta(days=1), 'FAILED'
        due(signed, row)
        assert tick(signed)
        with sessions.begin() as db:
            job = db.get(AnalysisJob, UUID(history(signed, row)[0]['job_id']))
            job.state, job.error = 'FAILED', {'error': {'code': 'FETCH_TIMEOUT'}}
        assert not tick(signed)
        detail = signed.get(f'{API}/{row["id"]}').json()
        assert detail['failure_count'] == failure
        assert detail['enabled'] == (failure < 3)
    assert detail['next_run_at'] is None
    assert state(signed, row).status_code == 409
    assert state(signed, detail).json()['enabled']


def test_create_replay_and_reads_are_write_free_even_when_due(signed):
    key, body = (
        uuid4(),
        dict(name='DEMO replay', interval_minutes=60, url=f'https://primeminister.kz/ru/news/demo-{uuid4().hex}'),
    )
    first = signed.post(API, json=body, headers=mutation_headers(signed, key))
    assert first.status_code == 201
    assert signed.post(API, json=body, headers=mutation_headers(signed, key)).json() == first.json()
    row = state(signed, first.json()).json()
    due(signed, row)
    with signed.app.state.sessions() as db:
        before = db.scalar(select(func.count()).select_from(AnalysisJob))
    for _ in range(2):
        assert signed.get(API).status_code == 200
        assert signed.get(f'{API}/{row["id"]}').status_code == 200
        assert history(signed, row) == []
    with signed.app.state.sessions() as db:
        assert db.scalar(select(func.count()).select_from(AnalysisJob)) == before
