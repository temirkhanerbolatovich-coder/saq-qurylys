"""Explicit imports from reviewed public pages; never confirm hypotheses or risk."""

import hashlib
import json
import logging
import re
from dataclasses import dataclass
from datetime import datetime
from html.parser import HTMLParser
from urllib.parse import urlsplit
from uuid import uuid4

from sqlalchemy import func, select, text

from app.models import Advertisement, AnalysisJob, Asset, AuditEvent, utcnow
from app.storage import save_bytes, save_text
from app.url_fetcher import FetchError, HtmlPage, SourcePolicy, fetch_html, validate_url

logger = logging.getLogger(__name__)
SOURCE_ID = 'primeminister-news-v1'
SOURCE_LABEL = 'Primeminister.kz · официальная информационная публикация · CC BY 4.0'
LICENSE_URL = 'https://creativecommons.org/licenses/by/4.0/'
POLICY = SourcePolicy('primeminister.kz', ('/ru/news', '/news'), allow_query=False)
AD_SOURCE_ID = 'angroups-payment-v1'
AD_POLICY = SourcePolicy('www.angroups.kz', ('/payment',), allow_subpaths=False, allow_query=False)


@dataclass(frozen=True)
class ImportSource:
    id: str
    label: str
    policy: SourcePolicy
    publisher: str
    material_kind: str
    license_url: str | None
    extraction_scope: str


NEWS_SOURCE = ImportSource(
    SOURCE_ID,
    SOURCE_LABEL,
    POLICY,
    'Primeminister.kz',
    'OFFICIAL_INFORMATION',
    LICENSE_URL,
    'Reviewed article region; navigation and layout removed',
)
AD_SOURCE = ImportSource(
    AD_SOURCE_ID,
    'AN GROUPS · открытая страница условий оплаты',
    AD_POLICY,
    'AN GROUPS',
    'COMMERCIAL_OFFER',
    None,
    'Mobile payment cards (t1073); desktop wording may differ. Full HTML retained; project and phase unknown',
)


def source_for_url(url: str) -> ImportSource:
    # Callers validate the URL before trusting this selection or its metadata.
    return AD_SOURCE if urlsplit(url).hostname == AD_POLICY.hostname else NEWS_SOURCE


class ImportRejected(Exception):
    def __init__(self, code, message, retryable=False):
        self.code, self.retryable = code, retryable
        super().__init__(message)


def approved_url(url: str) -> str:
    """Exact reviewed paths only; queries and site discovery are not enabled."""
    try:
        source = source_for_url(url)
    except (ValueError, TypeError, AttributeError):
        raise FetchError('URL_NOT_ALLOWED') from None
    value = validate_url(url, source.policy)
    parts = urlsplit(value)
    if source is AD_SOURCE:
        if parts.query or parts.path != '/payment':
            raise FetchError('URL_NOT_ALLOWED')
        return value
    if (
        parts.query
        or parts.path in {'/ru/news/press', '/ru/news/reviews'}
        or not re.fullmatch(r'/(?:news|ru/news(?:/(?:press|reviews))?)/[a-z0-9-]+', parts.path)
    ):
        raise FetchError('URL_NOT_ALLOWED')
    return value


@dataclass(frozen=True)
class Publication:
    title: str
    text: str
    published_at: datetime | None
    language: str


class _ArticleParser(HTMLParser):
    """Read only the reviewed source's article region, without rendering HTML."""

    VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'wbr'}
    BLOCK = {'p', 'div', 'li', 'h2', 'h3', 'h4', 'blockquote', 'br'}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []
        self.title, self.body, self.dates = [], [], []
        self.regions = 0

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        classes = attrs.get('class', '').split()
        parent = self.stack[-1] if self.stack else ('', False, False, False)
        suppressed = (
            parent[1] or tag in {'script', 'style', 'noscript', 'template'} or 'articles__container-bottom' in classes
        )
        title = parent[2] or (tag == 'h1' and 'articles__title' in classes)
        article_region = (
            bool(self.title) and 'articles__container' in classes and 'articles__container-bottom' not in classes
        )
        body = parent[3] or article_region
        if article_region:
            self.regions += 1
        if body and tag in self.BLOCK:
            self.body.append('\n')
        if tag == 'meta' and attrs.get('property', attrs.get('name')) in {'article:published_time', 'datePublished'}:
            self.dates.append(attrs.get('content', ''))
        if tag == 'time' and attrs.get('datetime'):
            self.dates.append(attrs['datetime'])
        if tag not in self.VOID:
            self.stack.append((tag, suppressed, title, body))

    def handle_endtag(self, tag):
        if self.stack and self.stack[-1][3] and tag in self.BLOCK:
            self.body.append('\n')
        for index in range(len(self.stack) - 1, -1, -1):
            if self.stack[index][0] == tag:
                del self.stack[index:]
                break

    def handle_data(self, value):
        if not self.stack or self.stack[-1][1]:
            return
        if self.stack[-1][2]:
            self.title.append(value)
        if self.stack[-1][3]:
            self.body.append(value)


class _PaymentParser(HTMLParser):
    """Extract the three reviewed mobile cards, retaining their conflicting wording.

    Desktop zero-blocks, forms, contacts and scripts are excluded from text, but
    remain in the immutable HTML original. Unknown markup fails closed.
    """

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack, self.title, self.cards = [], [], []

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        classes = attrs.get('class', '').split()
        parent = self.stack[-1] if self.stack else ('', False, False, None, None)
        suppressed = parent[1] or tag in {'script', 'style', 'noscript', 'template'}
        title = parent[2] or (tag == 'h2' and 't795__title' in classes)
        card = parent[3]
        field = parent[4]
        if not suppressed and 't1073__col' in classes:
            card = {'title': [], 'body': []}
            self.cards.append(card)
        if card is not None:
            if 't-card__title' in classes:
                field = 'title'
            elif 't-card__descr' in classes:
                field = 'body'
            if field and tag in _ArticleParser.BLOCK:
                card[field].append('\n')
        if tag not in _ArticleParser.VOID:
            self.stack.append((tag, suppressed, title, card, field))

    def handle_endtag(self, tag):
        for index in range(len(self.stack) - 1, -1, -1):
            if self.stack[index][0] == tag:
                del self.stack[index:]
                break

    def handle_data(self, value):
        if not self.stack or self.stack[-1][1]:
            return
        _, _, title, card, field = self.stack[-1]
        if title:
            self.title.append(value)
        if card is not None and field:
            card[field].append(value)


def parse_payment(page: HtmlPage) -> Publication:
    parser = _PaymentParser()
    try:
        parser.feed(page.content.decode('utf-8-sig'))
        parser.close()
    except (UnicodeError, ValueError):
        raise ImportRejected('ARTICLE_FORMAT_CHANGED', 'Не удалось прочитать страницу условий оплаты.') from None
    title = ' '.join(''.join(parser.title).split())
    cards = [{key: ' '.join(''.join(value).split()) for key, value in card.items()} for card in parser.cards]
    if (
        title.casefold() != 'способы оплаты'
        or len(cards) != 3
        or any(not 5 <= len(card['title']) <= 300 or not 30 <= len(card['body']) <= 15_000 for card in cards)
    ):
        raise ImportRejected('ARTICLE_NOT_FOUND', 'Структура условий оплаты изменилась. Материал не сохранён.')
    body = '\n\n'.join(card['title'] + '\n' + card['body'] for card in cards)
    # This page has no verified publication date. Build dates are not publication dates.
    return Publication('AN GROUPS · ' + title, 'AN GROUPS · ' + title + '\n\n' + body, None, 'ru')


def parse_publication(page: HtmlPage) -> Publication:
    approved_url(page.final_url)
    if source_for_url(page.final_url) is AD_SOURCE:
        return parse_payment(page)
    parser = _ArticleParser()
    try:
        parser.feed(page.content.decode('utf-8-sig'))
        parser.close()
    except (UnicodeError, ValueError):
        raise ImportRejected(
            'ARTICLE_FORMAT_CHANGED', 'Не удалось прочитать публикацию. Добавьте материал вручную.'
        ) from None
    title = ' '.join(''.join(parser.title).split())
    body = '\n'.join(line for value in ''.join(parser.body).splitlines() if (line := ' '.join(value.split())))
    if parser.regions != 1 or not 5 <= len(title) <= 1000 or not 80 <= len(body) <= 98_000:
        raise ImportRejected(
            'ARTICLE_NOT_FOUND', 'В ответе нет ожидаемой статьи. Страница не сохранена как публикация.'
        )
    published_at = None
    for value in parser.dates:
        try:
            candidate = datetime.fromisoformat(value.replace('Z', '+00:00'))
        except ValueError:
            continue
        if candidate.tzinfo is not None and candidate.utcoffset() is not None:
            published_at = candidate
            break
    language = 'ru' if urlsplit(page.final_url).path.startswith('/ru/') else 'kz'
    return Publication(title, title + '\n\n' + body, published_at, language)


def lock_import(db, key):
    number = int.from_bytes(hashlib.sha256(key.encode()).digest()[:8], signed=True)
    db.execute(text('SELECT pg_advisory_xact_lock(:key)'), {'key': number})


class ImportQueueFull(Exception):
    """The shared URL queue has reached its bounded active-job capacity."""


def enqueue_url_import(db, url, *, actor_id, request_id):
    """Validate and enqueue, or reuse an active URL, in the caller's transaction.

    Takes the shared PostgreSQL transaction lock; never commits or fetches HTTP.
    Callers own authorization and command idempotency. Invalid URLs raise
    FetchError; capacity exhaustion raises ImportQueueFull without adding a job.
    """
    url = approved_url(url)
    source = source_for_url(url)
    lock_import(db, 'url-import-queue')
    job = db.scalar(
        select(AnalysisJob)
        .where(
            AnalysisJob.kind == 'IMPORT_URL',
            AnalysisJob.state.in_(['QUEUED', 'RUNNING']),
            AnalysisJob.input_payload['url'].as_string() == url,
        )
        .order_by(AnalysisJob.created_at)
        .limit(1)
    )
    if not job:
        active = db.scalar(
            select(func.count())
            .select_from(AnalysisJob)
            .where(
                AnalysisJob.kind == 'IMPORT_URL',
                AnalysisJob.state.in_(['QUEUED', 'RUNNING']),
            )
        )
        if active >= 10:
            raise ImportQueueFull()
        job = AnalysisJob(
            id=uuid4(),
            kind='IMPORT_URL',
            input_payload={'url': url, 'source_id': source.id},
            created_by=actor_id,
            request_id=request_id,
            stage='Ожидает загрузки открытой публикации',
        )
        db.add(job)
        db.flush()
        db.add(
            AuditEvent(
                actor_id=actor_id,
                action='URL_IMPORT_QUEUED',
                entity_type='analysis_job',
                entity_id=job.id,
                request_id=request_id,
                details={'source_id': source.id},
            )
        )
    return job


def process_import_job(sessions, settings, job_id, token, attempt):
    failure, page, publication = None, None, None
    try:
        if attempt > settings.job_max_attempts:
            raise ImportRejected('LEASE_EXHAUSTED', 'Загрузка прерывалась. Повторите импорт явно.', True)
        with sessions() as db:
            job = db.get(AnalysisJob, job_id)
            payload = job.input_payload or {}
            url = approved_url(payload.get('url', ''))
            source = source_for_url(url)
            if payload.get('source_id') != source.id:
                raise FetchError('SOURCE_NOT_APPROVED')
        page = fetch_html(url, source.policy)
        publication = parse_publication(page)
    except (FetchError, ImportRejected) as exc:
        failure = exc
    except Exception:
        logger.exception('URL import failed; job_id=%s', job_id)
        failure = ImportRejected('IMPORT_FAILED', 'Не удалось сохранить публикацию. Повторите импорт позже.', True)
    with sessions.begin() as db:
        job = db.scalar(select(AnalysisJob).where(AnalysisJob.id == job_id).with_for_update())
        if job.state != 'RUNNING' or job.claim_token != token:
            return True
        job.updated_at, job.lease_until = utcnow(), None
        if failure:
            job.state = 'FAILED' if failure.retryable else 'BLOCKED'
            job.stage = 'Импорт не выполнен · повторите или добавьте материал вручную'
            job.error = {
                'error': {
                    'code': failure.code,
                    'message': str(failure),
                    'request_id': str(job.request_id),
                    'fields': [],
                }
            }
        else:
            # A markup-only update is not a new material version. The first exact
            # HTML original remains immutable; changed article text yields a new ad.
            fingerprint = hashlib.sha256(
                json.dumps(
                    [
                        page.final_url,
                        publication.text,
                        publication.published_at.isoformat() if publication.published_at else None,
                    ],
                    ensure_ascii=False,
                ).encode()
            ).hexdigest()
            lock_import(db, 'import-content:' + fingerprint)
            previous = db.scalar(
                select(Asset).where(
                    Asset.kind == 'HTML',
                    Asset.source_details['import_fingerprint'].as_string() == fingerprint,
                )
            )
            if previous:
                job.advertisement_id, job.result_asset_id = previous.advertisement_id, previous.id
                job.stage = 'Этот материал уже сохранён · открыт существующий оригинал'
            else:
                html_key, html_sha, html_size = save_bytes(settings.storage_root, page.content, 'html')
                text_key, text_sha, text_size = save_text(settings.storage_root, publication.text)
                ad = Advertisement(
                    id=uuid4(),
                    source_label=source.label,
                    source_url=page.final_url,
                    published_at=publication.published_at,
                    captured_at=datetime.fromisoformat(page.captured_at),
                    original_text=publication.text,
                    is_demo=False,
                    created_by=job.created_by,
                )
                db.add(ad)
                db.flush()
                original = Asset(
                    id=uuid4(),
                    advertisement_id=ad.id,
                    kind='HTML',
                    mime_type='text/html',
                    byte_size=html_size,
                    sha256=html_sha,
                    storage_key=html_key,
                    captured_at=ad.captured_at,
                    is_demo=False,
                    source_details={
                        'source_id': source.id,
                        'requested_url': page.requested_url,
                        'final_url': page.final_url,
                        'redirect_chain': list(page.redirect_chain),
                        'captured_at': page.captured_at,
                        'license_url': source.license_url,
                        'publisher': source.publisher,
                        'material_kind': source.material_kind,
                        'extraction_scope': source.extraction_scope,
                        'language': publication.language,
                        'text_transformation': 'HTML text extracted; layout and markup removed',
                        'import_fingerprint': fingerprint,
                    },
                )
                db.add(original)
                db.add(
                    Asset(
                        advertisement_id=ad.id,
                        kind='TEXT',
                        mime_type='text/plain',
                        byte_size=text_size,
                        sha256=text_sha,
                        storage_key=text_key,
                        captured_at=ad.captured_at,
                        is_demo=False,
                    )
                )
                db.flush()
                job.advertisement_id, job.result_asset_id = ad.id, original.id
                job.stage = 'Публикация сохранена · следующий шаг: анализ и ручная проверка'
            job.state, job.error = 'SUCCEEDED', None
        db.add(
            AuditEvent(
                actor_id=job.created_by,
                action='URL_IMPORT_' + job.state,
                entity_type='analysis_job',
                entity_id=job.id,
                request_id=job.request_id,
                details={
                    'attempt': attempt,
                    'advertisement_id': str(job.advertisement_id) if job.advertisement_id else None,
                },
            )
        )
    return True
