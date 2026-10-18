from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Query
from sqlalchemy import String, column, func, or_, select
from sqlalchemy.dialects.postgresql import distinct_on
from starlette.exceptions import HTTPException

from app import dto
from app.dependencies import DB, Actor, get_property
from app.models import Advertisement, Developer, ExtractionResult, Property, Signal, utcnow
from app.signals import signal_view
from app.views import factor_views, legal_views, property_view, unknown_information

router = APIRouter()

PROPERTY_SEARCH_DESCRIPTION = (
    'Case-insensitive literal substring in property name, address, each saved alias, developer name or BIN. '
    'Outer whitespace is trimmed. Percent, underscore and backslash are literal characters, not wildcards. '
    'Search does not confirm identity or legal applicability.'
)


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
):
    rows = filtered_properties(db, city, zone, legal_status, q, is_demo)
    start = (page - 1) * page_size
    return {'items': rows[start : start + page_size], 'page': page, 'page_size': page_size, 'total': len(rows)}


@router.get('/api/v1/properties/{id}', response_model=dto.PropertyDetailOut, operation_id='getProperty')
def property_detail(id: UUID, actor: Actor, db: DB):
    row = get_property(db, id)
    factors = factor_views(db, id)
    return {
        'property': property_view(row, factors),
        'legal_bases': legal_views(db, id),
        'factors': factors,
        'advertisement_ids': list(
            db.scalars(select(Advertisement.id).where(Advertisement.confirmed_property_id == id))
        ),
        'unknown_information': unknown_information(row),
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
    return {
        'property_count': len(rows),
        'zones': {value: sum(row.risk.zone == value for row in rows) for value in ['GREEN', 'YELLOW', 'RED']},
        'new_advertisements': db.scalar(
            select(func.count()).select_from(query.where(Advertisement.status == 'NEW').subquery())
        ),
        'pending_hypotheses': pending,
        'pending_signals': db.scalar(
            select(func.count())
            .select_from(Signal)
            .where(Signal.state == 'DRAFT', Signal.property_id.in_([row.id for row in rows]))
        ),
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
