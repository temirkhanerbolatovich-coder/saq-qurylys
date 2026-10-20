"""Versioned V2 findings and explicit text imports into the existing review queue."""

from datetime import datetime
from typing import Literal
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Query, Request
from pydantic import Field, field_validator
from sqlalchemy import func, select
from starlette.exceptions import HTTPException

from app.api.analysis import Key, analyst, audit
from app.api.query_profiles import get_profile
from app.api.threads import ThreadsSearchInput, ThreadsSearchResult, execute_search, replay_result
from app.commands import begin_command, finish_command
from app.dependencies import DB, Actor, check_csrf
from app.dto import DTO, Page
from app.models import (
    Advertisement,
    Asset,
    MonitoringFinding,
    MonitoringFindingImport,
    MonitoringFindingObservation,
    MonitoringFindingVersion,
    MonitoringQueryProfileVersion,
    MonitoringRun,
)
from app.monitoring import advisory_lock
from app.monitoring_dictionaries import active_snapshot
from app.monitoring_findings import capture_run, profile_query
from app.storage import save_text

router = APIRouter(prefix='/api/v1/monitoring', tags=['Monitoring'])
Priority = Literal['P1', 'P2', 'P3', 'NOT_RELEVANT', 'NEEDS_CONTEXT']


class FindingReason(DTO):
    reason: str = Field(min_length=1, max_length=2000)

    @field_validator('reason')
    @classmethod
    def nonblank(cls, value):
        if not value.strip():
            raise ValueError('Укажите обоснование')
        return value.strip()


class ProfileRunInput(FindingReason):
    expected_revision: int = Field(ge=1, strict=True)
    query_id: str = Field(pattern=r'^[a-f0-9]{64}$')
    search_type: Literal['RECENT', 'TOP'] = 'RECENT'
    limit: int = Field(default=20, ge=1, le=50, strict=True)


class FindingCaptureInput(FindingReason):
    run_id: UUID


class FindingCaptureObservation(DTO):
    id: UUID
    finding_id: UUID
    version_id: UUID
    query_id: str


class FindingCaptureResult(DTO):
    run_id: UUID
    outcome: Literal['SUCCESS', 'PARTIAL']
    coverage: Literal['SINGLE_PAGE_NOT_EXHAUSTIVE']
    new_findings: int
    new_versions: int
    observations: list[FindingCaptureObservation]


class FindingSummary(DTO):
    id: UUID
    version_id: UUID
    version: int
    platform: Literal['THREADS']
    external_id: str
    is_demo: bool
    source_url: str
    published_at: datetime | None
    captured_at: datetime
    dictionary_id: UUID
    dictionary_sha256: str
    rules_version: str
    content_sha256: str
    media_type: str
    priority: Priority
    advertisement_id: UUID | None
    registry_status: Literal['WAITING_REGISTRY'] = 'WAITING_REGISTRY'
    access_status: Literal['VERIFIED_FOR_SAVED_PAGE'] = 'VERIFIED_FOR_SAVED_PAGE'


class FindingDetail(FindingSummary):
    text: str | None
    context: dict


class FindingObservationOut(DTO):
    id: UUID
    finding_id: UUID
    version_id: UUID
    run_id: UUID
    profile_version_id: UUID
    query_id: str
    captured_at: datetime
    raw_response_sha256: str
    has_more: bool
    coverage: Literal['SINGLE_PAGE_NOT_EXHAUSTIVE'] = 'SINGLE_PAGE_NOT_EXHAUSTIVE'


class FindingImportInput(FindingReason):
    version_id: UUID
    observation_id: UUID
    text_only_acknowledged: Literal[True]

    @field_validator('text_only_acknowledged', mode='before')
    @classmethod
    def explicit_text_only(cls, value):
        if value is not True:
            raise ValueError('Подтвердите ограничения текстового импорта')
        return value


class FindingImportOut(DTO):
    id: UUID
    version_id: UUID
    observation_id: UUID
    advertisement_id: UUID
    created_at: datetime
    created_by: UUID
    reason: str


@router.post(
    '/query-profiles/{id}/runs',
    response_model=ThreadsSearchResult,
    operation_id='runMonitoringV2ProfileQuery',
    dependencies=[Depends(check_csrf)],
)
def run_profile(id: UUID, body: ProfileRunInput, request: Request, actor: Actor, db: DB, idempotency_key: Key):
    analyst(actor)
    profile_request = {'profile_id': str(id), **body.model_dump(mode='json')}
    advisory_lock(db, f'monitoring-run:{actor.id}:{idempotency_key}')
    previous = db.scalar(
        select(MonitoringRun).where(MonitoringRun.created_by == actor.id, MonitoringRun.command_key == idempotency_key)
    )
    if previous:
        if previous.query.get('profile_request') != profile_request:
            raise HTTPException(409, 'Ключ уже использован для другого запуска.')
        return replay_result(previous)
    profile = get_profile(db, id, lock=True)
    if profile.dictionary_version != '2.0' or profile.revision != body.expected_revision:
        raise HTTPException(409, 'Обновите текущую версию профиля V2.')
    version = db.scalar(
        select(MonitoringQueryProfileVersion).where(
            MonitoringQueryProfileVersion.profile_id == id, MonitoringQueryProfileVersion.revision == profile.revision
        )
    )
    query = profile_query(version, body.query_id)
    if query.get('discovery') != 'keyword' or query.get('capability_status') != 'LOCAL_FILTER_ONLY':
        raise HTTPException(409, 'Этот запрос не поддерживается текущим keyword-адаптером.')
    try:
        snapshot, _ = active_snapshot(db, version.dictionary_id)
        if snapshot.content_sha256 != version.dictionary_sha256:
            raise ValueError('Dictionary mismatch')
    except ValueError:
        raise HTTPException(409, 'Сохранённый словарь не прошёл проверку целостности.') from None
    if len(query['text']) > 300:
        raise HTTPException(422, 'Запрос превышает лимит текущего источника.')
    search = ThreadsSearchInput(query=query['text'], search_type=body.search_type, limit=body.limit)
    metadata = {
        **search.model_dump(mode='json'),
        'profile_version_id': str(version.id),
        'profile_request': profile_request,
        'dictionary_sha256': snapshot.content_sha256,
    }
    return execute_search(search, actor, request, db, idempotency_key, query_metadata=metadata)


@router.post(
    '/findings/capture',
    response_model=FindingCaptureResult,
    operation_id='captureMonitoringFindings',
    dependencies=[Depends(check_csrf)],
)
def capture(body: FindingCaptureInput, request: Request, actor: Actor, db: DB, idempotency_key: Key):
    analyst(actor)
    operation = 'captureMonitoringFindings'
    previous, digest = begin_command(db, actor.id, operation, idempotency_key, body.model_dump(mode='json'))
    if previous:
        return previous
    result = FindingCaptureResult.model_validate(capture_run(db, request, actor, body.run_id, body.reason))
    result = result.model_dump(mode='json')
    finish_command(db, actor.id, operation, idempotency_key, digest, result)
    return result


def finding(db, id):
    row = db.get(MonitoringFinding, id)
    if row is None:
        raise HTTPException(404, 'Находка не найдена.')
    return row


def version_view(db, identity, version):
    imported = db.scalar(select(MonitoringFindingImport).where(MonitoringFindingImport.version_id == version.id))
    return {
        key: getattr(version, key)
        for key in (
            'version',
            'source_url',
            'published_at',
            'captured_at',
            'dictionary_id',
            'dictionary_sha256',
            'rules_version',
            'content_sha256',
            'media_type',
            'priority',
        )
    } | {
        'id': identity.id,
        'version_id': version.id,
        'platform': identity.platform,
        'external_id': identity.external_id,
        'is_demo': identity.is_demo,
        'advertisement_id': imported.advertisement_id if imported else None,
    }


@router.get('/findings', response_model=Page[FindingSummary], operation_id='listMonitoringFindings')
def findings(
    actor: Actor,
    db: DB,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    priority: Priority | None = None,
    run_id: UUID | None = None,
    imported: bool | None = None,
):
    latest = select(
        MonitoringFindingVersion.id,
        func.row_number()
        .over(
            partition_by=MonitoringFindingVersion.finding_id,
            order_by=(MonitoringFindingVersion.captured_at.desc(), MonitoringFindingVersion.version.desc()),
        )
        .label('position'),
    ).subquery()
    query = select(MonitoringFinding, MonitoringFindingVersion).join(
        MonitoringFindingVersion, MonitoringFindingVersion.finding_id == MonitoringFinding.id
    )
    if run_id:
        query = query.join(
            MonitoringFindingObservation,
            (MonitoringFindingObservation.version_id == MonitoringFindingVersion.id)
            & (MonitoringFindingObservation.run_id == run_id),
        )
    else:
        query = query.join(
            latest,
            (latest.c.id == MonitoringFindingVersion.id) & (latest.c.position == 1),
        )
    if priority:
        query = query.where(MonitoringFindingVersion.priority == priority)
    if imported is not None:
        imported_exists = (
            select(MonitoringFindingImport.id)
            .where(MonitoringFindingImport.version_id == MonitoringFindingVersion.id)
            .exists()
        )
        query = query.where(imported_exists if imported else ~imported_exists)
    total = db.scalar(select(func.count()).select_from(query.subquery()))
    rows = db.execute(
        query.order_by(MonitoringFindingVersion.captured_at.desc(), MonitoringFinding.id)
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return {
        'items': [version_view(db, identity, version) for identity, version in rows],
        'page': page,
        'page_size': page_size,
        'total': total,
    }


@router.get('/findings/{id}', response_model=FindingDetail, operation_id='getMonitoringFinding')
def detail(id: UUID, actor: Actor, db: DB, version: int | None = Query(None, ge=1)):
    identity = finding(db, id)
    query = select(MonitoringFindingVersion).where(MonitoringFindingVersion.finding_id == id)
    if version is not None:
        query = query.where(MonitoringFindingVersion.version == version)
    row = db.scalar(
        query.order_by(MonitoringFindingVersion.captured_at.desc(), MonitoringFindingVersion.version.desc()).limit(1)
    )
    if row is None:
        raise HTTPException(404, 'Версия находки не найдена.')
    return version_view(db, identity, row) | {'text': row.text, 'context': row.context}


@router.get(
    '/findings/{id}/versions', response_model=Page[FindingSummary], operation_id='listMonitoringFindingVersions'
)
def versions(id: UUID, actor: Actor, db: DB, page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100)):
    identity = finding(db, id)
    query = select(MonitoringFindingVersion).where(MonitoringFindingVersion.finding_id == id)
    total = db.scalar(select(func.count()).select_from(query.subquery()))
    rows = db.scalars(
        query.order_by(MonitoringFindingVersion.version.desc()).offset((page - 1) * page_size).limit(page_size)
    )
    return {
        'items': [version_view(db, identity, row) for row in rows],
        'page': page,
        'page_size': page_size,
        'total': total,
    }


@router.get(
    '/findings/{id}/observations',
    response_model=Page[FindingObservationOut],
    operation_id='listMonitoringFindingObservations',
)
def observations(
    id: UUID,
    actor: Actor,
    db: DB,
    version_id: UUID | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    finding(db, id)
    query = select(MonitoringFindingObservation).where(MonitoringFindingObservation.finding_id == id)
    if version_id:
        query = query.where(MonitoringFindingObservation.version_id == version_id)
    total = db.scalar(select(func.count()).select_from(query.subquery()))
    rows = db.scalars(
        query.order_by(MonitoringFindingObservation.captured_at.desc(), MonitoringFindingObservation.id)
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return {'items': list(rows), 'page': page, 'page_size': page_size, 'total': total}


@router.post(
    '/findings/{id}/imports',
    response_model=FindingImportOut,
    status_code=201,
    operation_id='importMonitoringFinding',
    dependencies=[Depends(check_csrf)],
)
def import_finding(id: UUID, body: FindingImportInput, request: Request, actor: Actor, db: DB, idempotency_key: Key):
    analyst(actor)
    operation = 'importMonitoringFinding'
    previous, digest = begin_command(
        db, actor.id, operation, idempotency_key, {'id': str(id), **body.model_dump(mode='json')}
    )
    if previous:
        return previous
    identity = finding(db, id)
    advisory_lock(db, f'finding-import:{body.version_id}')
    version = db.get(MonitoringFindingVersion, body.version_id)
    observation = db.get(MonitoringFindingObservation, body.observation_id)
    if version is None or version.finding_id != id or observation is None or observation.version_id != version.id:
        raise HTTPException(409, 'Версия и наблюдение должны относиться к этой находке.')
    imported = db.scalar(select(MonitoringFindingImport).where(MonitoringFindingImport.version_id == version.id))
    if imported is None:
        if not version.text or not version.text.strip():
            raise HTTPException(409, 'У находки нет текста для импорта. Медиа не загружаются.')
        key, sha, size = save_text(request.app.state.settings.storage_root, version.text)
        ad = Advertisement(
            id=uuid4(),
            source_label='Threads · V2 · сохранённая находка',
            source_url=version.source_url,
            published_at=version.published_at,
            captured_at=version.captured_at,
            original_text=version.text,
            is_demo=identity.is_demo,
            created_by=actor.id,
        )
        db.add(ad)
        db.flush()
        db.add(
            Asset(
                advertisement_id=ad.id,
                kind='TEXT',
                mime_type='text/plain',
                byte_size=size,
                sha256=sha,
                storage_key=key,
                captured_at=version.captured_at,
                is_demo=identity.is_demo,
                source_details={
                    'source_method': 'THREADS_OFFICIAL_KEYWORD_SEARCH',
                    'finding_id': str(id),
                    'finding_version_id': str(version.id),
                    'observation_id': str(observation.id),
                    'run_id': str(observation.run_id),
                    'profile_version_id': str(observation.profile_version_id),
                    'query_id': observation.query_id,
                    'raw_response_sha256': observation.raw_response_sha256,
                    'dictionary_sha256': version.dictionary_sha256,
                    'content_limits': version.context['content_limits'],
                    'registry_status': 'WAITING_REGISTRY',
                    'coverage': 'SINGLE_PAGE_NOT_EXHAUSTIVE',
                },
            )
        )
        imported = MonitoringFindingImport(
            id=uuid4(),
            version_id=version.id,
            observation_id=observation.id,
            advertisement_id=ad.id,
            created_by=actor.id,
            reason=body.reason,
        )
        db.add(imported)
        db.flush()
        audit(
            db,
            request,
            actor,
            imported,
            'MONITORING_FINDING_IMPORTED',
            reason=body.reason,
            details={'finding_id': str(id), 'version_id': str(version.id), 'advertisement_id': str(ad.id)},
        )
    result = FindingImportOut.model_validate(imported).model_dump(mode='json')
    finish_command(db, actor.id, operation, idempotency_key, digest, result)
    return result
