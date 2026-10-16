import importlib.util
import json
import socket
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace
from urllib.parse import parse_qs, urlsplit

import pytest
from pydantic import ValidationError

from app import threads_search as source

TOKEN = 'synthetic-threads-token-for-tests'
NOW = datetime(2026, 10, 16, tzinfo=timezone.utc)
POST = {
    'id': '12345',
    'text': 'DEMO: ЖК Учебный. Өскемен. #жаңақұрылыс',
    'timestamp': '2026-10-15T14:00:00+0000',
    'permalink': 'https://www.threads.net/@demo/post/ABC_123',
    'media_type': 'TEXT_POST',
}


@pytest.fixture(autouse=True)
def no_network(monkeypatch):
    def forbidden(*args, **kwargs):
        pytest.fail('Unit tests must not contact external services')

    monkeypatch.setattr(socket, 'getaddrinfo', forbidden)
    monkeypatch.setattr(socket, 'socket', forbidden)


def rejected(code, action):
    with pytest.raises(source.ThreadsError) as caught:
        action()
    assert caught.value.code == code
    assert TOKEN not in str(caught.value)
    return caught.value


def test_missing_invalid_credentials_fail_before_process(monkeypatch):
    monkeypatch.setattr(subprocess, 'run', lambda *a, **kw: pytest.fail('Must not start process'))
    for token, code in [('', 'TOKEN_MISSING'), ('short', 'TOKEN_INVALID'), (TOKEN + '\n', 'TOKEN_INVALID')]:
        rejected(code, lambda: source.search_threads(token, source.SearchRequest(query='Өскемен ЖК')))


@pytest.mark.parametrize(
    'change',
    [
        {'query': ' '},
        {'query': 'a\nb'},
        {'query': 'x' * 301},
        {'limit': 51},
        {'limit': True},
        {'timeout_seconds': 0},
        {'search_type': 'TAG'},
        {'endpoint': 'https://localhost'},
    ],
)
def test_bad_parameters(change):
    with pytest.raises(ValidationError):
        source.SearchRequest.model_validate({'query': 'ЖК Өскемен', **change})


def test_normalized_page_preserves_text_dates_deduplicates_and_discards_secret_paging():
    body = {'data': [POST, POST], 'paging': {'next': 'https://evil.test/?access_token=' + TOKEN}}
    raw = json.dumps(body).encode()
    result = source.parse_response(raw, source.SearchRequest(query='ЖК Өскемен'), NOW)
    assert result['items'][0]['text'] == POST['text']
    assert result['items'][0]['timestamp'] == '2026-10-15T14:00:00Z'
    assert len(result['items']) == 1 and result['duplicate_count'] == 1
    assert result['has_more'] is True and result['coverage'] == 'SINGLE_PAGE_NOT_EXHAUSTIVE'
    assert result['registry_status'] == 'NOT_CHECKED' and result['is_demo'] is False
    assert TOKEN not in json.dumps(result) and 'evil.test' not in json.dumps(result)


def test_empty_results_are_not_proof_of_absence_and_missing_date_is_not_capture_date():
    result = source.parse_response(b'{"data":[]}', source.SearchRequest(query='ЖК тест'), NOW)
    assert result['items'] == [] and result['registry_status'] == 'NOT_CHECKED'
    raw = json.dumps({'data': [{**POST, 'timestamp': None, 'text': None, 'media_type': 'VIDEO'}]}).encode()
    result = source.parse_response(raw, source.SearchRequest(query='ЖК тест'), NOW)
    assert result['items'][0]['timestamp'] is None
    assert result['items'][0]['text'] is None


@pytest.mark.parametrize(
    'body',
    [
        [],
        {},
        {'error': {'message': TOKEN}},
        {'data': {}},
        {'data': [{**POST, 'timestamp': '2026-10-15T12:00:00'}]},
        {'data': [POST, {**POST, 'text': 'Changed'}]},
        {'data': [POST], 'paging': []},
        {'data': [POST], 'paging': {'next': 42}},
    ],
)
def test_malformed_or_conflicting_page_rejected_atomically(body):
    rejected(
        'RESPONSE_INVALID',
        lambda: source.parse_response(json.dumps(body).encode(), source.SearchRequest(query='ЖК'), NOW),
    )


@pytest.mark.parametrize(
    'url',
    [
        'https://evil.test/@demo/post/ABC',
        'http://threads.net/@demo/post/ABC',
        'https://threads.net.evil.test/@demo/post/ABC',
        'https://user:secret@threads.net/@demo/post/ABC',
        'https://threads.net:444/@demo/post/ABC',
        'https://threads.net/@demo/post/ABC?access_token=secret',
        'https://threads.net/@demo/post/ABC#fragment',
    ],
)
def test_returned_links_are_never_arbitrary_destinations(url):
    raw = json.dumps({'data': [{**POST, 'permalink': url}]}).encode()
    rejected('RESPONSE_INVALID', lambda: source.parse_response(raw, source.SearchRequest(query='ЖК'), NOW))


class Response:
    def __init__(self, status=200, headers=None, raw=None):
        self.status = status
        self.headers = {'Content-Type': 'application/json', **(headers or {})}
        self.raw = raw if raw is not None else json.dumps({'data': [POST]}).encode()

    def getheader(self, key, default=None):
        return self.headers.get(key, default)

    def read(self, limit):
        return self.raw[:limit]


def transport(monkeypatch, response):
    calls = []
    monkeypatch.setattr(source, '_public_addresses', lambda host: ['93.184.216.34'])

    class Connection:
        def __init__(self, hostname, address, timeout):
            assert hostname == source.HOST and address == '93.184.216.34'

        def request(self, method, target, headers):
            calls.append((method, target, headers))

        def getresponse(self):
            return response

        def close(self):
            calls.append('closed')

    monkeypatch.setattr(source, '_PinnedHTTPSConnection', Connection)
    return calls


def test_real_request_shape_is_read_only_and_token_not_in_url(monkeypatch):
    calls = transport(monkeypatch, Response())
    result = source._fetch(TOKEN, source.SearchRequest(query='Өскемен #ЖК & дом'))
    method, target, headers = calls[0]
    assert method == 'GET' and target.startswith('/keyword_search?')
    assert parse_qs(urlsplit(target).query)['q'] == ['Өскемен #ЖК & дом']
    assert TOKEN not in target and headers['Authorization'] == f'Bearer {TOKEN}'
    assert len(result['items']) == 1 and calls[-1] == 'closed'


@pytest.mark.parametrize(
    ('status', 'code'),
    [
        (302, 'REDIRECT_BLOCKED'),
        (401, 'AUTH_REQUIRED'),
        (403, 'ACCESS_DENIED'),
        (429, 'RATE_LIMITED'),
        (503, 'UPSTREAM_UNAVAILABLE'),
        (400, 'REQUEST_REJECTED'),
    ],
)
def test_http_failures_are_safe_and_never_retry_or_follow_redirect(monkeypatch, status, code):
    calls = transport(
        monkeypatch, Response(status, {'Retry-After': '120', 'Location': 'https://evil.test'}, TOKEN.encode())
    )
    error = rejected(code, lambda: source._fetch(TOKEN, source.SearchRequest(query='ЖК')))
    assert len(calls) == 2
    assert error.retry_after == (120 if status == 429 else None)


@pytest.mark.parametrize(
    ('response', 'code'),
    [
        (Response(raw=b'x' * (source.MAX_BYTES + 1)), 'RESPONSE_TOO_LARGE'),
        (Response(headers={'Content-Type': 'text/html'}), 'RESPONSE_INVALID'),
        (Response(headers={'Content-Encoding': 'gzip'}), 'RESPONSE_INVALID'),
        (Response(raw=json.dumps({'data': [{**POST, 'text': TOKEN}]}).encode()), 'RESPONSE_INVALID'),
    ],
)
def test_invalid_responses_do_not_return_results(monkeypatch, response, code):
    calls = transport(monkeypatch, response)
    rejected(code, lambda: source._fetch(TOKEN, source.SearchRequest(query='ЖК')))
    assert calls[-1] == 'closed'


def test_subprocess_uses_stdin_for_secret_and_total_deadline(monkeypatch):
    def run(command, **kwargs):
        assert TOKEN not in str(command)
        assert json.loads(kwargs['input'])['token'] == TOKEN
        assert kwargs['timeout'] == 4 and kwargs['stderr'] is subprocess.DEVNULL
        raise subprocess.TimeoutExpired(command, 4, stderr=TOKEN)

    monkeypatch.setattr(subprocess, 'run', run)
    rejected('TIMEOUT', lambda: source.search_threads(TOKEN, source.SearchRequest(query='ЖК', timeout_seconds=4)))


def test_cli_is_offline_by_default_and_writes_only_private_report(monkeypatch, tmp_path, capsys):
    spec = importlib.util.spec_from_file_location(
        'search_threads_cli', Path(__file__).parents[2] / 'scripts/search_threads.py'
    )
    cli = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(cli)
    monkeypatch.setattr(cli, 'TOKEN_FILE', tmp_path / 'token.txt')
    assert cli.main(['status']) == 2
    assert 'TOKEN_MISSING' in capsys.readouterr().err
    cli.TOKEN_FILE.write_text(TOKEN, encoding='utf-8')
    assert cli.main(['status']) == 0
    assert 'API_ACCESS_UNVERIFIED' in capsys.readouterr().out
    monkeypatch.setattr(cli, 'ROOT', tmp_path)
    monkeypatch.setattr(cli, 'RESULTS', tmp_path / '.local/results')
    report = source.parse_response(json.dumps({'data': [POST]}).encode(), source.SearchRequest(query='ЖК'), NOW)
    monkeypatch.setattr(cli, 'search_threads', lambda token, request: report)
    assert cli.main(['search', '--query', 'ЖК']) == 0
    output = capsys.readouterr()
    assert TOKEN not in output.out + output.err and POST['text'] not in output.out
    files = list(cli.RESULTS.glob('*.json'))
    assert len(files) == 1 and not list(cli.RESULTS.glob('*.tmp'))
    assert json.loads(files[0].read_text(encoding='utf-8')) == report


def test_child_failure_does_not_become_success(monkeypatch):
    monkeypatch.setattr(
        subprocess, 'run', lambda *a, **kw: SimpleNamespace(returncode=0, stdout=b'{"error":"TLS_FAILED"}')
    )
    rejected('TLS_FAILED', lambda: source.search_threads(TOKEN, source.SearchRequest(query='ЖК')))


@pytest.mark.parametrize('timestamp', [True, 1792072800, 1792072800000])
def test_non_iso_timestamp_is_not_silently_reinterpreted(timestamp):
    raw = json.dumps({'data': [{**POST, 'timestamp': timestamp}]}).encode()
    rejected('RESPONSE_INVALID', lambda: source.parse_response(raw, source.SearchRequest(query='ЖК'), NOW))


def test_real_child_rejects_missing_token_without_network():
    result = subprocess.run(
        [source.sys.executable, '-m', 'app.threads_search'],
        input=json.dumps({'token': '', 'request': {'query': 'ЖК'}}).encode(),
        cwd=Path(source.__file__).parents[1],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        timeout=10,
        check=True,
    )
    assert json.loads(result.stdout)['error'] == 'TOKEN_MISSING'
    assert not result.stderr
