"""Explicit versioned parameter storage. Reading or saving never performs a search."""

from datetime import datetime
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from pydantic import Field, field_validator
from sqlalchemy import func, select
from starlette.exceptions import HTTPException

from app.api.analysis import Key, analyst
from app.commands import begin_command, finish_command
from app.dependencies import DB, Actor, check_csrf
from app.dto import DTO, Page
from app.models import AuditEvent, MonitoringQueryProfile, MonitoringQueryProfileVersion, utcnow
from app.monitoring_dictionaries import active_snapshot
from app.query_profiles import DICTIONARY_SHA256, QueryParameters, compile_queries
from app.social_queries import QueryPreviewOptions, compile_preview

router = APIRouter(prefix='/api/v1/monitoring/query-profiles', tags=['Monitoring'])


class SocialQueryParameters(QueryPreviewOptions):
    dictionary_version: Literal['2.0']
    dictionary_id: UUID
    source_code: Literal['OFFLINE'] = 'OFFLINE'


class QueryProfileInput(DTO):
    name: str = Field(min_length=1, max_length=100)
    parameters: QueryParameters | SocialQueryParameters

    @field_validator('name')
    @classmethod
    def valid_name(cls, value):
        value = value.strip()
        if not value or any(ord(char) < 32 for char in value):
            raise ValueError('Укажите название без управляющих символов')
        return value


class QueryProfileUpdate(QueryProfileInput):
    expected_revision: int = Field(ge=1, strict=True)


class QueryProfileSummary(DTO):
    dictionary_version: Literal['1.0', '2.0']
    id: UUID
    name: str
    revision: int
    created_at: datetime
    updated_at: datetime


class QueryProfileDetail(DTO):
    dictionary_id: UUID | None = None
    compiled_preview: dict | None = None
    id: UUID
    name: str
    revision: int
    current_revision: int
    parameters: QueryParameters | SocialQueryParameters
    compiled_queries: list[str]
    dictionary_sha256: str
    created_at: datetime
    created_by: UUID


def get_profile(db, id, *, lock=False):
    query = select(MonitoringQueryProfile).where(MonitoringQueryProfile.id == id)
    row = db.scalar(query.with_for_update().execution_options(populate_existing=True) if lock else query)
    if row is None:
        raise HTTPException(404, 'Профиль не найден')
    return row


def detail(profile, version):
    return dict(
        id=profile.id,
        dictionary_id=version.dictionary_id,
        compiled_preview=version.compiled_preview,
        name=version.name,
        revision=version.revision,
        current_revision=profile.revision,
        parameters=version.parameters,
        compiled_queries=version.compiled_queries,
        dictionary_sha256=version.dictionary_sha256,
        created_at=version.created_at,
        created_by=version.created_by,
    )


@router.get('', response_model=Page[QueryProfileSummary], operation_id='listMonitoringQueryProfiles')
def profiles(
    actor: Actor,
    db: DB,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    dictionary_version: Literal['1.0', '2.0'] = '1.0',
):
    rows = db.scalars(
        select(MonitoringQueryProfile)
        .where(MonitoringQueryProfile.dictionary_version == dictionary_version)
        .order_by(MonitoringQueryProfile.updated_at.desc(), MonitoringQueryProfile.id)
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    total = db.scalar(
        select(func.count())
        .select_from(MonitoringQueryProfile)
        .where(MonitoringQueryProfile.dictionary_version == dictionary_version)
    )
    return dict(items=list(rows), page=page, page_size=page_size, total=total)


@router.get('/{id}', response_model=QueryProfileDetail, operation_id='getMonitoringQueryProfile')
def profile_detail(
    id: UUID,
    actor: Actor,
    db: DB,
    revision: int | None = Query(None, ge=1),
    dictionary_version: Literal['1.0', '2.0'] = '1.0',
):
    profile = get_profile(db, id)
    if profile.dictionary_version != dictionary_version:
        raise HTTPException(404, 'Профиль не найден для этой версии словаря')
    version = db.scalar(
        select(MonitoringQueryProfileVersion).where(
            MonitoringQueryProfileVersion.profile_id == id,
            MonitoringQueryProfileVersion.revision == (revision or profile.revision),
        )
    )
    if version is None:
        raise HTTPException(404, 'Версия профиля не найдена')
    return detail(profile, version)


def store_version(db, profile, body, actor, request, old_revision):
    preview, dictionary_id, dictionary_sha = None, None, DICTIONARY_SHA256
    if isinstance(body.parameters, SocialQueryParameters):
        try:
            snapshot, activation = active_snapshot(db, body.parameters.dictionary_id)
        except ValueError:
            raise HTTPException(409, 'Сохранённый словарь не прошёл проверку целостности') from None
        options = QueryPreviewOptions.model_validate(
            body.parameters.model_dump(exclude={'dictionary_version', 'dictionary_id'})
        )
        preview = compile_preview(snapshot, options)
        preview.update(
            activation_status='ACTIVE_AT_SAVE',
            activated_at=activation.created_at.isoformat(),
            activation_revision=activation.revision,
        )
        dictionary_id, dictionary_sha = body.parameters.dictionary_id, snapshot.content_sha256
        queries = [item['text'] for item in preview['queries']]
    else:
        queries = compile_queries(body.parameters)
    version = MonitoringQueryProfileVersion(
        profile_id=profile.id,
        revision=profile.revision,
        name=body.name,
        parameters=body.parameters.model_dump(mode='json'),
        compiled_queries=queries,
        compiled_preview=preview,
        dictionary_id=dictionary_id,
        dictionary_sha256=dictionary_sha,
        created_by=actor.id,
    )
    db.add(version)
    db.flush()
    db.add(
        AuditEvent(
            actor_id=actor.id,
            action='QUERY_PROFILE_VERSION_SAVED',
            entity_type='monitoring_query_profile',
            entity_id=profile.id,
            old_revision=old_revision,
            new_revision=profile.revision,
            request_id=request.state.request_id,
            details={'dictionary_sha256': dictionary_sha},
        )
    )
    return QueryProfileDetail.model_validate(detail(profile, version)).model_dump(mode='json')


@router.post(
    '',
    response_model=QueryProfileDetail,
    status_code=201,
    operation_id='createMonitoringQueryProfile',
    dependencies=[Depends(check_csrf)],
)
def create_profile(body: QueryProfileInput, request: Request, actor: Actor, db: DB, idempotency_key: Key):
    analyst(actor)
    operation = 'createMonitoringQueryProfile'
    previous, digest = begin_command(db, actor.id, operation, idempotency_key, body.model_dump(mode='json'))
    if previous:
        return previous
    profile = MonitoringQueryProfile(
        name=body.name, created_by=actor.id, dictionary_version=body.parameters.dictionary_version
    )
    db.add(profile)
    db.flush()
    result = store_version(db, profile, body, actor, request, None)
    finish_command(db, actor.id, operation, idempotency_key, digest, result)
    return result


@router.post(
    '/{id}/versions',
    response_model=QueryProfileDetail,
    operation_id='saveMonitoringQueryProfileVersion',
    dependencies=[Depends(check_csrf)],
)
def save_version(id: UUID, body: QueryProfileUpdate, request: Request, actor: Actor, db: DB, idempotency_key: Key):
    analyst(actor)
    operation = 'saveMonitoringQueryProfileVersion'
    previous, digest = begin_command(
        db, actor.id, operation, idempotency_key, {'id': str(id), **body.model_dump(mode='json')}
    )
    if previous:
        return previous
    profile = get_profile(db, id, lock=True)
    if profile.revision != body.expected_revision:
        raise HTTPException(409, 'Профиль изменён. Обновите сохранённую версию; ваш ввод остаётся в форме.')
    if profile.dictionary_version != body.parameters.dictionary_version:
        raise HTTPException(409, 'Создайте отдельный профиль для другой версии схемы словаря.')
    old_revision = profile.revision
    profile.revision += 1
    profile.name, profile.updated_at = body.name, utcnow()
    result = store_version(db, profile, body, actor, request, old_revision)
    finish_command(db, actor.id, operation, idempotency_key, digest, result)
    return result
