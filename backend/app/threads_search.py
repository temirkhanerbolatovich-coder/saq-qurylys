"""One bounded official Threads keyword-search page for an explicit access spike.

No database writes, media downloads, redirects, pagination or automatic retries.
The access token travels through stdin and a Bearer header, never a URL/argv.
"""

import hashlib
import http.client
import json
import re
import ssl
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal
from urllib.parse import urlencode, urlsplit

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, ValidationError, field_validator

from app.url_fetcher import FetchError, _PinnedHTTPSConnection, _public_addresses

HOST = 'graph.threads.net'
FIELDS = 'id,text,timestamp,permalink,media_type'
MAX_BYTES = 1_048_576
MESSAGES = {
    'TOKEN_MISSING': 'Сохраните токен Threads локально; живой поиск ещё не настроен.',
    'TOKEN_INVALID': 'Формат токена Threads некорректен.',
    'REQUEST_INVALID': 'Проверьте поисковую фразу, порядок, лимит и время ожидания.',
    'AUTH_REQUIRED': 'Threads отклонил токен. Проверьте срок его действия.',
    'ACCESS_DENIED': 'Нет доступа к поиску. Проверьте threads_keyword_search и доступ приложения.',
    'RATE_LIMITED': 'Threads ограничил запросы. Повторите позже отдельной командой.',
    'UPSTREAM_UNAVAILABLE': 'Threads временно недоступен. Результат поиска неизвестен.',
    'REQUEST_REJECTED': 'Threads отклонил параметры запроса. Сверьте текущий контракт API.',
    'REDIRECT_BLOCKED': 'Threads вернул перенаправление. Токен не передан другому адресу.',
    'RESPONSE_INVALID': 'Ответ Threads не соответствует ожидаемой схеме.',
    'RESPONSE_TOO_LARGE': 'Ответ Threads превышает допустимый размер.',
    'TLS_FAILED': 'Сертификат HTTPS не прошёл проверку.',
    'ADDRESS_BLOCKED': 'DNS источника содержит запрещённый сетевой адрес.',
    'DNS_FAILED': 'Не удалось определить адрес Threads.',
    'TIMEOUT': 'Превышено общее время запроса Threads.',
    'TRANSPORT_FAILED': 'Не удалось получить ответ Threads.',
}


class ThreadsError(Exception):
    def __init__(self, code: str, retry_after: int | None = None):
        self.code = code if code in MESSAGES else 'TRANSPORT_FAILED'
        self.retry_after = retry_after
        super().__init__(MESSAGES[self.code])


class SearchRequest(BaseModel):
    model_config = ConfigDict(extra='forbid', strict=True)
    query: str = Field(min_length=2, max_length=300)
    search_type: Literal['RECENT', 'TOP'] = 'RECENT'
    limit: int = Field(default=20, ge=1, le=50)
    timeout_seconds: int = Field(default=20, ge=1, le=60)

    @field_validator('query')
    @classmethod
    def query_text(cls, value):
        if value != value.strip() or any(ord(c) < 32 or ord(c) == 127 for c in value):
            raise ValueError('Invalid query')
        return value


class SearchPost(BaseModel):
    # Retain only requested fields. API paging URLs can contain the access token.
    model_config = ConfigDict(extra='ignore')
    id: str = Field(pattern=r'^[0-9]{1,40}$')
    text: str | None = Field(default=None, max_length=50_000)
    timestamp: AwareDatetime | None = None
    permalink: str = Field(max_length=2048)
    media_type: str = Field(min_length=1, max_length=40)

    @field_validator('timestamp', mode='before')
    @classmethod
    def publication_date(cls, value):
        # Do not silently interpret numeric values as seconds/milliseconds or invent a date.
        if value is not None and not isinstance(value, str):
            raise ValueError('Expected an ISO timestamp with offset')
        return value

    @field_validator('permalink')
    @classmethod
    def source_link(cls, value):
        parts = urlsplit(value)
        if (
            parts.scheme != 'https'
            or parts.netloc not in {'threads.net', 'www.threads.net', 'threads.com', 'www.threads.com'}
            or not re.fullmatch(r'/@[^/\s?#]+/post/[A-Za-z0-9_-]+/?', parts.path)
            or parts.query
            or parts.fragment
            or any(ord(c) <= 32 for c in value)
        ):
            raise ValueError('Invalid source link')
        return value


def validate_token(token: str):
    if not token:
        raise ThreadsError('TOKEN_MISSING')
    if not re.fullmatch(r'[A-Za-z0-9_.~-]{20,4096}', token):
        raise ThreadsError('TOKEN_INVALID')


def parse_response(raw: bytes, request: SearchRequest, captured_at: datetime) -> dict:
    """Validate an entire page before returning anything; never infer absence/coverage."""
    try:
        body = json.loads(raw)
        if not isinstance(body, dict) or 'error' in body or not isinstance(body.get('data'), list):
            raise ValueError('Invalid envelope')
        if len(body['data']) > request.limit:
            raise ValueError('Unexpected record count')
        records = {}
        for item in body['data']:
            post = SearchPost.model_validate(item).model_dump(mode='json')
            if post['id'] in records and records[post['id']] != post:
                raise ValueError('Conflicting records')
            records[post['id']] = post
        paging = body.get('paging', {})
        if not isinstance(paging, dict):
            raise ValueError('Invalid paging')
        next_page = paging.get('next')
        if next_page is not None and not isinstance(next_page, str):
            raise ValueError('Invalid next page')
    except (ValueError, TypeError, RecursionError, ValidationError):
        raise ThreadsError('RESPONSE_INVALID') from None
    return {
        'schema_version': 1,
        'source': 'THREADS_OFFICIAL_KEYWORD_SEARCH',
        'is_demo': False,
        'request': request.model_dump(exclude={'timeout_seconds'}),
        'captured_at': captured_at.isoformat(),
        'raw_response_sha256': hashlib.sha256(raw).hexdigest(),
        'returned_count': len(body['data']),
        'duplicate_count': len(body['data']) - len(records),
        'has_more': bool(next_page),
        'coverage': 'SINGLE_PAGE_NOT_EXHAUSTIVE',
        'review_status': 'UNREVIEWED_SEARCH_RESULTS',
        'registry_status': 'NOT_CHECKED',
        'items': list(records.values()),
    }


def _fetch(token: str, request: SearchRequest) -> dict:
    """Child-only transport; the public entry point enforces the total deadline."""
    address = _public_addresses(HOST)[0]
    connection = _PinnedHTTPSConnection(HOST, address, request.timeout_seconds)
    try:
        target = '/keyword_search?' + urlencode(
            {'q': request.query, 'search_type': request.search_type, 'limit': request.limit, 'fields': FIELDS}
        )
        connection.request(
            'GET',
            target,
            headers={
                'Authorization': f'Bearer {token}',
                'Accept': 'application/json',
                'Accept-Encoding': 'identity',
                'User-Agent': 'SAQ-QURYLYS/0.1',
                'Connection': 'close',
            },
        )
        response = connection.getresponse()
        if 300 <= response.status < 400:
            raise ThreadsError('REDIRECT_BLOCKED')
        if response.status == 429:
            retry = response.getheader('Retry-After', '')
            seconds = int(retry) if re.fullmatch(r'[0-9]{1,5}', retry) else None
            raise ThreadsError('RATE_LIMITED', seconds if seconds and seconds <= 86400 else None)
        if response.status in {401, 403}:
            raise ThreadsError('AUTH_REQUIRED' if response.status == 401 else 'ACCESS_DENIED')
        if response.status >= 500 or response.status == 408:
            raise ThreadsError('UPSTREAM_UNAVAILABLE')
        if response.status != 200:
            # Graph may report token/scope errors as HTTP 400. Never surface its raw error message.
            raise ThreadsError('REQUEST_REJECTED')
        if response.getheader('Content-Type', '').split(';', 1)[0].strip().lower() != 'application/json':
            raise ThreadsError('RESPONSE_INVALID')
        if response.getheader('Content-Encoding', 'identity').lower() != 'identity':
            raise ThreadsError('RESPONSE_INVALID')
        raw = response.read(MAX_BYTES + 1)
        if len(raw) > MAX_BYTES:
            raise ThreadsError('RESPONSE_TOO_LARGE')
        result = parse_response(raw, request, datetime.now(timezone.utc))
        if token in json.dumps(result, ensure_ascii=False):
            raise ThreadsError('RESPONSE_INVALID')
        return result
    finally:
        connection.close()


def search_threads(token: str, request: SearchRequest) -> dict:
    """One explicit, read-only API call. Credentials never enter command arguments."""
    validate_token(token)
    try:
        request = SearchRequest.model_validate(request.model_dump())
    except (ValidationError, AttributeError):
        raise ThreadsError('REQUEST_INVALID') from None
    try:
        result = subprocess.run(
            [sys.executable, '-m', 'app.threads_search'],
            input=json.dumps({'token': token, 'request': request.model_dump()}).encode('utf-8'),
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            cwd=Path(__file__).resolve().parents[1],
            timeout=request.timeout_seconds,
            check=False,
        )
    except subprocess.TimeoutExpired:
        raise ThreadsError('TIMEOUT') from None
    except OSError:
        raise ThreadsError('TRANSPORT_FAILED') from None
    if result.returncode != 0:
        raise ThreadsError('TRANSPORT_FAILED')
    try:
        value = json.loads(result.stdout)
        if not isinstance(value, dict):
            raise ValueError('Invalid child result')
        if 'error' in value:
            raise ThreadsError(value['error'], value.get('retry_after'))
        if value.get('source') != 'THREADS_OFFICIAL_KEYWORD_SEARCH' or token in result.stdout.decode('utf-8'):
            raise ValueError('Invalid child result')
        return value
    except (ValueError, TypeError, UnicodeError):
        raise ThreadsError('RESPONSE_INVALID') from None


def _main():
    try:
        value = json.loads(sys.stdin.buffer.read(32_768))
        validate_token(value['token'])
        result = _fetch(value['token'], SearchRequest.model_validate(value['request']))
    except ThreadsError as error:
        result = {'error': error.code, 'retry_after': error.retry_after}
    except FetchError as error:
        result = {'error': error.code}
    except ssl.SSLError:
        result = {'error': 'TLS_FAILED'}
    except TimeoutError:
        result = {'error': 'TIMEOUT'}
    except (OSError, http.client.HTTPException):
        result = {'error': 'TRANSPORT_FAILED'}
    except (ValueError, TypeError, KeyError):
        result = {'error': 'REQUEST_INVALID'}
    sys.stdout.write(json.dumps(result, ensure_ascii=False))


if __name__ == '__main__':
    _main()
