"""Bounded HTML transport for a single approved source; not an enabled collector.

The public entry point always uses a subprocess so DNS, TLS, headers and slow
response bodies share one wall-clock deadline. Host/path policies are reviewed
server-side configuration, never supplied by an import request.
"""

import base64
import http.client
import ipaddress
import json
import re
import socket
import ssl
import subprocess
import sys
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import unquote, urljoin, urlsplit, urlunsplit

_HOST = re.compile(r'(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}\Z')
_AMBIGUOUS_PATH = re.compile(r'%(?:2e|2f|5c|25|0[0-9a-f]|1[0-9a-f]|7f)', re.IGNORECASE)
_MESSAGES = {
    'SOURCE_NOT_APPROVED': 'Источник ещё не разрешён. Добавьте материал вручную.',
    'URL_NOT_ALLOWED': 'Адрес или путь не разрешён для этого источника. Добавьте материал вручную.',
    'ADDRESS_BLOCKED': 'Источник ведёт на запрещённый сетевой адрес. Добавьте материал вручную.',
    'DNS_FAILED': 'Не удалось определить адрес источника. Повторите позже или добавьте материал вручную.',
    'FETCH_TIMEOUT': 'Истекло время загрузки. Повторите позже или добавьте материал вручную.',
    'FETCH_FAILED': 'Не удалось загрузить страницу. Повторите позже или добавьте материал вручную.',
    'TLS_FAILED': 'Не удалось проверить защищённое соединение. Добавьте материал вручную.',
    'HTTP_BLOCKED': 'Источник отказал в загрузке или страница недоступна. Добавьте материал вручную.',
    'HTTP_TEMPORARY': 'Источник временно недоступен. Повторите позже или добавьте материал вручную.',
    'REDIRECT_LIMIT': 'Слишком много перенаправлений или обнаружен цикл. Добавьте материал вручную.',
    'INVALID_RESPONSE': 'Источник вернул некорректный ответ. Добавьте материал вручную.',
    'HTML_REQUIRED': 'Источник не вернул несжатую HTML-страницу. Добавьте материал вручную.',
    'RESPONSE_TOO_LARGE': 'Страница превышает допустимый размер. Добавьте материал вручную.',
}
_RETRYABLE = {'DNS_FAILED', 'FETCH_TIMEOUT', 'FETCH_FAILED', 'HTTP_TEMPORARY'}


class FetchError(Exception):
    """Stable, non-sensitive error suitable for a future import job's UI."""

    def __init__(self, code: str):
        self.code = code
        self.retryable = code in _RETRYABLE
        super().__init__(_MESSAGES[code])


@dataclass(frozen=True)
class SourcePolicy:
    """Trusted server-side configuration, never accepted from an import request.

    Prefixes name path subtrees by default; allow_subpaths=False selects exact
    paths. allow_query=False also applies to every redirect before connection.
    No source is configured by this module; callers supply reviewed policies.
    """

    hostname: str
    path_prefixes: tuple[str, ...]
    max_bytes: int = 2_097_152
    timeout_seconds: int = 20
    max_redirects: int = 3
    allow_subpaths: bool = True
    allow_query: bool = True

    def __post_init__(self):
        if not _HOST.fullmatch(self.hostname):
            raise ValueError('Expected one lowercase ASCII DNS hostname')
        if not self.path_prefixes or any(
            not prefix.startswith('/')
            or any(char in prefix for char in '%?#\\;')
            or any(part in {'.', '..'} for part in prefix.split('/'))
            or '//' in prefix
            or any(ord(char) <= 32 or ord(char) >= 127 for char in prefix)
            for prefix in self.path_prefixes
        ):
            raise ValueError('Expected explicit canonical path prefixes')
        if not 1 <= self.max_bytes <= 10_485_760:
            raise ValueError('Invalid response size limit')
        if not 1 <= self.timeout_seconds <= 60 or not 0 <= self.max_redirects <= 5:
            raise ValueError('Invalid timeout or redirect limit')
        if not isinstance(self.allow_subpaths, bool) or not isinstance(self.allow_query, bool):
            raise ValueError('Expected boolean path/query policy')


@dataclass(frozen=True)
class HtmlPage:
    requested_url: str
    final_url: str
    redirect_chain: tuple[str, ...]
    content_type: str
    captured_at: str
    content: bytes


def validate_url(url: str, policy: SourcePolicy) -> str:
    """Validate before DNS and after each redirect; return a canonical HTTPS URL."""
    if not isinstance(url, str) or len(url) > 4096 or any(ord(c) <= 32 or ord(c) >= 127 for c in url):
        raise FetchError('URL_NOT_ALLOWED')
    try:
        parts = urlsplit(url)
        if (
            parts.scheme != 'https'
            or parts.hostname != policy.hostname
            or parts.netloc.lower() not in {policy.hostname, f'{policy.hostname}:443'}
            or parts.fragment
            or '\\' in url
        ):
            raise FetchError('URL_NOT_ALLOWED')
        path = parts.path or '/'
        decoded_path = unquote(path, errors='strict')
        if (
            _AMBIGUOUS_PATH.search(path)
            or re.search(r'%(?![0-9a-fA-F]{2})', path)
            or '//' in path
            or ';' in decoded_path
            or any(part in {'.', '..'} for part in decoded_path.split('/'))
            or (parts.query and not policy.allow_query)
            or not any(
                path == prefix.rstrip('/') or (policy.allow_subpaths and path.startswith(prefix.rstrip('/') + '/'))
                for prefix in policy.path_prefixes
            )
        ):
            raise FetchError('URL_NOT_ALLOWED')
    except ValueError:
        raise FetchError('URL_NOT_ALLOWED') from None
    return urlunsplit(('https', policy.hostname, path, parts.query, ''))


def _public_addresses(hostname: str) -> list[str]:
    try:
        records = socket.getaddrinfo(hostname, 443, type=socket.SOCK_STREAM, proto=socket.IPPROTO_TCP)
    except OSError:
        raise FetchError('DNS_FAILED') from None
    if not records:
        raise FetchError('DNS_FAILED')
    addresses = []
    for family, _, _, _, sockaddr in records:
        try:
            address = ipaddress.ip_address(sockaddr[0])
        except ValueError:
            raise FetchError('ADDRESS_BLOCKED') from None
        if (
            family not in {socket.AF_INET, socket.AF_INET6}
            or '%' in str(address)
            or not address.is_global
            or address.is_multicast
            or address.is_reserved
            or (address.version == 4 and address in ipaddress.ip_network('192.0.0.0/24'))
            or (
                address.version == 6
                and (
                    address not in ipaddress.ip_network('2000::/3')
                    or address in ipaddress.ip_network('2001::/23')
                    or address in ipaddress.ip_network('2002::/16')
                )
            )
        ):
            # Reject mixed public/private answers rather than choosing the safe one.
            raise FetchError('ADDRESS_BLOCKED')
        if str(address) not in addresses:
            addresses.append(str(address))
    return addresses


class _PinnedHTTPSConnection(http.client.HTTPSConnection):
    def __init__(self, hostname: str, address: str, timeout: int):
        super().__init__(hostname, port=443, timeout=timeout, context=ssl.create_default_context())
        self.address = address

    def connect(self):
        # A numeric socket address avoids a second DNS resolution (rebinding).
        family = socket.AF_INET6 if ipaddress.ip_address(self.address).version == 6 else socket.AF_INET
        sock = socket.socket(family, socket.SOCK_STREAM)
        try:
            sock.settimeout(self.timeout)
            sock.connect((self.address, 443))
            self.sock = self._context.wrap_socket(sock, server_hostname=self.host)
        except BaseException:
            sock.close()
            raise


def _fetch(url: str, policy: SourcePolicy) -> HtmlPage:
    """Child-only transport. Call fetch_html, which enforces the total deadline."""
    current = validate_url(url, policy)
    visited = []
    for hop in range(policy.max_redirects + 1):
        if current in visited:
            raise FetchError('REDIRECT_LIMIT')
        visited.append(current)
        address = _public_addresses(policy.hostname)[0]
        connection = _PinnedHTTPSConnection(policy.hostname, address, policy.timeout_seconds)
        try:
            parts = urlsplit(current)
            target = parts.path + ('?' + parts.query if parts.query else '')
            connection.request(
                'GET',
                target,
                headers={
                    'Accept': 'text/html',
                    'Accept-Encoding': 'identity',
                    'User-Agent': 'SAQ-QURYLYS/0.1',
                    'Connection': 'close',
                },
            )
            response = connection.getresponse()
            if response.status in {301, 302, 303, 307, 308}:
                locations = response.headers.get_all('Location', [])
                if len(locations) != 1 or not locations[0] or any(ord(c) <= 32 for c in locations[0]):
                    raise FetchError('INVALID_RESPONSE')
                if hop == policy.max_redirects:
                    raise FetchError('REDIRECT_LIMIT')
                current = validate_url(urljoin(current, locations[0]), policy)
                continue
            if response.status != 200:
                raise FetchError(
                    'HTTP_TEMPORARY' if response.status in {408, 429} or response.status >= 500 else 'HTTP_BLOCKED'
                )
            content_types = response.headers.get_all('Content-Type', [])
            encodings = response.headers.get_all('Content-Encoding', [])
            if (
                len(content_types) != 1
                or content_types[0].split(';', 1)[0].strip().lower() != 'text/html'
                or (encodings and [value.lower() for value in encodings] != ['identity'])
            ):
                raise FetchError('HTML_REQUIRED')
            lengths = response.headers.get_all('Content-Length', [])
            transfers = response.headers.get_all('Transfer-Encoding', [])
            if len(lengths) > 1 or (lengths and transfers) or (transfers and transfers != ['chunked']):
                raise FetchError('INVALID_RESPONSE')
            length = None
            if lengths:
                if not re.fullmatch(r'[0-9]{1,12}', lengths[0]):
                    raise FetchError('INVALID_RESPONSE')
                length = int(lengths[0])
                if length > policy.max_bytes:
                    raise FetchError('RESPONSE_TOO_LARGE')
            content = response.read(policy.max_bytes + 1)
            if len(content) > policy.max_bytes:
                raise FetchError('RESPONSE_TOO_LARGE')
            if not content or (length is not None and len(content) != length):
                raise FetchError('INVALID_RESPONSE')
            return HtmlPage(
                url, current, tuple(visited), content_types[0], datetime.now(timezone.utc).isoformat(), content
            )
        finally:
            connection.close()
    raise FetchError('REDIRECT_LIMIT')


def fetch_html(url: str, policy: SourcePolicy | None = None) -> HtmlPage:
    """Fetch raw bytes without executing HTML, following subresources or persisting.

    No policy means no network. Failures expose a stable code and retryable flag;
    retries are explicit caller actions, never automatic requests in this module.
    """
    if policy is None:
        raise FetchError('SOURCE_NOT_APPROVED')
    validate_url(url, policy)
    try:
        result = subprocess.run(
            [sys.executable, '-m', 'app.url_fetcher'],
            input=json.dumps({'url': url, 'policy': asdict(policy)}).encode('utf-8'),
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            cwd=Path(__file__).resolve().parents[1],
            timeout=policy.timeout_seconds,
            check=False,
        )
    except subprocess.TimeoutExpired:
        raise FetchError('FETCH_TIMEOUT') from None
    except OSError:
        raise FetchError('FETCH_FAILED') from None
    if result.returncode != 0:
        raise FetchError('FETCH_FAILED')
    try:
        payload = json.loads(result.stdout)
        if 'error' in payload:
            raise FetchError(payload['error'] if payload['error'] in _MESSAGES else 'FETCH_FAILED')
        payload['content'] = base64.b64decode(payload['content'], validate=True)
        payload['redirect_chain'] = tuple(payload['redirect_chain'])
        return HtmlPage(**payload)
    except (ValueError, KeyError, TypeError):
        raise FetchError('FETCH_FAILED') from None


def _main():
    try:
        request = json.loads(sys.stdin.buffer.read(16_384))
        page = _fetch(request['url'], SourcePolicy(**request['policy']))
        payload = asdict(page)
        payload['content'] = base64.b64encode(page.content).decode('ascii')
    except FetchError as exc:
        payload = {'error': exc.code}
    except ssl.SSLError:
        payload = {'error': 'TLS_FAILED'}
    except TimeoutError:
        payload = {'error': 'FETCH_TIMEOUT'}
    except (OSError, http.client.HTTPException):
        payload = {'error': 'FETCH_FAILED'}
    sys.stdout.write(json.dumps(payload))


if __name__ == '__main__':
    _main()
