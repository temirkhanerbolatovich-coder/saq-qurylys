"""Create private HTTPS server configuration without changing an existing installation."""

import argparse
import re
import secrets
from pathlib import Path

from configure_local import local_port, write_private

ROOT = Path(__file__).resolve().parents[1]
HOSTNAME = re.compile(r'(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}')


def public_hostname(value):
    """Accept a DNS name only; schemes, IP literals and Caddy syntax are forbidden."""
    hostname = value.lower()
    if len(hostname) > 253 or not HOSTNAME.fullmatch(hostname):
        raise ValueError('Use a public DNS hostname without scheme, port, path or whitespace.')
    return hostname


def restored_credentials(path):
    """Read only the existing analyst credentials; never copy service tokens or local DB secrets."""
    wanted = {'BOOTSTRAP_ANALYST_USERNAME', 'BOOTSTRAP_ANALYST_PASSWORD'}
    values = {}
    for line in path.read_text(encoding='utf-8-sig').splitlines():
        key, separator, value = line.partition('=')
        if not separator or key.strip() not in wanted:
            continue
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
            value = value[1:-1]
        values[key.strip()] = value
    username = values.get('BOOTSTRAP_ANALYST_USERNAME', '')
    password = values.get('BOOTSTRAP_ANALYST_PASSWORD', '')
    if not re.fullmatch(r'[A-Za-z0-9_.-]{1,100}', username) or len(password) < 12:
        raise ValueError('Existing analyst credentials are absent or unsupported; values suppressed.')
    if any(character in password for character in '\r\n\x00$#"\'\\') or password.strip() != password:
        raise ValueError('Credential requires manual dotenv encoding; value suppressed.')
    return username, password


def configure(root, host, *, port=3000, credentials_from=None):
    """New DB/session secrets are independent; restoring a DB can retain its existing analyst login."""
    host = public_hostname(host)
    port = local_port(str(port))
    target = root / '.env'
    credentials = root / '.local/server-credentials.txt'
    if target.exists() or credentials.exists():
        raise FileExistsError('Existing configuration or credentials preserved without changes.')
    if credentials_from is None:
        username, password = 'analyst', secrets.token_urlsafe(24)
    else:
        username, password = restored_credentials(credentials_from)
    database_password = secrets.token_hex(24)
    lines = [
        'APP_ENV=production',
        'APP_TIMEZONE=Asia/Qyzylorda',
        f'PUBLIC_HOST={host}',
        f'APP_ORIGIN=https://{host}',
        f'APP_PORT={port}',
        'POSTGRES_DB=saq_qurylys',
        'POSTGRES_USER=saq_app',
        f'POSTGRES_PASSWORD={database_password}',
        f'DATABASE_URL=postgresql+psycopg://saq_app:{database_password}@db:5432/saq_qurylys',
        f'SESSION_SECRET={secrets.token_hex(32)}',
        f'BOOTSTRAP_ANALYST_USERNAME={username}',
        f'BOOTSTRAP_ANALYST_PASSWORD={password}',
        'SESSION_COOKIE_SECURE=true',
        'DEMO_SEED_ENABLED=false',
        'THREADS_SEARCH_ENABLED=false',
        'TELEGRAM_ENABLED=false',
    ]
    credentials.parent.mkdir(parents=True, exist_ok=True)
    write_private(target, '\n'.join(lines) + '\n')
    write_private(credentials, f'URL: https://{host}\nUsername: {username}\nPassword: {password}\n')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--public-host', required=True)
    parser.add_argument('--port', type=local_port, default=3000)
    parser.add_argument('--credentials-from', type=Path, help='Private local .env when restoring its existing DB.')
    args = parser.parse_args()
    try:
        configure(ROOT, args.public_host, port=args.port, credentials_from=args.credentials_from)
    except (OSError, ValueError, argparse.ArgumentTypeError) as error:
        message = (
            str(error)
            if isinstance(error, (ValueError, FileExistsError))
            else 'Private configuration could not be completed; created files retained.'
        )
        parser.exit(1, message + '\n')
    print('Created private server .env and .local/server-credentials.txt; credentials were not printed.')


if __name__ == '__main__':
    main()
