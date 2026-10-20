"""Authenticated manual candidate workflow with explicitly separate DEMO registry input."""

from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import func, or_, select
from starlette.exceptions import HTTPException

from app import monitoring_dto as dto
from app.analysis_dto import AuditEventOut
from app.api.analysis import Key, analyst, audit, revision
from app.commands import begin_command, finish_command
from app.dependencies import DB, Actor, check_csrf
from app.dto import Page
from app.models import (
    Advertisement,
    AuditEvent,
    Developer,
    MonitoringCandidate,
    MonitoringComparison,
    MonitoringIncident,
    MonitoringObservation,
    MonitoringRegistrySnapshot,
    Property,
    User,
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


@router.post(
    '/candidates/{id}/dossier',
    response_model=dto.CandidateOut,
    status_code=201,
    operation_id='createCandidateDossier',
    dependencies=[Depends(check_csrf)],
)
def create_candidate_dossier(
    id: UUID, body: dto.CandidateDossierCreate, request: Request, actor: Actor, db: DB, idempotency_key: Key
):
    analyst(actor)
    operation = 'createCandidateDossier'
    previous, body_hash = begin_command(
        db, actor.id, operation, idempotency_key, {'candidate_id': str(id), **body.model_dump(mode='json')}
    )
    if previous:
        return previous
    candidate = candidate_locked(db, id)
    revision(candidate.revision, body.expected_revision)
    if candidate.property_id:
        raise HTTPException(409, 'Кандидат уже связан с досье. Обновите карточку.')
    # Serialize all creations in one data mode: same identity cannot race through the duplicate check.
    advisory_lock(db, f'candidate-dossier:{candidate.is_demo}')
    identity = tuple(dto.normalized(value) for value in (body.name, candidate.city, body.address))
    existing = db.scalars(select(Property).where(Property.is_demo == candidate.is_demo))
    if any(tuple(dto.normalized(value) for value in (row.name, row.city, row.address)) == identity for row in existing):
        raise HTTPException(409, 'Объект с таким названием, городом и адресом уже существует. Найдите его в реестре.')
    developers = list(db.scalars(select(Developer).where(Developer.is_demo == candidate.is_demo)))
    by_bin = [row for row in developers if body.developer_bin and row.bin == body.developer_bin]
    if by_bin and any(dto.normalized(row.name) != dto.normalized(body.developer_name) for row in by_bin):
        raise HTTPException(409, 'БИН уже указан у другого названия застройщика. Проверьте реквизиты.')
    matches = by_bin or [
        row
        for row in developers
        if row.bin == body.developer_bin and dto.normalized(row.name) == dto.normalized(body.developer_name)
    ]
    if len(matches) > 1:
        raise HTTPException(409, 'Несколько застройщиков с этими реквизитами. Требуется устранить неоднозначность.')
    developer = (
        matches[0]
        if matches
        else Developer(name=body.developer_name, bin=body.developer_bin, is_demo=candidate.is_demo)
    )
    db.add(developer)
    db.flush()
    prop = Property(
        name=body.name,
        city=candidate.city,
        address=body.address,
        developer_id=developer.id,
        is_demo=candidate.is_demo,
        level='PHASE',
        stage='UNKNOWN',
        legal_verification_status='UNKNOWN',
    )
    db.add(prop)
    db.flush()
    old_revision = candidate.revision
    candidate.property_id = prop.id
    candidate.property_link_kind = 'CREATED'
    candidate.revision += 1
    observations = db.scalars(select(MonitoringObservation).where(MonitoringObservation.candidate_id == id))
    provenance = {
        'candidate_id': str(id),
        'candidate_revision': old_revision,
        'candidate_identity': {key: getattr(candidate, key) for key in ('name', 'city', 'address', 'phase', 'is_demo')},
        'property_id': str(prop.id),
        'name': prop.name,
        'address': prop.address,
        'developer_id': str(developer.id),
        'developer_name': developer.name,
        'developer_bin': developer.bin,
        'observations': [
            {
                'id': str(row.id),
                'advertisement_id': str(row.advertisement_id),
                'advertisement_revision': row.advertisement_revision,
            }
            for row in observations
        ],
    }
    audit(db, request, actor, prop, 'PROPERTY_CREATED_FROM_CANDIDATE', None, body.reason, provenance)
    audit(
        db,
        request,
        actor,
        candidate,
        'MONITORING_DOSSIER_CREATED',
        old_revision,
        body.reason,
        provenance,
    )
    db.flush()
    result = candidate_view(db, candidate).model_dump(mode='json')
    finish_command(db, actor.id, operation, idempotency_key, body_hash, result)
    return result


@router.post(
    '/candidates/{id}/link-dossier',
    response_model=dto.CandidateOut,
    status_code=200,
    operation_id='linkCandidateDossier',
    dependencies=[Depends(check_csrf)],
)
def link_candidate_dossier(
    id: UUID, body: dto.CandidateDossierLink, request: Request, actor: Actor, db: DB, idempotency_key: Key
):
    analyst(actor)
    operation = 'linkCandidateDossier'
    previous, body_hash = begin_command(
        db, actor.id, operation, idempotency_key, {'candidate_id': str(id), **body.model_dump(mode='json')}
    )
    if previous:
        return previous
    candidate = candidate_locked(db, id)
    revision(candidate.revision, body.expected_revision)
    if candidate.property_id:
        raise HTTPException(409, 'Кандидат уже связан с досье. Обновите карточку.')
    prop = db.scalar(select(Property).where(Property.id == body.property_id).with_for_update())
    if not prop:
        raise HTTPException(404, 'Досье объекта не найдено')
    revision(prop.revision, body.expected_property_revision)
    if candidate.is_demo != prop.is_demo or dto.normalized(candidate.city) != dto.normalized(prop.city):
        raise HTTPException(422, 'Досье должно относиться к тому же городу и режиму DEMO/реальных данных')
    old_revision = candidate.revision
    candidate.property_id = prop.id
    candidate.property_link_kind = 'LINKED'
    candidate.revision += 1
    provenance = dossier_provenance(db, candidate, prop, old_revision)
    audit(db, request, actor, candidate, 'MONITORING_DOSSIER_LINKED', old_revision, body.reason, provenance)
    # Relation metadata does not revise the dossier's facts or historical risk snapshots.
    audit(db, request, actor, prop, 'PROPERTY_CANDIDATE_LINKED', prop.revision, body.reason, provenance)
    db.flush()
    result = candidate_view(db, candidate).model_dump(mode='json')
    finish_command(db, actor.id, operation, idempotency_key, body_hash, result)
    return result


def dossier_provenance(db, candidate, prop, old_revision):
    observations = db.scalars(select(MonitoringObservation).where(MonitoringObservation.candidate_id == candidate.id))
    return {
        'candidate_id': str(candidate.id),
        'candidate_revision': old_revision,
        'candidate_identity': {key: getattr(candidate, key) for key in ('name', 'city', 'address', 'phase', 'is_demo')},
        'property_id': str(prop.id),
        'property_revision': prop.revision,
        'developer_id': str(prop.developer_id),
        'developer_name': prop.developer.name,
        'developer_bin': prop.developer.bin,
        'property_identity': {key: getattr(prop, key) for key in ('name', 'city', 'address', 'level', 'is_demo')},
        'observations': [
            {
                'id': str(row.id),
                'advertisement_id': str(row.advertisement_id),
                'advertisement_revision': row.advertisement_revision,
            }
            for row in observations
        ],
    }


@router.post(
    '/candidates/{id}/unlink-dossier',
    response_model=dto.CandidateOut,
    operation_id='unlinkCandidateDossier',
    dependencies=[Depends(check_csrf)],
)
def unlink_candidate_dossier(
    id: UUID, body: dto.CandidateDossierUnlink, request: Request, actor: Actor, db: DB, idempotency_key: Key
):
    analyst(actor)
    operation = 'unlinkCandidateDossier'
    previous, body_hash = begin_command(
        db, actor.id, operation, idempotency_key, {'candidate_id': str(id), **body.model_dump(mode='json')}
    )
    if previous:
        return previous
    candidate = candidate_locked(db, id)
    revision(candidate.revision, body.expected_revision)
    if candidate.property_link_kind != 'LINKED' or candidate.property_id != body.property_id:
        raise HTTPException(
            409, 'Отменить можно только текущую связь с существующим досье. Происхождение создания сохраняется.'
        )
    prop = db.scalar(select(Property).where(Property.id == body.property_id).with_for_update())
    if not prop:
        raise HTTPException(404, 'Досье объекта не найдено')
    revision(prop.revision, body.expected_property_revision)
    old_revision = candidate.revision
    provenance = dossier_provenance(db, candidate, prop, old_revision)
    provenance['before_property_id'] = str(prop.id)
    previous_link = db.scalar(
        select(AuditEvent)
        .where(
            AuditEvent.entity_type == 'monitoring_candidates',
            AuditEvent.entity_id == id,
            AuditEvent.action == 'MONITORING_DOSSIER_LINKED',
        )
        .order_by(AuditEvent.occurred_at.desc(), AuditEvent.id.desc())
        .limit(1)
    )
    provenance['previous_link_event_id'] = str(previous_link.id) if previous_link else None
    candidate.property_id = None
    candidate.property_link_kind = None
    candidate.revision += 1
    audit(db, request, actor, candidate, 'MONITORING_DOSSIER_UNLINKED', old_revision, body.reason, provenance)
    audit(db, request, actor, prop, 'PROPERTY_CANDIDATE_UNLINKED', prop.revision, body.reason, provenance)
    db.flush()
    result = candidate_view(db, candidate).model_dump(mode='json')
    finish_command(db, actor.id, operation, idempotency_key, body_hash, result)
    return result


@router.get(
    '/candidates/{id}/dossier-history', response_model=Page[AuditEventOut], operation_id='listCandidateDossierHistory'
)
def candidate_dossier_history(
    id: UUID, actor: Actor, db: DB, page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100)
):
    if not db.get(MonitoringCandidate, id):
        raise HTTPException(404, 'Кандидат объекта не найден')
    query = (
        select(AuditEvent)
        .where(
            AuditEvent.entity_type == 'monitoring_candidates',
            AuditEvent.entity_id == id,
            AuditEvent.action.in_(
                ['MONITORING_DOSSIER_CREATED', 'MONITORING_DOSSIER_LINKED', 'MONITORING_DOSSIER_UNLINKED']
            ),
        )
        .order_by(AuditEvent.occurred_at.desc(), AuditEvent.id.desc())
    )

    def views(rows):
        rows = list(rows)
        names = dict(
            db.execute(select(User.id, User.display_name).where(User.id.in_({row.actor_id for row in rows}))).all()
        )
        return [
            AuditEventOut.model_validate(row).model_copy(update={'actor_display_name': names.get(row.actor_id)})
            for row in rows
        ]

    return page_result(db, query, page, page_size, views)


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
    property_id: UUID | None = None,
):
    query = filtered(select(MonitoringCandidate), MonitoringCandidate, is_demo, q)
    if property_id is not None:
        query = query.where(MonitoringCandidate.property_id == property_id)
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
