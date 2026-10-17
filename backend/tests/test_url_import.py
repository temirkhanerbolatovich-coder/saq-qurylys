from dataclasses import replace
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

import pytest
from conftest import mutation_headers
from sqlalchemy import func, select

from app import url_import
from app.models import Advertisement, AnalysisJob, Asset, User, utcnow
from app.storage import read_asset
from app.url_fetcher import FetchError, HtmlPage
from app.worker import claim_job, process_one

URL = 'https://primeminister.kz/ru/news/zhilishchnaya-programma-123'


def source_page(body=None):
    body = (
        body or 'Официальное сообщение о жилищной программе. Первоначальный взнос по ипотеке составляет 10 процентов.'
    )
    content = (
        '<html><div class="articles__container">23 Январь 2025, 16:00</div>'
        '<h1 class="articles__title">Жилищная программа</h1>'
        '<div class="articles__container"><p>' + body + '</p><script>secret()</script></div>'
        '<div class="articles__container articles__container-bottom">Telegram promo</div></html>'
    ).encode()
    return HtmlPage(URL, URL, (), 'text/html', datetime.now(UTC).isoformat(), content)


def enqueue(client, key=None, **changes):
    return client.post(
        '/api/v1/advertisements/import-url',
        json={'url': URL, 'is_demo': False, **changes},
        headers=mutation_headers(client, key),
    )


def prioritize(client, job_id):
    # Other scenarios share this disposable schema and may leave queued jobs.
    # Exercise this scenario's real claim/worker without processing their work.
    with client.app.state.sessions.begin() as db:
        db.get(AnalysisJob, UUID(job_id)).created_at = datetime(1970, 1, 1, tzinfo=UTC)


@pytest.mark.parametrize(
    ('path', 'language'),
    [
        ('/ru/news/zhilishchnaya-programma-123', 'ru'),
        ('/news/zhilishchnaya-programma-123', 'kz'),
        ('/ru/news/press/zhilishchnaya-programma-123', 'ru'),
        ('/ru/news/reviews/zhilishchnaya-programma-123', 'ru'),
    ],
)
def test_parser_selects_article_without_date_promo_or_scripts(path, language):
    url = 'https://primeminister.kz' + path
    result = url_import.parse_publication(replace(source_page(), requested_url=url, final_url=url))
    assert result.language == language and result.published_at is None
    assert 'Первоначальный взнос' in result.text
    assert all(value not in result.text for value in ('Telegram', 'secret', '2025'))


def test_parser_rejects_shell_and_bad_encoding():
    page = source_page()
    for content in (b'<html>Enable JavaScript to continue</html>', b'\xff\xfe'):
        with pytest.raises(url_import.ImportRejected):
            url_import.parse_publication(HtmlPage(URL, URL, (), 'text/html', page.captured_at, content))


@pytest.mark.parametrize(
    'url',
    [
        'https://krisha.kz/a/show/1',
        'http://primeminister.kz/ru/news/test',
        'https://primeminister.kz/ru/news/test?x=1',
        'https://primeminister.kz/news',
        'https://primeminister.kz/ru/news/unknown/test',
        'https://primeminister.kz/ru/news/reviews/extra/test',
        'https://primeminister.kz/ru/news/press/test/extra',
        'https://primeminister.kz/news/press/test',
        'https://primeminister.kz/news/reviews/test',
        'https://primeminister.kz/ru/news/press',
        'https://primeminister.kz/ru/news/reviews',
        'https://primeminister.kz/ru/news/press/',
        'https://primeminister.kz/ru/news/reviews/',
        'https://primeminister.kz/ru/news/%70ress/test',
        'https://primeminister.kz/ru/news/reviews/%74est',
        'https://primeminister.kz/ru/news/press/test?x=1',
        'https://primeminister.kz/ru/news/reviews/test?x=1',
    ],
)
def test_source_is_closed_to_unapproved_urls(url):
    with pytest.raises(FetchError):
        url_import.approved_url(url)


def test_queue_permissions_csrf_idempotency_and_duplicate_active_url(signed, monkeypatch):
    monkeypatch.setattr(url_import, 'fetch_html', lambda *a: pytest.fail('API must not fetch'))
    assert enqueue(signed, is_demo=True).status_code == 422
    assert enqueue(signed, url='https://krisha.kz/a/show/1').status_code == 422
    assert (
        signed.post(
            '/api/v1/advertisements/import-url',
            json={'url': URL, 'is_demo': False},
            headers={'Idempotency-Key': str(uuid4())},
        ).status_code
        == 422
    )
    key = uuid4()
    first = enqueue(signed, key)
    assert first.status_code == 202
    assert enqueue(signed, key).json() == first.json()
    assert enqueue(signed).json()['id'] == first.json()['id']
    assert enqueue(signed, key, url=URL + '-changed').status_code == 409
    with signed.app.state.sessions.begin() as db:
        user = db.scalar(select(User).where(User.role == 'analyst'))
        user_id = user.id
        user.role = 'viewer'
    try:
        assert enqueue(signed).status_code == 403
    finally:
        with signed.app.state.sessions.begin() as db:
            db.get(User, user_id).role = 'analyst'


def test_worker_preserves_original_and_deduplicates_without_autoanalysis(signed, monkeypatch):
    sessions, settings = signed.app.state.sessions, signed.app.state.settings
    page = source_page()
    monkeypatch.setattr(url_import, 'fetch_html', lambda *a: page)
    queued = enqueue(signed).json()
    prioritize(signed, queued['id'])
    assert process_one(sessions, settings)
    first = signed.get('/api/v1/analysis-jobs/' + queued['id']).json()
    assert first['state'] == 'SUCCEEDED' and first['advertisement_id']
    ad = signed.get('/api/v1/advertisements/' + first['advertisement_id']).json()
    assert ad['status'] == 'NEW' and ad['confirmed_property_id'] is None and not ad['is_demo']
    assert ad['published_at'] is None and {a['kind'] for a in ad['assets']} == {'HTML', 'TEXT'}
    assert signed.get('/api/v1/assets/' + first['result_asset_id']).content == page.content
    assert signed.get('/api/v1/advertisements/' + ad['id'] + '/extractions').json() == []
    with sessions() as db:
        asset = db.get(Asset, UUID(first['result_asset_id']))
        assert read_asset(settings.storage_root, asset.storage_key, asset.sha256) == page.content
        assert asset.source_details['license_url'] == url_import.LICENSE_URL
    second = enqueue(signed).json()
    prioritize(signed, second['id'])
    assert process_one(sessions, settings)
    repeated = signed.get('/api/v1/analysis-jobs/' + second['id']).json()
    assert repeated['state'] == 'SUCCEEDED' and repeated['advertisement_id'] == ad['id']
    # Changed article content creates a separate immutable version.
    monkeypatch.setattr(
        url_import, 'fetch_html', lambda *a: source_page('Новая версия. ' + 'Официальный текст программы. ' * 5)
    )
    third = enqueue(signed).json()
    prioritize(signed, third['id'])
    assert process_one(sessions, settings)
    changed = signed.get('/api/v1/analysis-jobs/' + third['id']).json()
    assert changed['advertisement_id'] != ad['id']
    assert signed.get('/api/v1/advertisements/' + ad['id']).json()['original_text'] == ad['original_text']


def test_failed_fetch_has_no_ad_and_expired_claim_cannot_commit(signed, monkeypatch):
    sessions, settings = signed.app.state.sessions, signed.app.state.settings

    def unavailable(*args):
        raise FetchError('FETCH_TIMEOUT')

    monkeypatch.setattr(url_import, 'fetch_html', unavailable)
    queued = enqueue(signed).json()
    prioritize(signed, queued['id'])
    assert process_one(sessions, settings)
    failed = signed.get('/api/v1/analysis-jobs/' + queued['id']).json()
    assert failed['state'] == 'FAILED' and failed['advertisement_id'] is None
    assert failed['error']['error']['code'] == 'FETCH_TIMEOUT'
    retry = enqueue(signed).json()
    prioritize(signed, retry['id'])
    job_id, old_token, _, attempt = claim_job(sessions, settings)
    with sessions.begin() as db:
        db.get(AnalysisJob, job_id).lease_until = utcnow() - timedelta(seconds=1)
    reclaimed_id, new_token, _, _ = claim_job(sessions, settings)
    assert reclaimed_id == job_id and new_token != old_token
    monkeypatch.setattr(url_import, 'fetch_html', lambda *a: source_page())
    with sessions() as db:
        before = db.scalar(select(func.count()).select_from(Advertisement))
    url_import.process_import_job(sessions, settings, job_id, old_token, attempt)
    with sessions() as db:
        assert db.scalar(select(func.count()).select_from(Advertisement)) == before
        assert db.get(AnalysisJob, UUID(retry['id'])).claim_token == new_token
    # Complete the recovered job so later queue tests do not consume it.
    url_import.process_import_job(sessions, settings, job_id, new_token, attempt + 1)
