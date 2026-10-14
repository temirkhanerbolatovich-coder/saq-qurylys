import hashlib
import json
from uuid import UUID

from sqlalchemy import select, text
from sqlalchemy.orm import Session
from starlette.exceptions import HTTPException

from app.models import Command


def begin_command(db: Session, actor_id: UUID, operation: str, key: UUID, payload: dict) -> tuple[dict | None, str]:
    """Serialize retries of one actor/operation/key without locking unrelated commands."""
    body_hash = hashlib.sha256(json.dumps(payload, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
    lock = int.from_bytes(hashlib.sha256(f'{actor_id}:{operation}:{key}'.encode()).digest()[:8], signed=True)
    db.execute(text('SELECT pg_advisory_xact_lock(:key)'), {'key': lock})
    previous = db.scalar(
        select(Command).where(Command.actor_id == actor_id, Command.operation == operation, Command.key == key)
    )
    if previous and previous.body_hash != body_hash:
        raise HTTPException(409, 'Этот ключ уже использован для другого содержимого')
    return (previous.response if previous else None), body_hash


def finish_command(db: Session, actor_id: UUID, operation: str, key: UUID, body_hash: str, result: dict):
    db.add(Command(actor_id=actor_id, operation=operation, key=key, body_hash=body_hash, response=result))
    db.commit()
