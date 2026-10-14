import hashlib
import hmac
import secrets
import time


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 600_000)
    return f'pbkdf2_sha256${salt}${digest.hex()}'


def verify_password(password: str, encoded: str) -> bool:
    algorithm, salt, expected = encoded.split('$')
    if algorithm != 'pbkdf2_sha256':
        return False
    actual = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 600_000).hex()
    return hmac.compare_digest(actual, expected)


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def issue_csrf(secret: str, session_token: str) -> str:
    payload = f'{int(time.time())}.{secrets.token_urlsafe(24)}'
    signature = hmac.new(secret.encode(), f'{payload}|{session_token}'.encode(), 'sha256').hexdigest()
    return f'{payload}.{signature}'


def valid_csrf(token: str, secret: str, session_token: str) -> bool:
    try:
        timestamp, nonce, signature = token.split('.')
        age = time.time() - int(timestamp)
        if not 0 <= age <= 3600 or not nonce:
            return False
        expected = hmac.new(secret.encode(), f'{timestamp}.{nonce}|{session_token}'.encode(), 'sha256').hexdigest()
        return hmac.compare_digest(expected, signature)
    except (ValueError, TypeError):
        return False
