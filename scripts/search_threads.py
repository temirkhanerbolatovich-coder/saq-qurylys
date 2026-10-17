"""Explicit Threads access check/search; private results, no application DB writes."""

import argparse
import json
import os
import sys
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'backend'))

from app.threads_search import (  # noqa: E402
    SearchRequest,
    ThreadsError,
    search_threads,
    validate_token,
)
from pydantic import ValidationError  # noqa: E402

TOKEN_FILE = ROOT / '.local/threads-access-token.txt'
RESULTS = ROOT / '.local/threads-search'


def read_token():
    if not TOKEN_FILE.exists():
        raise ThreadsError('TOKEN_MISSING')
    try:
        with TOKEN_FILE.open('r', encoding='utf-8-sig') as stream:
            token = stream.read(4098).strip()
        validate_token(token)
        return token
    except (OSError, UnicodeError):
        raise ThreadsError('TOKEN_INVALID') from None


def save_result(result):
    RESULTS.mkdir(parents=True, exist_ok=True)
    name = datetime.now(UTC).strftime('%Y%m%dT%H%M%SZ-') + uuid4().hex
    temporary = RESULTS / (name + '.tmp')
    path = RESULTS / (name + '.json')
    try:
        with temporary.open('x', encoding='utf-8') as stream:
            os.chmod(temporary, 0o600)
            json.dump(result, stream, ensure_ascii=False, indent=2)
            stream.write('\n')
        temporary.replace(path)
    finally:
        temporary.unlink(missing_ok=True)
    return path


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='command', required=True)
    commands.add_parser('status', help='Проверить локальную настройку без сетевого запроса')
    search = commands.add_parser('search', help='Один запрос официального поиска, без автоматического импорта')
    search.add_argument('--query', required=True)
    search.add_argument('--order', choices=['RECENT', 'TOP'], default='RECENT')
    search.add_argument('--limit', type=int, default=20)
    search.add_argument('--timeout', type=int, default=20)
    args = parser.parse_args(argv)
    try:
        request = None
        if args.command == 'search':
            request = SearchRequest(
                query=args.query,
                search_type=args.order,
                limit=args.limit,
                timeout_seconds=args.timeout,
            )
        token = read_token()
        if args.command == 'status':
            print('TOKEN_CONFIGURED; API_ACCESS_UNVERIFIED. Сетевых запросов не было.')
            return 0
        result = search_threads(token, request)
        path = save_result(result)
        print(f'Сохранено результатов: {len(result["items"])}; следующая страница: {result["has_more"]}.')
        print(f'Файл: {path.relative_to(ROOT)}')
        print('Одна страница. Реклама/география/реестр не проверены; БД и риск не изменены.')
        return 0
    except ThreadsError as error:
        print(f'{error.code}: {error}', file=sys.stderr)
        if error.retry_after:
            print(
                f'Повтор не ранее чем через {error.retry_after} секунд; автоматически не выполняется.',
                file=sys.stderr,
            )
        return 2
    except ValidationError:
        print(
            'REQUEST_INVALID: Проверьте фразу (2–300), лимит (1–50), timeout (1–60).',
            file=sys.stderr,
        )
        return 2
    except OSError:
        print(
            'LOCAL_WRITE_FAILED: Не удалось сохранить результат в приватный каталог.',
            file=sys.stderr,
        )
        return 2


if __name__ == '__main__':
    raise SystemExit(main())
