"""Bounded Bot API transport. Never expose a request URL or Telegram's raw errors."""

import json
import re
from urllib.error import HTTPError
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, ProxyHandler, Request, build_opener


def valid_token(value):
    return bool(re.fullmatch(r'[1-9]\d{4,19}:[A-Za-z0-9_-]{20,150}', value))


def valid_web_base(value):
    try:
        parsed = urlsplit(value)
        port = parsed.port
        return (
            parsed.scheme == 'https'
            and bool(parsed.hostname)
            and not (parsed.username or parsed.password or parsed.query or parsed.fragment)
            and not any(ord(char) <= 32 for char in value)
            and (port is None or port > 0)
        )
    except ValueError:
        return False


class TelegramError(Exception):
    def __init__(self, code, *, retry_after=None, uncertain=False):
        super().__init__(code)
        self.code, self.retry_after, self.uncertain = code, retry_after, uncertain


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


class TelegramClient:
    def __init__(self, token, timeout=10):
        if not valid_token(token):
            raise TelegramError('TOKEN_INVALID')
        self._token, self.timeout = token, timeout

    def call(self, method, payload=None):
        if method not in {'getMe', 'getWebhookInfo', 'getUpdates', 'sendMessage'}:
            raise TelegramError('METHOD_NOT_ALLOWED')
        request = Request(
            f'https://api.telegram.org/bot{self._token}/{method}',
            data=json.dumps(payload or {}).encode('utf-8'),
            headers={'Content-Type': 'application/json', 'User-Agent': 'SAQ-QURYLYS/0.1'},
            method='POST',
        )
        status = 200
        try:
            try:
                response = build_opener(ProxyHandler({}), NoRedirect()).open(request, timeout=self.timeout)
            except HTTPError as error:
                response, status = error, error.code
            with response:
                raw = response.read(65_537)
            if len(raw) > 65_536:
                raise ValueError('oversized response')
            body = json.loads(raw)
            if not isinstance(body, dict) or not isinstance(body.get('ok'), bool):
                raise ValueError('invalid envelope')
        except Exception:
            # A timeout/invalid response cannot establish whether sendMessage was accepted.
            raise TelegramError('TRANSPORT_UNKNOWN', uncertain=method == 'sendMessage') from None
        if status != 200 or not body['ok']:
            code = body.get('error_code')
            if body['ok'] or type(code) is not int or not 400 <= code <= 599:
                raise TelegramError('RESPONSE_UNKNOWN', uncertain=method == 'sendMessage')
            parameters = body.get('parameters') or {}
            retry = parameters.get('retry_after') if isinstance(parameters, dict) else None
            if code == 429 and type(retry) is int and 0 < retry <= 86_400:
                raise TelegramError('TG_429', retry_after=retry)
            if code == 429:
                raise TelegramError('TG_429_MANUAL')
            if code >= 500 and body['ok'] is False:
                raise TelegramError('TG_SERVER_ERROR', retry_after=30)
            raise TelegramError(f'TG_{code}')
        return body.get('result')

    def send(self, chat_id, text):
        if not re.fullmatch(r'[1-9]\d{0,19}', str(chat_id)) or not text or len(text.encode('utf-16-le')) // 2 > 4096:
            raise TelegramError('MESSAGE_INVALID')
        result = self.call(
            'sendMessage', {'chat_id': chat_id, 'text': text, 'link_preview_options': {'is_disabled': True}}
        )
        if (
            not isinstance(result, dict)
            or type(result.get('message_id')) is not int
            or result['message_id'] <= 0
            or not isinstance(result.get('chat'), dict)
            or str(result['chat'].get('id')) != str(chat_id)
        ):
            raise TelegramError('MESSAGE_RESULT_UNKNOWN', uncertain=True)
        return result['message_id']
