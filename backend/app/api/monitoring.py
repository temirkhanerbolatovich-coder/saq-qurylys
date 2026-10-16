"""Authenticated manual candidate workflow with explicitly separate DEMO registry input."""

from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import func, or_, select
from starlette.exceptions import HTTPException

from app import monitoring_dto as dto
from app.api.analysis import Key, analyst, audit, revision
from app.commands import begin_command, finish_command
from app.dependencies import DB, Actor, check_csrf
from app.dto import Page
from app.models import (
    Advertisement,
    MonitoringCandidate,
    MonitoringComparison,
    MonitoringIncident,
    MonitoringObservation,
    MonitoringRegistrySnapshot,
    utcnow,
)
from app.monitoring import (
    ALGORITHM_VERSION,
    advisory_lock,
    attach_incident,
    candidate_view,
    candidate_views,
    digest,
    evaluate,
    identity_key,
    incident_event,
)

router = APIRouter(prefix='/api/v1/monitoring', tags=['Monitoring'])


def candidate_locked(db, candidate_id):
    row = db.scalar(
        select(MonitoringCandidate)
        .where(MonitoringCandidate.id == candidate_id)
        .with_for_update()
        .execution_options(populate_existing=True)
    )
    if not row:
        raise HTTPException(404, 'Кандидат объекта не найден')
    return row


def filtered(query, model, is_demo, q):
    if is_demo is not None:
        query = query.where(model.is_demo == is_demo)
    if q:
        escaped = q.replace('\\', '\\\\').replace('%', '\\%').replace('_', '\\_')
        query = query.where(
            or_(model.name.ilike(f'%{escaped}%', escape='\\'), model.city.ilike(f'%{escaped}%', escape='\\'))
        )
    return query


def page_result(db, query, page, page_size, views):
    total = db.scalar(select(func.count()).select_from(query.subquery()))
    rows = db.scalars(query.offset((page - 1) * page_size).limit(page_size))
    return {'items': views(rows), 'page': page, 'page_size': page_size, 'total': total}


@router.get('/candidates', response_model=Page[dto.CandidateOut], operation_id='listMonitoringCandidates')
def candidates(
    actor: Actor,
    db: DB,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    is_demo: bool | None = None,
    q: str | None = Query(None, max_length=300),
):
    query = filtered(select(MonitoringCandidate), MonitoringCandidate, is_demo, q)
    query = query.order_by(MonitoringCandidate.created_at.desc(), MonitoringCandidate.id)
    return page_result(db, query, page, page_size, lambda rows: candidate_views(db, rows))


@router.post(
    '/candidates',
    response_model=dto.CandidateOut,
    status_code=201,
    operation_id='createMonitoringCandidate',
    dependencies=[Depends(check_csrf)],
)
def create_candidate(body: dto.CandidateCreate, request: Request, actor: Actor, db: DB, idempotency_key: Key):
    analyst(actor)
    operation = 'createMonitoringCandidate'
    previous, body_hash = begin_command(db, actor.id, operation, idempotency_key, body.model_dump(mode='json'))
    if previous:
        return previous
    ad = db.get(Advertisement, body.advertisement_id)
    if not ad:
        raise HTTPException(404, 'Публикация не найдена')
    key = identity_key(body, ad.is_demo)
    advisory_lock(db, f'monitoring-identity:{key}')
    row = db.scalar(select(MonitoringCandidate).where(MonitoringCandidate.identity_key == key).with_for_update())
    old = row.revision if row else None
    if row is None:
        row = MonitoringCandidate(
            identity_key=key,
            is_demo=ad.is_demo,
            created_by=actor.id,
            **body.model_dump(exclude={'advertisement_id', 'reason'}),
        )
        db.add(row)
        db.flush()
    observation = db.scalar(
        select(MonitoringObservation).where(
            MonitoringObservation.candidate_id == row.id, MonitoringObservation.advertisement_id == ad.id
        )
    )
    if not observation:
        db.add(
            MonitoringObservation(
                candidate_id=row.id,
                advertisement_id=ad.id,
                advertisement_revision=ad.revision,
                created_by=actor.id,
                reason=body.reason,
            )
        )
        if old is not None:
            row.revision += 1
        audit(
            db,
            request,
            actor,
            row,
            'MONITORING_OBSERVATION_ADDED',
            old,
            body.reason,
            {'advertisement_id': str(ad.id), 'advertisement_revision': ad.revision},
        )
        db.flush()
    result = candidate_view(db, row).model_dump(mode='json')
    finish_command(db, actor.id, operation, idempotency_key, body_hash, result)
    return result


@router.get('/candidates/{id}', response_model=dto.CandidateDetailOut, operation_id='getMonitoringCandidate')
def candidate_detail(id: UUID, actor: Actor, db: DB):
    row = db.get(MonitoringCandidate, id)
    if not row:
        raise HTTPException(404, 'Кандидат объекта не найден')
    ads = db.scalars(
        select(Advertisement)
        .join(MonitoringObservation, MonitoringObservation.advertisement_id == Advertisement.id)
        .where(MonitoringObservation.candidate_id == id)
        .order_by(Advertisement.captured_at.desc(), Advertisement.id)
        .limit(100)
    )
    comparisons = db.scalars(
        select(MonitoringComparison)
        .where(MonitoringComparison.candidate_id == id)
        .order_by(MonitoringComparison.created_at.desc(), MonitoringComparison.id)
        .limit(20)
    )
    incidents = db.scalars(
        select(MonitoringIncident)
        .where(MonitoringIncident.candidate_id == id)
        .order_by(MonitoringIncident.created_at.desc(), MonitoringIncident.id)
        .limit(20)
    )
    return {
        'candidate': candidate_view(db, row),
        'advertisements': list(ads),
        'advertisement_total': db.scalar(
            select(func.count()).select_from(MonitoringObservation).where(MonitoringObservation.candidate_id == id)
        ),
        'comparisons': list(comparisons),
        'incidents': list(incidents),
    }


@router.get('/registry-snapshots', response_model=Page[dto.RegistrySnapshotOut], operation_id='listMonitoringSnapshots')
def registry_snapshots(
    actor: Actor,
    db: DB,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    is_demo: bool | None = None,
):
    query = select(MonitoringRegistrySnapshot)
    if is_demo is not None:
        query = query.where(MonitoringRegistrySnapshot.is_demo == is_demo)
    query = query.order_by(MonitoringRegistrySnapshot.created_at.desc(), MonitoringRegistrySnapshot.id)
    return page_result(
        db, query, page, page_size, lambda rows: [dto.RegistrySnapshotOut.model_validate(row) for row in rows]
    )


@router.post(
    '/registry-snapshots',
    response_model=dto.RegistrySnapshotOut,
    status_code=201,
    operation_id='createMonitoringSnapshot',
    dependencies=[Depends(check_csrf)],
)
def create_snapshot(body: dto.RegistrySnapshotCreate, request: Request, actor: Actor, db: DB, idempotency_key: Key):
    analyst(actor)
    operation = 'createMonitoringSnapshot'
    payload = body.model_dump(mode='json')
    previous, body_hash = begin_command(db, actor.id, operation, idempotency_key, payload)
    if previous:
        return previous
    content = body.model_dump(mode='json', exclude={'reason'})
    row = MonitoringRegistrySnapshot(
        **body.model_dump(exclude={'reason', 'entries'}),
        entries=content['entries'],
        sha256=digest(content),
        created_by=actor.id,
    )
    db.add(row)
    db.flush()
    audit(
        db,
        request,
        actor,
        row,
        'MONITORING_DEMO_SNAPSHOT_CREATED',
        reason=body.reason,
        details={'sha256': row.sha256, 'revision': 1, 'is_demo': True},
    )
    result = dto.RegistrySnapshotOut.model_validate(row).model_dump(mode='json')
    finish_command(db, actor.id, operation, idempotency_key, body_hash, result)
    return result


@router.post(
    '/candidates/{id}/compare',
    response_model=dto.ComparisonOut,
    operation_id='compareMonitoringCandidate',
    dependencies=[Depends(check_csrf)],
)
def compare_candidate(id: UUID, body: dto.CompareRequest, request: Request, actor: Actor, db: DB, idempotency_key: Key):
    analyst(actor)
    operation = 'compareMonitoringCandidate'
    previous, body_hash = begin_command(
        db, actor.id, operation, idempotency_key, body.model_dump(mode='json') | {'candidate_id': str(id)}
    )
    if previous:
        return previous
    candidate = candidate_locked(db, id)
    revision(candidate.revision, body.expected_revision)
    ad = db.scalar(
        select(Advertisement)
        .join(MonitoringObservation, MonitoringObservation.advertisement_id == Advertisement.id)
        .where(Advertisement.id == body.advertisement_id, MonitoringObservation.candidate_id == id)
        .with_for_update(of=Advertisement)
    )
    if not ad:
        raise HTTPException(422, 'Сначала свяжите публикацию с этим кандидатом')
    snapshot = db.get(MonitoringRegistrySnapshot, body.snapshot_id) if body.snapshot_id else None
    if body.snapshot_id and not snapshot:
        raise HTTPException(404, 'Снимок реестра не найден')
    if candidate.is_demo != ad.is_demo or (snapshot and candidate.is_demo != snapshot.is_demo):
        raise HTTPException(422, 'Нельзя смешивать DEMO и реальные данные')
    now = utcnow()
    outcome, explanation, entries = evaluate(candidate, ad, snapshot, now)
    # Expiration changes the outcome even if the material and registry version did not change.
    key = digest(
        [str(id), candidate.revision, str(ad.id), ad.revision, str(body.snapshot_id), ALGORITHM_VERSION, outcome]
    )
    row = db.scalar(select(MonitoringComparison).where(MonitoringComparison.deduplication_key == key))
    if row is None:
        row = MonitoringComparison(
            deduplication_key=key,
            candidate_id=id,
            advertisement_id=ad.id,
            candidate_revision=candidate.revision,
            advertisement_revision=ad.revision,
            snapshot_id=body.snapshot_id,
            result=outcome,
            explanation=explanation,
            matched_entries=entries,
            identity_snapshot={
                **{field: getattr(candidate, field) for field in ('name', 'city', 'address', 'phase')},
                'is_demo': candidate.is_demo,
                'published_at': ad.published_at.isoformat() if ad.published_at else None,
                'snapshot_sha256': snapshot.sha256 if snapshot else None,
            },
            created_at=now,
            created_by=actor.id,
            algorithm_version=ALGORITHM_VERSION,
        )
        db.add(row)
        db.flush()
        audit(
            db,
            request,
            actor,
            row,
            'MONITORING_COMPARED',
            reason=body.reason,
            details={
                'candidate_revision': candidate.revision,
                'advertisement_revision': ad.revision,
                'result': outcome,
            },
        )
        incident, old = attach_incident(db, candidate, row, actor, body.reason, now)
        if incident:
            audit(
                db,
                request,
                actor,
                incident,
                'MONITORING_INCIDENT_OBSERVED',
                old,
                body.reason,
                {'comparison_id': str(row.id), 'result': outcome},
            )
    result = dto.ComparisonOut.model_validate(row).model_dump(mode='json')
    finish_command(db, actor.id, operation, idempotency_key, body_hash, result)
    return result


@router.get('/incidents', response_model=Page[dto.IncidentOut], operation_id='listMonitoringIncidents')
def incidents(
    actor: Actor,
    db: DB,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    is_demo: bool | None = None,
    state: dto.IncidentState | None = None,
    q: str | None = Query(None, max_length=300),
):
    query = select(MonitoringIncident)
    if is_demo is not None:
        query = query.where(MonitoringIncident.is_demo == is_demo)
    if state:
        query = query.where(MonitoringIncident.state == state)
    if q:
        escaped = q.replace('\\', '\\\\').replace('%', '\\%').replace('_', '\\_')
        query = query.where(MonitoringIncident.candidate_name.ilike(f'%{escaped}%', escape='\\'))
    query = query.order_by(MonitoringIncident.updated_at.desc(), MonitoringIncident.id)
    return page_result(db, query, page, page_size, lambda rows: [dto.IncidentOut.model_validate(row) for row in rows])


@router.post(
    '/incidents/{id}/review',
    response_model=dto.IncidentOut,
    operation_id='reviewMonitoringIncident',
    dependencies=[Depends(check_csrf)],
)
def review_incident(id: UUID, body: dto.IncidentReview, request: Request, actor: Actor, db: DB, idempotency_key: Key):
    analyst(actor)
    operation = 'reviewMonitoringIncident'
    previous, body_hash = begin_command(
        db, actor.id, operation, idempotency_key, body.model_dump(mode='json') | {'incident_id': str(id)}
    )
    if previous:
        return previous
    # Lock in the same order as compare, to serialize adding evidence and reviewing a case.
    existing = db.get(MonitoringIncident, id)
    if not existing:
        raise HTTPException(404, 'Карточка проверки не найдена')
    candidate_locked(db, existing.candidate_id)
    row = db.scalar(
        select(MonitoringIncident)
        .where(MonitoringIncident.id == id)
        .with_for_update()
        .execution_options(populate_existing=True)
    )
    revision(row.revision, body.expected_revision)
    if row.state == 'CLOSED':
        raise HTTPException(409, 'Закрытая карточка сохраняется как историческое решение')
    old = row.revision
    row.state, row.close_reason = body.state, body.close_reason
    row.revision += 1
    row.updated_at = utcnow()
    row.history = row.history + [incident_event('REVIEWED', row.state, body.reason, actor, row.updated_at)]
    audit(
        db,
        request,
        actor,
        row,
        'MONITORING_INCIDENT_REVIEWED',
        old,
        body.reason,
        {'state': row.state, 'close_reason': row.close_reason},
    )
    result = dto.IncidentOut.model_validate(row).model_dump(mode='json')
    finish_command(db, actor.id, operation, idempotency_key, body_hash, result)
    return result
