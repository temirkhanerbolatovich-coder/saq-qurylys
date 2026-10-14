"""Generate private local configuration once; never overwrite existing secrets."""
import secrets
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
target = ROOT / '.env'
if target.exists():
    raise SystemExit('.env already exists; preserved without changes.')
password = secrets.token_urlsafe(18)
database_password = secrets.token_hex(24)
lines = [
    'APP_ENV=local', 'APP_TIMEZONE=Asia/Qyzylorda', 'APP_ORIGIN=http://localhost:3000',
    'APP_PORT=3000', 'POSTGRES_DB=saq_qurylys', 'POSTGRES_USER=saq_app',
    f'POSTGRES_PASSWORD={database_password}',
    f'DATABASE_URL=postgresql+psycopg://saq_app:{database_password}@localhost:55432/saq_qurylys',
    f'SESSION_SECRET={secrets.token_hex(32)}', 'BOOTSTRAP_ANALYST_USERNAME=analyst',
    f'BOOTSTRAP_ANALYST_PASSWORD={password}', 'SESSION_COOKIE_SECURE=false',
    'COLLECTOR_ENABLED=false', 'LLM_ENABLED=false',
]
target.write_text('\n'.join(lines) + '\n', encoding='utf-8')
private = ROOT / '.local'
private.mkdir(exist_ok=True)
(private / 'credentials.txt').write_text(f'Local URL: http://localhost:3000\nUsername: analyst\nPassword: {password}\n', encoding='utf-8')
print('Created private .env and .local/credentials.txt. Credentials were not printed.')
