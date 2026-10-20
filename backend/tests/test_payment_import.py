"""Behaviour of the bounded public commercial-page adapter (synthetic HTML)."""

from dataclasses import replace
from datetime import UTC, datetime, timedelta
from uuid import UUID

import pytest
from sqlalchemy import func, select
from test_url_import import enqueue, prioritize

from app import url_import
from app.models import Advertisement, AnalysisJob, Asset, utcnow
from app.url_fetcher import FetchError, HtmlPage
from app.worker import claim_job, process_one

URL = 'https://www.angroups.kz/payment'


def payment_page(amount='30%'):
    cards = ''.join(
        '<div class="t1073__col"><div class="t-card__title">DEMO ' + title + '</div>'
        '<div class="t-card__descr">' + body + '<script>secret()</script></div></div>'
        for title, body in [
            ('Полная оплата', 'Условия полной оплаты квартиры. Возможна индивидуальная скидка.'),
            ('Рассрочка', f'Первый взнос {amount}. Рассрочка до ввода дома; условия требуют проверки.'),
            ('Ипотека', 'Повтор условий рассрочки в другой карточке. Не исправлять источник.'),
        ]
    )
    content = (
        '<html><meta property="article:published_time" content="2020-01-01T00:00:00Z">'
        '<nav>promo</nav><h2 class="t795__title">Способы оплаты</h2><div class="t1073">'
        + cards
        + '</div><div class="t396">desktop text</div><form>private</form></html>'
    ).encode()
    return HtmlPage(URL, URL, (), 'text/html', datetime.now(UTC).isoformat(), content)


def test_extracts_reviewed_cards_without_inventing_date_or_merging_layouts():
    parsed = url_import.parse_publication(payment_page())
    assert parsed.published_at is None and parsed.language == 'ru'
    assert '30%' in parsed.text and 'Не исправлять источник.' in parsed.text
    assert all(value not in parsed.text for value in ('secret', 'desktop', 'private', 'promo', '2020'))


@pytest.mark.parametrize(
    'url',
    [
        'http://www.angroups.kz/payment',
        'https://angroups.kz/payment',
        URL + '?utm_source=x',
        URL + '/other',
        URL + '/',
        'https://www.angroups.kz/projects',
        'https://www.angroups.kz/payment#test',
        'https://www.angroups.kz/%70ayment',
        'https://www.angroups.kz.evil.example/payment',
        'https://www.angroups.kz/payment/../header',
    ],
)
def test_only_exact_reviewed_url_is_accepted(url):
    with pytest.raises(FetchError):
        url_import.approved_url(url)


@pytest.mark.parametrize(
    'content',
    [
        b'<html>Enable JavaScript or sign in</html>',
        b'\xff\xfe',
        payment_page().content.replace(b't1073__col', b'changed-column'),
        payment_page().content.replace(b't-card__descr', b'changed-body'),
    ],
)
def test_shell_encoding_and_markup_changes_fail_closed(content):
    with pytest.raises(url_import.ImportRejected):
        url_import.parse_publication(replace(payment_page(), content=content))


def test_worker_preserves_commercial_provenance_and_immutable_versions(signed, monkeypatch):
    sessions, settings = signed.app.state.sessions, signed.app.state.settings
    page = payment_page()
    calls = []

    def fetch(url, policy):
        calls.append((url, policy))
        return page

    monkeypatch.setattr(url_import, 'fetch_html', fetch)

    def run():
        queued = enqueue(signed, url=URL).json()
        prioritize(signed, queued['id'])
        assert process_one(sessions, settings)
        return signed.get('/api/v1/analysis-jobs/' + queued['id']).json()

    first = run()
    assert first['state'] == 'SUCCEEDED'
    ad = signed.get('/api/v1/advertisements/' + first['advertisement_id']).json()
    assert ad['status'] == 'NEW' and ad['confirmed_property_id'] is None
    assert ad['published_at'] is None and not ad['is_demo']
    assert signed.get('/api/v1/assets/' + first['result_asset_id']).content == page.content
    assert signed.get('/api/v1/advertisements/' + ad['id'] + '/extractions').json() == []
    assert calls == [(URL, url_import.AD_POLICY)]
    with sessions() as db:
        source = db.get(Asset, UUID(first['result_asset_id'])).source_details
        assert source['source_id'] == url_import.AD_SOURCE_ID and source['license_url'] is None
        assert source['material_kind'] == 'COMMERCIAL_OFFER' and 'desktop' in source['extraction_scope']
    assert run()['advertisement_id'] == ad['id']
    page = payment_page('40%')
    assert run()['advertisement_id'] != ad['id']
    assert signed.get('/api/v1/advertisements/' + ad['id']).json()['original_text'] == ad['original_text']


def test_failed_fetch_and_worker_reclaim_do_not_duplicate(signed, monkeypatch):
    sessions, settings = signed.app.state.sessions, signed.app.state.settings

    def unavailable(*args):
        raise FetchError('FETCH_TIMEOUT')

    monkeypatch.setattr(url_import, 'fetch_html', unavailable)
    queued = enqueue(signed, url=URL).json()
    prioritize(signed, queued['id'])
    assert process_one(sessions, settings)
    failure = signed.get('/api/v1/analysis-jobs/' + queued['id']).json()
    assert failure['state'] == 'FAILED' and failure['advertisement_id'] is None
    retry = enqueue(signed, url=URL).json()
    prioritize(signed, retry['id'])
    job_id, old_token, _, attempt = claim_job(sessions, settings)
    with sessions.begin() as db:
        db.get(AnalysisJob, job_id).lease_until = utcnow() - timedelta(seconds=1)
    recovered_id, token, _, _ = claim_job(sessions, settings)
    assert recovered_id == job_id and token != old_token
    monkeypatch.setattr(url_import, 'fetch_html', lambda *a: payment_page())
    with sessions() as db:
        before = db.scalar(select(func.count()).select_from(Advertisement))
    url_import.process_import_job(sessions, settings, job_id, old_token, attempt)
    with sessions() as db:
        assert db.scalar(select(func.count()).select_from(Advertisement)) == before
    url_import.process_import_job(sessions, settings, job_id, token, attempt + 1)
    assert signed.get('/api/v1/analysis-jobs/' + retry['id']).json()['state'] == 'SUCCEEDED'


def test_worker_rejects_mismatched_source_before_fetch(signed, monkeypatch):
    monkeypatch.setattr(url_import, 'fetch_html', lambda *a: pytest.fail('Source mismatch must not fetch'))
    queued = enqueue(signed, url=URL).json()
    prioritize(signed, queued['id'])
    with signed.app.state.sessions.begin() as db:
        db.get(AnalysisJob, UUID(queued['id'])).input_payload = {'url': URL, 'source_id': url_import.SOURCE_ID}
    assert process_one(signed.app.state.sessions, signed.app.state.settings)
    failed = signed.get('/api/v1/analysis-jobs/' + queued['id']).json()
    assert failed['state'] == 'BLOCKED' and failed['error']['error']['code'] == 'SOURCE_NOT_APPROVED'
