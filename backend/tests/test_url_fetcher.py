import io
import json
import socket
import ssl
import subprocess
import sys
from dataclasses import replace
from datetime import datetime
from types import SimpleNamespace

import pytest

from app import url_fetcher as fetcher

POLICY = fetcher.SourcePolicy('ads.example.org', ('/advertisements',))
URL = 'https://ads.example.org/advertisements/123'


@pytest.fixture(autouse=True)
def no_network(monkeypatch):
    def forbidden(*args, **kwargs):
        pytest.fail('Unit tests must not access DNS or the network')

    monkeypatch.setattr(socket, 'getaddrinfo', forbidden)
    monkeypatch.setattr(socket, 'socket', forbidden)


def rejected(code, action):
    with pytest.raises(fetcher.FetchError) as caught:
        action()
    assert caught.value.code == code
    assert 'вручную' in str(caught.value)
    return caught.value


@pytest.mark.parametrize(
    'url',
    [
        'http://ads.example.org/advertisements/123',
        'file:///advertisements/123',
        'https://127.0.0.1/advertisements/123',
        'https://[::1]/advertisements/123',
        'https://ads.example.org.evil.test/advertisements/123',
        'https://sub.ads.example.org/advertisements/123',
        'https://ads.example.org./advertisements/123',
        'https://user:password@ads.example.org/advertisements/123',
        'https://ads.example.org:444/advertisements/123',
        'https://ads.example.org:/advertisements/123',
        'https://ads.example.org/advertisements-private/123',
        'https://ads.example.org/advertisements/../private',
        'https://ads.example.org/advertisements/%2e%2e/private',
        'https://ads.example.org/advertisements/%252e%252e/private',
        'https://ads.example.org/advertisements/a%2fb',
        'https://ads.example.org/advertisements/a%5cb',
        'https://ads.example.org/advertisements/a\\b',
        'https://ads.example.org/advertisements//private',
        'https://ads.example.org/advertisements/%00',
        'https://ads.example.org/advertisements/%xx',
        'https://ads.example.org/advertisements/%c0%ae%c0%ae/private',
        'https://ads.example.org/advertisements/..;/private',
        'https://ads.example.org/advertisements/..%3b/private',
        'https://ads.example.org/advertisements/x#private',
        ' https://ads.example.org/advertisements/123',
        '\nhttps://ads.example.org/advertisements/123',
        'https://ads.example.org/advertisements/x\r\nHost:evil.test',
        'https://ads.example.org/advertisements/' + 'a' * 4096,
    ],
)
def test_rejected_urls_never_start_subprocess(monkeypatch, url):
    monkeypatch.setattr(subprocess, 'run', lambda *a, **kw: pytest.fail('Must reject before subprocess'))
    rejected('URL_NOT_ALLOWED', lambda: fetcher.fetch_html(url, POLICY))


def test_default_has_no_approved_source(monkeypatch):
    monkeypatch.setattr(subprocess, 'run', lambda *a, **kw: pytest.fail('No source means no subprocess'))
    rejected('SOURCE_NOT_APPROVED', lambda: fetcher.fetch_html(URL))


def test_canonical_url_preserves_query_and_encoded_name():
    assert fetcher.validate_url('https://ADS.EXAMPLE.ORG:443/advertisements/%D2%9A?id=12', POLICY) == (
        'https://ads.example.org/advertisements/%D2%9A?id=12'
    )


@pytest.mark.parametrize('prefix', ['/advertisements', '/advertisements/'])
def test_subtree_boundary(prefix):
    policy = replace(POLICY, path_prefixes=(prefix,))
    assert fetcher.validate_url(URL, policy) == URL
    assert fetcher.validate_url('https://ads.example.org/advertisements', policy).endswith('/advertisements')
    rejected('URL_NOT_ALLOWED', lambda: fetcher.validate_url('https://ads.example.org/advertisements2', policy))


@pytest.mark.parametrize(
    'changes',
    [
        {'hostname': '*.example.org'},
        {'hostname': '127.0.0.1'},
        {'path_prefixes': ()},
        {'path_prefixes': ('/advertisements/../',)},
        {'path_prefixes': ('/advertisements%2f',)},
        {'path_prefixes': ('//',)},
        {'path_prefixes': ('/\n',)},
        {'max_bytes': 0},
        {'max_bytes': 10_485_761},
        {'timeout_seconds': 0},
        {'timeout_seconds': 61},
        {'max_redirects': 6},
    ],
)
def test_invalid_policy(changes):
    with pytest.raises(ValueError):
        replace(POLICY, **changes)


def dns_answer(monkeypatch, addresses):
    records = [
        (
            socket.AF_INET6 if ':' in address else socket.AF_INET,
            socket.SOCK_STREAM,
            socket.IPPROTO_TCP,
            '',
            (address, 443),
        )
        for address in addresses
    ]
    monkeypatch.setattr(socket, 'getaddrinfo', lambda *args, **kwargs: records)


@pytest.mark.parametrize(
    'address',
    [
        '127.0.0.1',
        '10.0.0.1',
        '172.16.0.1',
        '192.168.1.1',
        '169.254.169.254',
        '100.64.0.1',
        '0.0.0.0',
        '224.0.0.1',
        '240.0.0.1',
        '192.0.0.8',
        '192.0.2.1',
        '198.18.0.1',
        '::1',
        '::',
        'fc00::1',
        'fe80::1',
        'ff02::1',
        '::ffff:8.8.8.8',
        '64:ff9b::808:808',
        '2002:0808:0808::1',
        '2001::1',
        '2001:db8::1',
        'fe80::1%eth0',
    ],
)
def test_reject_entire_dns_answer_if_any_address_is_unsafe(monkeypatch, address):
    dns_answer(monkeypatch, ['8.8.8.8', address])
    rejected('ADDRESS_BLOCKED', lambda: fetcher._public_addresses(POLICY.hostname))


def test_public_ipv4_and_ipv6(monkeypatch):
    dns_answer(monkeypatch, ['8.8.8.8', '2606:4700:4700::1111', '8.8.8.8'])
    assert fetcher._public_addresses(POLICY.hostname) == ['8.8.8.8', '2606:4700:4700::1111']


def test_empty_dns_answer(monkeypatch):
    dns_answer(monkeypatch, [])
    rejected('DNS_FAILED', lambda: fetcher._public_addresses(POLICY.hostname))


def test_dns_failure_does_not_leak_details(monkeypatch):
    def fail(*args, **kwargs):
        raise socket.gaierror('private resolver details')

    monkeypatch.setattr(socket, 'getaddrinfo', fail)
    error = rejected('DNS_FAILED', lambda: fetcher._public_addresses(POLICY.hostname))
    assert error.retryable and 'private' not in str(error)


class WireSocket:
    def __init__(self, data):
        self.data = data

    def makefile(self, *args):
        return io.BytesIO(self.data)


def wire_response(body=b'<html>DEMO</html>', status='200 OK', headers=()):
    return (
        f'HTTP/1.1 {status}\r\nContent-Type: text/html; charset=utf-8\r\n'.encode()
        + b''.join(f'{key}: {value}\r\n'.encode() for key, value in headers)
        + b'\r\n'
        + body
    )


def transport(monkeypatch, responses):
    """Real stdlib HTTP framing, fake network only; no test bypass in production."""
    calls = []
    closed = []
    dns_answer(monkeypatch, ['8.8.8.8'])

    class Connection:
        def __init__(self, host, address, timeout):
            assert (host, address, timeout) == (POLICY.hostname, '8.8.8.8', POLICY.timeout_seconds)

        def request(self, method, target, headers):
            calls.append((method, target, headers))

        def getresponse(self):
            response = fetcher.http.client.HTTPResponse(WireSocket(responses.pop(0)))
            response.begin()
            return response

        def close(self):
            closed.append(True)

    monkeypatch.setattr(fetcher, '_PinnedHTTPSConnection', Connection)
    return calls, closed


def test_raw_html_provenance_no_script_or_subresource_fetch(monkeypatch):
    body = '<html>DEMO Құрылыс<script src="http://127.0.0.1/"></script></html>'.encode()
    calls, closed = transport(monkeypatch, [wire_response(body)])
    page = fetcher._fetch(URL, POLICY)
    assert page.content == body and page.requested_url == page.final_url == URL
    assert page.redirect_chain == (URL,)
    assert datetime.fromisoformat(page.captured_at).tzinfo is not None
    assert len(calls) == len(closed) == 1
    assert calls[0][2]['Accept-Encoding'] == 'identity'
    assert 'Cookie' not in calls[0][2] and 'Authorization' not in calls[0][2]


def test_relative_redirect_with_provenance(monkeypatch):
    calls, closed = transport(
        monkeypatch,
        [
            wire_response(status='302 Found', headers=[('Location', '/advertisements/456')]),
            wire_response(),
        ],
    )
    page = fetcher._fetch(URL, POLICY)
    assert page.redirect_chain == (URL, 'https://ads.example.org/advertisements/456')
    assert page.final_url.endswith('/456') and len(calls) == len(closed) == 2


@pytest.mark.parametrize(
    'location',
    [
        'https://evil.test/ad',
        'http://ads.example.org/advertisements/1',
        'https://127.0.0.1/ad',
        '//169.254.169.254/latest',
        '/private',
        '/advertisements/%2e%2e/private',
    ],
)
def test_redirect_must_pass_allowlist_before_next_connection(monkeypatch, location):
    calls, closed = transport(monkeypatch, [wire_response(status='302 Found', headers=[('Location', location)])])
    rejected('URL_NOT_ALLOWED', lambda: fetcher._fetch(URL, POLICY))
    assert len(calls) == len(closed) == 1


def test_dns_rechecked_after_same_host_redirect(monkeypatch):
    calls, closed = transport(
        monkeypatch, [wire_response(status='302 Found', headers=[('Location', '/advertisements/2')])]
    )
    original = fetcher._public_addresses

    def resolve(host):
        if calls:
            dns_answer(monkeypatch, ['127.0.0.1'])
        return original(host)

    monkeypatch.setattr(fetcher, '_public_addresses', resolve)
    rejected('ADDRESS_BLOCKED', lambda: fetcher._fetch(URL, POLICY))
    assert len(calls) == len(closed) == 1


@pytest.mark.parametrize(
    'headers,body,code',
    [
        ([('Content-Length', '100')], b'x', 'INVALID_RESPONSE'),
        ([('Content-Length', '20000000')], b'x', 'RESPONSE_TOO_LARGE'),
        ([('Content-Length', '-1')], b'x', 'INVALID_RESPONSE'),
        ([('Content-Length', '1'), ('Content-Length', '1')], b'x', 'INVALID_RESPONSE'),
        ([('Content-Length', '1'), ('Transfer-Encoding', 'chunked')], b'x', 'INVALID_RESPONSE'),
        ([('Transfer-Encoding', 'gzip')], b'x', 'INVALID_RESPONSE'),
        ([('Content-Encoding', 'gzip')], b'x', 'HTML_REQUIRED'),
        ([('Content-Encoding', 'identity'), ('Content-Encoding', 'gzip')], b'x', 'HTML_REQUIRED'),
        ([('Content-Type', 'application/pdf')], b'%PDF', 'HTML_REQUIRED'),
        ([], b'', 'INVALID_RESPONSE'),
        ([], b'x' * 101, 'RESPONSE_TOO_LARGE'),
        ([('Transfer-Encoding', 'chunked')], b'65\r\n' + b'x' * 101 + b'\r\n0\r\n\r\n', 'RESPONSE_TOO_LARGE'),
    ],
)
def test_response_limits_and_framing(monkeypatch, headers, body, code):
    _, closed = transport(monkeypatch, [wire_response(body, headers=headers)])
    rejected(code, lambda: fetcher._fetch(URL, replace(POLICY, max_bytes=100)))
    assert closed == [True]


def test_chunked_original_bytes_at_exact_limit(monkeypatch):
    transport(monkeypatch, [wire_response(b'4\r\nDEMO\r\n0\r\n\r\n', headers=[('Transfer-Encoding', 'chunked')])])
    assert fetcher._fetch(URL, replace(POLICY, max_bytes=4)).content == b'DEMO'


@pytest.mark.parametrize('status,retryable', [(401, False), (403, False), (404, False), (429, True), (503, True)])
def test_http_errors_never_return_error_page_as_ad(monkeypatch, status, retryable):
    calls, closed = transport(monkeypatch, [wire_response(status=f'{status} Error')])
    error = rejected('HTTP_TEMPORARY' if retryable else 'HTTP_BLOCKED', lambda: fetcher._fetch(URL, POLICY))
    assert error.retryable == retryable and len(calls) == len(closed) == 1


def test_redirect_loop_and_limit(monkeypatch):
    transport(monkeypatch, [wire_response(status='302 Found', headers=[('Location', URL)])])
    rejected('REDIRECT_LIMIT', lambda: fetcher._fetch(URL, POLICY))
    transport(monkeypatch, [wire_response(status='302 Found', headers=[('Location', '/advertisements/2')])])
    rejected('REDIRECT_LIMIT', lambda: fetcher._fetch(URL, replace(POLICY, max_redirects=0)))


@pytest.mark.parametrize('address,family', [('8.8.8.8', socket.AF_INET), ('2606:4700:4700::1111', socket.AF_INET6)])
def test_connection_pins_ip_and_retains_tls_hostname(monkeypatch, address, family):
    monkeypatch.setenv('HTTPS_PROXY', 'http://127.0.0.1:9999')
    monkeypatch.setenv('ALL_PROXY', 'http://127.0.0.1:9999')
    events = []
    sock = SimpleNamespace(settimeout=lambda t: events.append(t), connect=lambda target: events.append(target))
    monkeypatch.setattr(socket, 'socket', lambda fam, kind: sock if fam == family else pytest.fail('wrong family'))
    connection = fetcher._PinnedHTTPSConnection(POLICY.hostname, address, 20)
    assert connection._context.check_hostname and connection._context.verify_mode == ssl.CERT_REQUIRED
    connection._context = SimpleNamespace(wrap_socket=lambda s, server_hostname: events.append(server_hostname) or s)
    connection.connect()
    assert events == [20, (address, 443), POLICY.hostname]
    assert connection.sock == sock


def test_tls_failure_closes_socket(monkeypatch):
    closed = []
    sock = SimpleNamespace(settimeout=lambda t: None, connect=lambda target: None, close=lambda: closed.append(True))
    monkeypatch.setattr(socket, 'socket', lambda *args: sock)
    connection = fetcher._PinnedHTTPSConnection(POLICY.hostname, '8.8.8.8', 20)

    def fail(*args, **kwargs):
        raise ssl.SSLCertVerificationError('private certificate details')

    connection._context = SimpleNamespace(wrap_socket=fail)
    with pytest.raises(ssl.SSLCertVerificationError):
        connection.connect()
    assert closed == [True]


@pytest.mark.parametrize(
    'exception,code',
    [
        (ssl.SSLCertVerificationError('private details'), 'TLS_FAILED'),
        (TimeoutError('private details'), 'FETCH_TIMEOUT'),
        (OSError('private details'), 'FETCH_FAILED'),
        (fetcher.http.client.IncompleteRead(b'private response'), 'FETCH_FAILED'),
    ],
)
def test_child_maps_network_errors_without_exposing_content(monkeypatch, capsys, exception, code):
    request = json.dumps({'url': URL, 'policy': fetcher.asdict(POLICY)}).encode()
    monkeypatch.setattr(sys, 'stdin', SimpleNamespace(buffer=io.BytesIO(request)))

    def fail(*args):
        raise exception

    monkeypatch.setattr(fetcher, '_fetch', fail)
    fetcher._main()
    assert json.loads(capsys.readouterr().out) == {'error': code}


def test_parent_kills_hanging_child_with_real_timeout(monkeypatch):
    real_run = subprocess.run

    def hanging_child(args, **kwargs):
        # Exercise the actual kill-and-wait path; no DNS, server or external URL.
        return real_run([sys.executable, '-c', 'import time; time.sleep(60)'], **kwargs)

    monkeypatch.setattr(subprocess, 'run', hanging_child)
    error = rejected('FETCH_TIMEOUT', lambda: fetcher.fetch_html(URL, replace(POLICY, timeout_seconds=1)))
    assert error.retryable


def test_child_protocol_success(monkeypatch):
    payload = {
        'requested_url': URL,
        'final_url': URL,
        'redirect_chain': [URL],
        'content_type': 'text/html',
        'captured_at': '2026-10-16T08:00:00+00:00',
        'content': 'REVNTw==',
    }

    def child(args, **kwargs):
        assert args == [sys.executable, '-m', 'app.url_fetcher']
        assert kwargs['timeout'] == 20 and not kwargs.get('shell')
        assert json.loads(kwargs['input'])['policy']['hostname'] == POLICY.hostname
        return SimpleNamespace(returncode=0, stdout=json.dumps(payload).encode())

    monkeypatch.setattr(subprocess, 'run', child)
    assert fetcher.fetch_html(URL, POLICY).content == b'DEMO'


@pytest.mark.parametrize(
    'output,exit_code,code',
    [
        (b'{"error":"HTTP_BLOCKED"}', 0, 'HTTP_BLOCKED'),
        (b'{"error":"internal secret"}', 0, 'FETCH_FAILED'),
        (b'not json', 0, 'FETCH_FAILED'),
        (b'{}', 0, 'FETCH_FAILED'),
        (b'', 1, 'FETCH_FAILED'),
    ],
)
def test_child_failures_are_safe(monkeypatch, output, exit_code, code):
    monkeypatch.setattr(subprocess, 'run', lambda *a, **kw: SimpleNamespace(returncode=exit_code, stdout=output))
    rejected(code, lambda: fetcher.fetch_html(URL, POLICY))


def test_real_subprocess_rejects_url_without_network():
    result = subprocess.run(
        [sys.executable, '-m', 'app.url_fetcher'],
        input=json.dumps({'url': 'https://127.0.0.1/', 'policy': fetcher.asdict(POLICY)}).encode(),
        capture_output=True,
        check=True,
        timeout=5,
    )
    assert json.loads(result.stdout) == {'error': 'URL_NOT_ALLOWED'}
