"""Authenticated explicit dictionary registration/activation; no external I/O."""

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from pydantic import Field, field_validator
from sqlalchemy import func, select
from starlette.exceptions import HTTPException

from app.api.analysis import Key, analyst, audit
from app.commands import begin_command, finish_command
from app.dependencies import DB, Actor, check_csrf
from app.dto import DTO, Page
from app.models import MonitoringDictionaryActivation, MonitoringDictionaryVersion
from app.monitoring import advisory_lock
from app.monitoring_dictionaries import bundled_dictionary, dictionary_row, latest_activation, stored_snapshot

router = APIRouter(prefix='/api/v1/monitoring/dictionaries', tags=['Monitoring'])


class DictionaryReason(DTO):
    reason: str = Field(min_length=1, max_length=1000)

    @field_validator('reason')
    @classmethod
    def nonblank_reason(cls, value):
        value = value.strip()
        if not value or any(ord(c) < 32 for c in value):
            raise ValueError('Укажите причину без управляющих символов')
        return value


class DictionaryRegister(DictionaryReason):
    expected_sha256: str = Field(pattern=r'^[a-f0-9]{64}$')


class DictionaryActivate(DictionaryReason):
    dictionary_id: UUID | None
    expected_revision: int = Field(strict=True, ge=0)


class DictionaryOut(DTO):
    id: UUID
    dictionary_version: str
    content_sha256: str
    source: str
    created_at: datetime
    created_by: UUID


class DictionaryBundleOut(DTO):
    dictionary_version: str
    content_sha256: str
    source: str
    activation_status: str
    activated_at: None = None
    duplicate_city_aliases: list[str]


class DictionaryActivationOut(DTO):
    revision: int
    dictionary_id: UUID | None
    reason: str | None = None
    created_at: datetime | None = None
    created_by: UUID | None = None


@router.get('/bundled', response_model=DictionaryBundleOut, operation_id='getBundledMonitoringDictionary')
def bundled(actor: Actor):
    try:
        snapshot, _ = bundled_dictionary()
    except (OSError, ValueError):
        raise HTTPException(503, 'Поставляемый словарь недоступен или не прошёл проверку') from None
    return snapshot.metadata()


@router.get('', response_model=Page[DictionaryOut], operation_id='listMonitoringDictionaries')
def versions(actor: Actor, db: DB, page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100)):
    rows = db.scalars(
        select(MonitoringDictionaryVersion)
        .order_by(MonitoringDictionaryVersion.created_at.desc(), MonitoringDictionaryVersion.id)
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return dict(
        items=list(rows),
        page=page,
        page_size=page_size,
        total=db.scalar(select(func.count()).select_from(MonitoringDictionaryVersion)),
    )


@router.get('/activation', response_model=DictionaryActivationOut, operation_id='getMonitoringDictionaryActivation')
def activation(actor: Actor, db: DB):
    return latest_activation(db) or dict(revision=0, dictionary_id=None)


@router.get(
    '/activations', response_model=Page[DictionaryActivationOut], operation_id='listMonitoringDictionaryActivations'
)
def history(actor: Actor, db: DB, page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100)):
    rows = db.scalars(
        select(MonitoringDictionaryActivation)
        .order_by(MonitoringDictionaryActivation.revision.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return dict(
        items=list(rows),
        page=page,
        page_size=page_size,
        total=db.scalar(select(func.count()).select_from(MonitoringDictionaryActivation)),
    )


@router.post(
    '',
    response_model=DictionaryOut,
    status_code=201,
    operation_id='registerMonitoringDictionary',
    dependencies=[Depends(check_csrf)],
)
def register(body: DictionaryRegister, request: Request, actor: Actor, db: DB, idempotency_key: Key):
    analyst(actor)
    operation = 'registerMonitoringDictionary'
    previous, digest = begin_command(db, actor.id, operation, idempotency_key, body.model_dump(mode='json'))
    if previous:
        return previous
    try:
        snapshot, original = bundled_dictionary()
    except (OSError, ValueError):
        raise HTTPException(503, 'Поставляемый словарь недоступен или не прошёл проверку') from None
    if snapshot.content_sha256 != body.expected_sha256:
        raise HTTPException(409, 'Поставляемый словарь изменился. Сверьте SHA перед сохранением.')
    advisory_lock(db, 'monitoring-dictionary:' + snapshot.content_sha256)
    row = db.scalar(
        select(MonitoringDictionaryVersion).where(MonitoringDictionaryVersion.content_sha256 == snapshot.content_sha256)
    )
    if row is None:
        row = MonitoringDictionaryVersion(
            dictionary_version=snapshot.dictionary_version,
            content_sha256=snapshot.content_sha256,
            source=snapshot.source,
            raw=snapshot.raw,
            original_raw=original,
            created_by=actor.id,
        )
        db.add(row)
        db.flush()
        audit(
            db,
            request,
            actor,
            row,
            'MONITORING_DICTIONARY_REGISTERED',
            reason=body.reason,
            details={'content_sha256': snapshot.content_sha256},
        )
    result = DictionaryOut.model_validate(row).model_dump(mode='json')
    finish_command(db, actor.id, operation, idempotency_key, digest, result)
    return result


@router.post(
    '/activations',
    response_model=DictionaryActivationOut,
    operation_id='activateMonitoringDictionary',
    dependencies=[Depends(check_csrf)],
)
def activate(body: DictionaryActivate, request: Request, actor: Actor, db: DB, idempotency_key: Key):
    analyst(actor)
    operation = 'activateMonitoringDictionary'
    previous, digest = begin_command(db, actor.id, operation, idempotency_key, body.model_dump(mode='json'))
    if previous:
        return previous
    current = latest_activation(db, lock=True)
    revision = current.revision if current else 0
    if revision != body.expected_revision:
        raise HTTPException(409, 'Активация изменена другим действием. Обновите состояние.')
    if body.dictionary_id:
        try:
            stored_snapshot(dictionary_row(db, body.dictionary_id))
        except ValueError:
            raise HTTPException(409, 'Сохранённый словарь не прошёл проверку целостности') from None
    row = MonitoringDictionaryActivation(
        revision=revision + 1, dictionary_id=body.dictionary_id, reason=body.reason, created_by=actor.id
    )
    db.add(row)
    db.flush()
    audit(
        db,
        request,
        actor,
        row,
        'MONITORING_DICTIONARY_ACTIVATED' if body.dictionary_id else 'MONITORING_DICTIONARY_DEACTIVATED',
        old=revision,
        reason=body.reason,
        details={'dictionary_id': str(body.dictionary_id) if body.dictionary_id else None, 'revision': row.revision},
    )
    result = DictionaryActivationOut.model_validate(row).model_dump(mode='json')
    finish_command(db, actor.id, operation, idempotency_key, digest, result)
    return result
