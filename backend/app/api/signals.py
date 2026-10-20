from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import String, case, cast, literal, or_, select
from starlette.exceptions import HTTPException

from app.api.analysis import Key, analyst, audit, revision
from app.api.reviews import property_locked
from app.commands import begin_command, finish_command
from app.dependencies import DB, Actor, check_csrf
from app.dto import Page, UserOut
from app.models import Property, Signal, utcnow
from app.signal_dto import SignalCreate, SignalDecision, SignalDecisionRequest, SignalDetail, SignalOut, SignalState
from app.signals import build_snapshot, latest_signal, signal_detail, signal_is_stale, signal_locked, signal_view

router = APIRouter()

SIGNAL_SEARCH_DESCRIPTION = (
    'Case-insensitive literal substring in current or frozen property name, signal ID, '
    'Russian version label (for example версия 2), state code or Russian state label. '
    'Outer whitespace is trimmed; percent, underscore and backslash are literal. '
    'Search and other filters apply before pagination; snapshots and decisions are never changed.'
)
SIGNAL_STATE_LABELS = {
    'DRAFT': 'Ожидает решения',
    'CONFIRMED': 'Подтверждён аналитиком',
    'RETURNED': 'Возвращён на доработку',
}


@router.get('/api/v1/signals', response_model=Page[SignalOut], operation_id='listSignals')
def list_signals(
    actor: Actor,
    db: DB,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    property_id: UUID | None = None,
    state: SignalState | None = None,
    is_stale: bool | None = None,
    q: str | None = Query(None, max_length=300, description=SIGNAL_SEARCH_DESCRIPTION),
):
    query = select(Signal).order_by(Signal.created_at.desc(), Signal.id)
    if property_id:
        query = query.where(Signal.property_id == property_id)
    if state:
        query = query.where(Signal.state == state)
    if q and q.strip():
        escaped = q.strip().replace('\\', '\\\\').replace('%', '\\%').replace('_', '\\_')
        pattern = f'%{escaped}%'
        current_name = (
            select(1)
            .where(Property.id == Signal.property_id, Property.name.ilike(pattern, escape='\\'))
            .correlate(Signal)
            .exists()
        )
        state_label = case(SIGNAL_STATE_LABELS, value=Signal.state, else_=Signal.state)
        version_label = literal('версия ') + cast(Signal.version, String)
        query = query.where(
            or_(
                current_name,
                Signal.snapshot['property']['name'].as_string().ilike(pattern, escape='\\'),
                cast(Signal.id, String).ilike(pattern, escape='\\'),
                version_label.ilike(pattern, escape='\\'),
                Signal.state.ilike(pattern, escape='\\'),
                state_label.ilike(pattern, escape='\\'),
            )
        )
    rows = [signal_view(db, row) for row in db.scalars(query)]
    if is_stale is not None:
        rows = [row for row in rows if row.is_stale == is_stale]
    start = (page - 1) * page_size
    return Page(items=rows[start : start + page_size], page=page, page_size=page_size, total=len(rows))


@router.post(
    '/api/v1/signals',
    response_model=SignalOut,
    status_code=201,
    operation_id='createSignal',
    dependencies=[Depends(check_csrf)],
)
def create_signal(body: SignalCreate, request: Request, actor: Actor, db: DB, idempotency_key: Key):
    analyst(actor)
    previous, digest = begin_command(db, actor.id, 'createSignal', idempotency_key, body.model_dump(mode='json'))
    if previous:
        return previous
    prop = property_locked(db, body.property_id)
    revision(prop.revision, body.expected_risk_revision)
    latest = latest_signal(db, prop.id)
    if (latest and latest.id != body.previous_signal_id) or (not latest and body.previous_signal_id):
        raise HTTPException(409, 'Новая версия должна продолжать последний сигнал этого объекта')
    snapshot = build_snapshot(db, prop, request.app.state.settings.storage_root)
    row = Signal(
        id=uuid4(),
        property_id=prop.id,
        previous_signal_id=body.previous_signal_id,
        version=latest.version + 1 if latest else 1,
        revision=1,
        state='DRAFT',
        snapshot=snapshot.model_dump(mode='json'),
        decisions=[],
        created_by=actor.id,
        created_by_details=UserOut.model_validate(actor).model_dump(mode='json'),
        pdf_state='NOT_REQUESTED',
    )
    db.add(row)
    db.flush()
    audit(
        db,
        request,
        actor,
        row,
        'SIGNAL_CREATED',
        reason='Создан неизменяемый снимок для ручного решения',
        details={'property_id': str(prop.id), 'version': row.version, 'risk_revision': prop.revision},
    )
    result = signal_view(db, row, prop=prop, current=snapshot).model_dump(mode='json')
    finish_command(db, actor.id, 'createSignal', idempotency_key, digest, result)
    return result


@router.get('/api/v1/signals/{id}', response_model=SignalDetail, operation_id='getSignal')
def get_signal(id: UUID, actor: Actor, db: DB):
    row = db.get(Signal, id)
    if not row:
        raise HTTPException(404, 'Сигнал не найден')
    return signal_detail(db, row)


@router.post(
    '/api/v1/signals/{id}/decision',
    response_model=SignalDetail,
    operation_id='decideSignal',
    dependencies=[Depends(check_csrf)],
)
def decide_signal(id: UUID, body: SignalDecisionRequest, request: Request, actor: Actor, db: DB, idempotency_key: Key):
    analyst(actor)
    operation = f'decideSignal:{id}'
    previous, digest = begin_command(db, actor.id, operation, idempotency_key, body.model_dump(mode='json'))
    if previous:
        return previous
    initial = db.get(Signal, id)
    if not initial:
        raise HTTPException(404, 'Сигнал не найден')
    # Every signal command takes the property first, matching factor/document review.
    prop = property_locked(db, initial.property_id)
    row = signal_locked(db, id)
    revision(row.revision, body.expected_revision)
    revision(prop.revision, body.expected_risk_revision)
    if row.state != 'DRAFT':
        raise HTTPException(409, 'Решение уже принято. Для повторной проверки создайте новую версию.')
    current = build_snapshot(db, prop, request.app.state.settings.storage_root)
    if signal_is_stale(db, row, prop, current):
        raise HTTPException(409, 'Сведения изменились. Создайте новый снимок перед решением.')
    decision = SignalDecision(
        id=uuid4(),
        action=body.action,
        actor=UserOut.model_validate(actor),
        decided_at=utcnow(),
        reason=body.reason,
    )
    old_revision = row.revision
    row.decisions = [*row.decisions, decision.model_dump(mode='json')]
    row.state = 'CONFIRMED' if body.action == 'CONFIRM' else 'RETURNED'
    row.revision += 1
    row.pdf_state = 'NOT_REQUESTED'
    row.pdf_asset_id = None
    row.pdf_job_id = None
    from app.signal_pdf import enqueue_signal_pdf

    enqueue_signal_pdf(db, row, actor, request.state.request_id)
    audit(
        db,
        request,
        actor,
        row,
        'SIGNAL_CONFIRMED' if body.action == 'CONFIRM' else 'SIGNAL_RETURNED',
        old=old_revision,
        reason=body.reason,
        details={'property_id': str(prop.id), 'decision_id': str(decision.id), 'risk_revision': prop.revision},
    )
    db.flush()
    result = signal_detail(db, row, prop=prop, current=current).model_dump(mode='json')
    finish_command(db, actor.id, operation, idempotency_key, digest, result)
    return result
