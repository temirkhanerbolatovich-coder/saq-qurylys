from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from uuid import uuid4

import pytest
from sqlalchemy import func, select

from app import url_import
from app.models import AnalysisJob, AuditEvent, User
from app.url_fetcher import FetchError

URL = 'https://www.angroups.kz/payment'


@pytest.fixture
def queue(client, monkeypatch):
    # Fixtures use only conftest's random disposable PostgreSQL schema.
    sessions = client.app.state.sessions
    monkeypatch.setattr(url_import, 'fetch_html', lambda *a: pytest.fail('Enqueue must not fetch'))
    with sessions.begin() as db:
        actor_id = db.scalar(select(User.id).where(User.role == 'analyst'))
        previous = {
            job.id: job.state
            for job in db.scalars(
                select(AnalysisJob).where(
                    AnalysisJob.kind == 'IMPORT_URL', AnalysisJob.state.in_(['QUEUED', 'RUNNING'])
                )
            )
        }
        for job_id in previous:
            db.get(AnalysisJob, job_id).state = 'FAILED'
    try:
        yield sessions, actor_id
    finally:
        with sessions.begin() as db:
            for job in db.scalars(select(AnalysisJob).where(AnalysisJob.kind == 'IMPORT_URL')):
                job.state = previous.get(job.id, 'FAILED')


def enqueue(db, actor_id, url=URL):
    return url_import.enqueue_url_import(db, url, actor_id=actor_id, request_id=uuid4())


def test_service_revalidates_url_without_writes(queue):
    sessions, actor_id = queue
    with sessions.begin() as db:
        before = db.scalar(select(func.count()).select_from(AnalysisJob))
        with pytest.raises(FetchError):
            enqueue(db, actor_id, 'http://127.0.0.1/private')
        assert db.scalar(select(func.count()).select_from(AnalysisJob)) == before


def test_capacity_reuses_active_job_and_rejects_new_url(queue):
    sessions, actor_id = queue
    with sessions.begin() as db:
        first = enqueue(db, actor_id)
        for index in range(9):
            enqueue(db, actor_id, f'https://primeminister.kz/ru/news/queue-{index}')
        first.state = 'RUNNING'
        db.flush()
        assert enqueue(db, actor_id).id == first.id
        with pytest.raises(url_import.ImportQueueFull):
            enqueue(db, actor_id, 'https://primeminister.kz/ru/news/queue-overflow')
        assert (
            db.scalar(
                select(func.count())
                .select_from(AnalysisJob)
                .where(AnalysisJob.kind == 'IMPORT_URL', AnalysisJob.state.in_(['QUEUED', 'RUNNING']))
            )
            == 10
        )


@pytest.mark.parametrize('state', ['SUCCEEDED', 'FAILED', 'BLOCKED'])
def test_terminal_job_allows_explicit_new_attempt(queue, state):
    sessions, actor_id = queue
    with sessions.begin() as db:
        first = enqueue(db, actor_id)
        first.state = state
        db.flush()
        second = enqueue(db, actor_id)
        assert first.id != second.id
        assert second.input_payload == {'url': URL, 'source_id': url_import.AD_SOURCE_ID}


def test_concurrent_transactions_share_one_job_and_audit(queue):
    sessions, actor_id = queue
    barrier = Barrier(2)

    def submit(_):
        with sessions.begin() as db:
            barrier.wait(timeout=10)
            return enqueue(db, actor_id).id

    with ThreadPoolExecutor(max_workers=2) as pool:
        ids = list(pool.map(submit, range(2)))
    assert ids[0] == ids[1]
    with sessions() as db:
        assert (
            db.scalar(
                select(func.count())
                .select_from(AuditEvent)
                .where(AuditEvent.entity_id == ids[0], AuditEvent.action == 'URL_IMPORT_QUEUED')
            )
            == 1
        )
