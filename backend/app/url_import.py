"""One attributed, licensed news source; imports never confirm hypotheses or risk."""

import hashlib
import json
import logging
import re
from dataclasses import dataclass
from datetime import datetime
from html.parser import HTMLParser
from urllib.parse import urlsplit
from uuid import uuid4

from sqlalchemy import select, text

from app.models import Advertisement, AnalysisJob, Asset, AuditEvent, utcnow
from app.storage import save_bytes, save_text
from app.url_fetcher import FetchError, HtmlPage, SourcePolicy, fetch_html, validate_url

logger = logging.getLogger(__name__)
SOURCE_ID = 'primeminister-news-v1'
SOURCE_LABEL = 'Primeminister.kz · официальная информационная публикация · CC BY 4.0'
LICENSE_URL = 'https://creativecommons.org/licenses/by/4.0/'
POLICY = SourcePolicy('primeminister.kz', ('/ru/news', '/news'))


class ImportRejected(Exception):
    def __init__(self, code, message, retryable=False):
        self.code, self.retryable = code, retryable
        super().__init__(message)


def approved_url(url: str) -> str:
    """Only the reviewed source/path; query aliases and discovery are not enabled."""
    value = validate_url(url, POLICY)
    parts = urlsplit(value)
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


def parse_publication(page: HtmlPage) -> Publication:
    approved_url(page.final_url)
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


def process_import_job(sessions, settings, job_id, token, attempt):
    failure, page, publication = None, None, None
    try:
        if attempt > settings.job_max_attempts:
            raise ImportRejected('LEASE_EXHAUSTED', 'Загрузка прерывалась. Повторите импорт явно.', True)
        with sessions() as db:
            job = db.get(AnalysisJob, job_id)
            payload = job.input_payload or {}
            if payload.get('source_id') != SOURCE_ID:
                raise FetchError('SOURCE_NOT_APPROVED')
            url = approved_url(payload.get('url', ''))
        page = fetch_html(url, POLICY)
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
                    source_label=SOURCE_LABEL,
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
                        'source_id': SOURCE_ID,
                        'requested_url': page.requested_url,
                        'final_url': page.final_url,
                        'redirect_chain': list(page.redirect_chain),
                        'captured_at': page.captured_at,
                        'license_url': LICENSE_URL,
                        'publisher': 'Primeminister.kz',
                        'material_kind': 'OFFICIAL_INFORMATION',
                        'language': publication.language,
                        'text_transformation': 'HTML article text extracted; layout and markup removed',
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
