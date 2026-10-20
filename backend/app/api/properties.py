from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Query
from sqlalchemy import String, column, func, or_, select
from sqlalchemy.dialects.postgresql import distinct_on
from sqlalchemy.orm import aliased
from starlette.exceptions import HTTPException

from app import dto
from app.analysis_dto import AuditEventOut
from app.dependencies import DB, Actor, get_property
from app.models import (
    Advertisement,
    AuditEvent,
    Developer,
    ExtractionResult,
    MonitoringCandidate,
    Property,
    Signal,
    User,
    utcnow,
)
from app.signals import signal_is_stale, signal_view
from app.views import factor_views, legal_views, property_view, unknown_information

router = APIRouter()

PROPERTY_SEARCH_DESCRIPTION = (
    'Case-insensitive literal substring in property name, address, each saved alias, developer name or BIN. '
    'Outer whitespace is trimmed. Percent, underscore and backslash are literal characters, not wildcards. '
    'Search does not confirm identity or legal applicability.'
)
PROPERTY_ORDER_DESCRIPTION = (
    'name: name then ID (default). work_priority: across all filtered properties before pagination, '
    'PENDING legal basis first, UNKNOWN or REJECTED next, all other legal statuses last; '
    'within each group missing review date first, then oldest last_reviewed_at, '
    'then current server risk score descending, then ID ascending. '
    'This is work ordering, not a legal conclusion or a deadline.'
)


def property_work_priority(row: dto.PropertyOut):
    """Order current server views without changing their risk or legal status."""
    status = row.legal_verification_status
    action_order = {'PENDING': 0, 'UNKNOWN': 1, 'REJECTED': 1}.get(status, 2)
    return (action_order, row.last_reviewed_at is not None, row.last_reviewed_at, -row.risk.score, row.id.int)


def filtered_properties(db, city=None, zone=None, legal_status=None, q=None, is_demo=None):
    query = select(Property).order_by(Property.name, Property.id)
    if city:
        query = query.where(Property.city == city)
    if is_demo is not None:
        query = query.where(Property.is_demo == is_demo)
    if q and q.strip():
        escaped = q.strip().replace('\\', '\\\\').replace('%', '\\%').replace('_', '\\_')
        pattern = f'%{escaped}%'
        # EXISTS preserves one row per property when several aliases match.
        aliases = (
            func.json_array_elements_text(Property.aliases)
            .table_valued(column('value', String))
            .render_derived(name='property_alias')
        )
        alias_match = (
            select(1)
            .select_from(aliases)
            .where(aliases.c.value.ilike(pattern, escape='\\'))
            .correlate(Property)
            .exists()
        )
        query = query.where(
            or_(
                Property.name.ilike(pattern, escape='\\'),
                Property.address.ilike(pattern, escape='\\'),
                alias_match,
                Property.developer.has(
                    or_(Developer.name.ilike(pattern, escape='\\'), Developer.bin.ilike(pattern, escape='\\'))
                ),
            )
        )
    result = [property_view(row, factor_views(db, row.id)) for row in db.scalars(query)]
    return [
        row
        for row in result
        if (zone is None or row.risk.zone == zone)
        and (legal_status is None or row.legal_verification_status == legal_status)
    ]


@router.get('/api/v1/properties', response_model=dto.Page[dto.PropertyOut], operation_id='listProperties')
def properties(
    actor: Actor,
    db: DB,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    city: str | None = None,
    zone: dto.RiskZone | None = None,
    legal_status: dto.LegalStatus | None = None,
    q: str | None = Query(None, max_length=300, description=PROPERTY_SEARCH_DESCRIPTION),
    is_demo: bool | None = None,
    order: Literal['name', 'work_priority'] = Query('name', description=PROPERTY_ORDER_DESCRIPTION),
):
    rows = filtered_properties(db, city, zone, legal_status, q, is_demo)
    if order == 'work_priority':
        rows.sort(key=property_work_priority)
    start = (page - 1) * page_size
    return {'items': rows[start : start + page_size], 'page': page, 'page_size': page_size, 'total': len(rows)}


@router.get('/api/v1/properties/{id}', response_model=dto.PropertyDetailOut, operation_id='getProperty')
def property_detail(id: UUID, actor: Actor, db: DB):
    row = get_property(db, id)
    factors = factor_views(db, id)
    return {
        'property': property_view(row, factors),
        'source_candidate_id': db.scalar(
            select(MonitoringCandidate.id).where(
                MonitoringCandidate.property_id == id, MonitoringCandidate.property_link_kind == 'CREATED'
            )
        ),
        'linked_candidate_count': db.scalar(
            select(func.count())
            .select_from(MonitoringCandidate)
            .where(MonitoringCandidate.property_id == id, MonitoringCandidate.property_link_kind == 'LINKED')
        ),
        'legal_bases': legal_views(db, id),
        'factors': factors,
        'advertisement_ids': list(
            db.scalars(select(Advertisement.id).where(Advertisement.confirmed_property_id == id))
        ),
        'unknown_information': unknown_information(row),
    }


@router.get(
    '/api/v1/properties/{id}/provenance',
    response_model=AuditEventOut | None,
    operation_id='getPropertyProvenance',
    description=(
        'Return the latest saved SOURCE_PACKAGE_IMPORTED event for this exact property entity, '
        'or null when none exists. Independent of audit pagination; read-only and not an identity confirmation.'
    ),
)
def property_provenance(id: UUID, actor: Actor, db: DB):
    get_property(db, id)
    event = db.scalar(
        select(AuditEvent)
        .where(
            AuditEvent.entity_type == 'properties',
            AuditEvent.entity_id == id,
            AuditEvent.action == 'SOURCE_PACKAGE_IMPORTED',
        )
        .order_by(AuditEvent.occurred_at.desc(), AuditEvent.id)
        .limit(1)
    )
    if event is None:
        return None
    author = db.get(User, event.actor_id)
    return AuditEventOut.model_validate(event).model_copy(
        update={'actor_display_name': author.display_name if author else None}
    )


@router.get(
    '/api/v1/properties/{id}/structure',
    response_model=dto.PropertyStructureOut,
    operation_id='getPropertyStructure',
    description=(
        'Read saved parent_id relationships only: ancestors from root to parent, direct children, '
        'and other children of the same non-null parent. Children and siblings have independent pages '
        'ordered by name and ID. References do not inherit risk, legal bases or documents. '
        'A cycle, missing ancestor or more than 16 ancestor levels returns 409.'
    ),
)
def property_structure(
    id: UUID,
    actor: Actor,
    db: DB,
    children_page: int = Query(1, ge=1),
    siblings_page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
):
    row = get_property(db, id)
    ancestors = []
    seen = {row.id}
    parent_id = row.parent_id
    # Bound reads even if externally imported relationships are malformed.
    while parent_id is not None:
        if parent_id in seen or len(ancestors) >= 16:
            raise HTTPException(409, 'Не удалось прочитать структуру: цикл или больше 16 уровней')
        parent = db.get(Property, parent_id)
        if parent is None:
            raise HTTPException(409, 'Не удалось прочитать структуру: родительский объект не найден')
        seen.add(parent.id)
        ancestors.append(dto.PropertyReferenceOut.model_validate(parent))
        parent_id = parent.parent_id

    def related_page(condition, page):
        query = select(Property).where(condition)
        total = db.scalar(select(func.count()).select_from(query.subquery()))
        items = db.scalars(query.order_by(Property.name, Property.id).offset((page - 1) * page_size).limit(page_size))
        return {'items': list(items), 'page': page, 'page_size': page_size, 'total': total}

    return {
        'ancestors': list(reversed(ancestors)),
        'children': related_page(Property.parent_id == id, children_page),
        # Root objects are not siblings merely because they all lack a parent.
        'siblings': related_page((Property.parent_id == row.parent_id) & (Property.id != id), siblings_page)
        if row.parent_id is not None
        else {'items': [], 'page': siblings_page, 'page_size': page_size, 'total': 0},
    }


@router.get('/api/v1/properties/{id}/risk', response_model=dto.RiskDetailOut, operation_id='getPropertyRisk')
def property_risk(id: UUID, actor: Actor, db: DB, as_of: dto.AwareDatetime | None = None):
    if as_of is not None:
        raise HTTPException(400, 'Исторический расчёт ещё не реализован; доступна текущая оценка')
    row = get_property(db, id)
    factors = factor_views(db, id)
    return {
        'property_id': id,
        'summary': property_view(row, factors).risk,
        'factors': factors,
        'unknown_information': unknown_information(row),
    }


@router.get('/api/v1/dashboard/summary', operation_id='getDashboardSummary')
def dashboard(
    actor: Actor,
    db: DB,
    city: str | None = None,
    zone: dto.RiskZone | None = None,
    legal_status: dto.LegalStatus | None = None,
    q: str | None = Query(None, max_length=300, description=PROPERTY_SEARCH_DESCRIPTION),
    is_demo: bool | None = None,
    date_from: Annotated[dto.AwareDatetime | None, Query(alias='from')] = None,
    date_to: Annotated[dto.AwareDatetime | None, Query(alias='to')] = None,
):
    q = (q or '').strip() or None
    rows = filtered_properties(db, city, zone, legal_status, q, is_demo)
    query = select(Advertisement.id)
    if any(value is not None for value in [city, zone, legal_status, q]):
        query = query.where(Advertisement.confirmed_property_id.in_([row.id for row in rows]))
    if is_demo is not None:
        query = query.where(Advertisement.is_demo == is_demo)
    if date_from:
        query = query.where(Advertisement.captured_at >= date_from)
    if date_to:
        query = query.where(Advertisement.captured_at < date_to)
    latest = db.scalars(
        select(ExtractionResult)
        .where(ExtractionResult.advertisement_id.in_(query))
        .ext(distinct_on(ExtractionResult.advertisement_id))
        .order_by(ExtractionResult.advertisement_id, ExtractionResult.created_at.desc(), ExtractionResult.id)
    )
    pending = sum(h['review_status'] == 'PENDING' for extraction in latest for h in extraction.hypotheses)
    newer = aliased(Signal)
    # A superseded draft can never accept a decision. Avoid loading its snapshot;
    # the remaining candidates use the same current-state comparison as /signals.
    pending_candidates = db.scalars(
        select(Signal).where(
            Signal.state == 'DRAFT',
            Signal.property_id.in_([row.id for row in rows]),
            ~select(1)
            .where(newer.property_id == Signal.property_id, newer.version > Signal.version)
            .correlate(Signal)
            .exists(),
        )
    )
    pending_signals = sum(not signal_is_stale(db, signal) for signal in pending_candidates)
    return {
        'property_count': len(rows),
        'zones': {value: sum(row.risk.zone == value for row in rows) for value in ['GREEN', 'YELLOW', 'RED']},
        'new_advertisements': db.scalar(
            select(func.count()).select_from(query.where(Advertisement.status == 'NEW').subquery())
        ),
        'pending_hypotheses': pending,
        'pending_signals': pending_signals,
        'unknown_legal_bases': sum(row.legal_verification_status in {'UNKNOWN', 'PENDING'} for row in rows),
        'latest_signals': [
            signal_view(db, item).model_dump(mode='json')
            for item in db.scalars(
                select(Signal)
                .where(Signal.property_id.in_([row.id for row in rows]))
                .order_by(Signal.created_at.desc())
                .limit(5)
            )
        ],
        'calculated_at': utcnow().isoformat(),
    }
