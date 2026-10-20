"""Generate private local configuration once; never overwrite existing secrets."""

import argparse
import os
import secrets
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def local_port(value: str) -> int:
    try:
        port = int(value)
    except ValueError:
        raise argparse.ArgumentTypeError('Port must be an integer from 1024 to 65535.') from None
    if not 1024 <= port <= 65535:
        raise argparse.ArgumentTypeError('Port must be an integer from 1024 to 65535.')
    return port


def write_private(path: Path, content: str):
    # Exclusive creation also protects against two simultaneous generator processes.
    descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(descriptor, 'w', encoding='utf-8', newline='\n') as output:
        output.write(content)


def configure(root: Path, *, port: int = 3000, demo_seed: bool = True):
    """Create fresh local secrets; an existing configuration or credential file aborts the operation."""
    if not isinstance(port, int) or isinstance(port, bool) or not 1024 <= port <= 65535:
        raise ValueError('Port must be an integer from 1024 to 65535.')
    target = root / '.env'
    credentials = root / '.local/credentials.txt'
    if target.exists() or credentials.exists():
        raise FileExistsError('Existing configuration or credentials preserved without changes.')
    origin = f'http://localhost:{port}'
    password = secrets.token_urlsafe(18)
    database_password = secrets.token_hex(24)
    lines = [
        'APP_ENV=local',
        'APP_TIMEZONE=Asia/Qyzylorda',
        f'APP_ORIGIN={origin}',
        f'APP_PORT={port}',
        'POSTGRES_DB=saq_qurylys',
        'POSTGRES_USER=saq_app',
        f'POSTGRES_PASSWORD={database_password}',
        f'DATABASE_URL=postgresql+psycopg://saq_app:{database_password}@localhost:55432/saq_qurylys',
        f'SESSION_SECRET={secrets.token_hex(32)}',
        'BOOTSTRAP_ANALYST_USERNAME=analyst',
        f'BOOTSTRAP_ANALYST_PASSWORD={password}',
        'SESSION_COOKIE_SECURE=false',
        f'DEMO_SEED_ENABLED={str(demo_seed).lower()}',
        'THREADS_SEARCH_ENABLED=false',
        'TELEGRAM_ENABLED=false',
        'COLLECTOR_ENABLED=false',
        'LLM_ENABLED=false',
    ]
    credentials.parent.mkdir(exist_ok=True)
    write_private(target, '\n'.join(lines) + '\n')
    # If a later write fails, retain created files for recovery instead of regenerating secrets.
    write_private(credentials, f'Local URL: {origin}\nUsername: analyst\nPassword: {password}\n')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=local_port, default=3000, help='Local UI port (default: 3000).')
    parser.add_argument('--demo-seed', action=argparse.BooleanOptionalAction, default=True)
    args = parser.parse_args()
    try:
        configure(ROOT, port=args.port, demo_seed=args.demo_seed)
    except FileExistsError:
        parser.exit(1, 'Existing configuration or credentials preserved without changes.\n')
    except OSError:
        parser.exit(1, 'Configuration could not be completed; any created files were retained for recovery.\n')
    print('Created private .env and .local/credentials.txt. Credentials were not printed.')


if __name__ == '__main__':
    main()
