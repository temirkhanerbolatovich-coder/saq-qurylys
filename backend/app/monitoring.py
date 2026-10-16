"""Conservative, local-only monitoring decisions without changing legal risk factors."""

import hashlib
import json
from datetime import datetime

from sqlalchemy import select, text
from sqlalchemy.dialects.postgresql import distinct_on

from app import monitoring_dto as dto
from app.models import MonitoringComparison, MonitoringIncident, MonitoringIncidentComparison
from app.monitoring_dto import normalized

ALGORITHM_VERSION = 'manual-identity-demo-registry-v1'
INCIDENT_RESULTS = {'NO_MATCH_IN_APPROVED_SNAPSHOT', 'RECORD_SCOPE_OR_STATUS_CONFLICT'}


def digest(value) -> str:
    return hashlib.sha256(
        json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(',', ':')).encode()
    ).hexdigest()


def advisory_lock(db, key: str):
    lock = int.from_bytes(hashlib.sha256(key.encode()).digest()[:8], signed=True)
    db.execute(text('SELECT pg_advisory_xact_lock(:key)'), {'key': lock})


def identity_key(body: dto.CandidateCreate, is_demo: bool) -> str:
    identity = [normalized(getattr(body, key)) for key in ('name', 'city', 'address', 'phase')]
    # A name and city cannot establish that different publications refer to the same object.
    return digest([is_demo, identity, None if all(identity) else str(body.advertisement_id)])


def candidate_view(db, row):
    return candidate_views(db, [row])[0]


def candidate_views(db, rows):
    rows = list(rows)
    if not rows:
        return []
    latest = dict(
        db.execute(
            select(MonitoringComparison.candidate_id, MonitoringComparison.result)
            .where(MonitoringComparison.candidate_id.in_([row.id for row in rows]))
            .ext(distinct_on(MonitoringComparison.candidate_id))
            .order_by(
                MonitoringComparison.candidate_id, MonitoringComparison.created_at.desc(), MonitoringComparison.id
            )
        ).all()
    )
    return [dto.CandidateOut.model_validate(row).model_copy(update={'last_result': latest.get(row.id)}) for row in rows]


def evaluate(candidate, ad, snapshot, now: datetime) -> tuple[str, str, list]:
    """Return explainable preliminary results; absence is never a confirmed R1."""
    if snapshot is None:
        return 'REGISTRY_UNAVAILABLE', 'Утверждённый реестр не предоставлен. Отсутствие основания не установлено.', []
    if not candidate.address or not candidate.phase:
        return 'ENTITY_AMBIGUOUS', 'Укажите и подтвердите адрес и очередь/корпус для однозначного сопоставления.', []
    if (
        ad.published_at is None
        or ad.published_at > now
        or not snapshot.complete
        or snapshot.expires_at <= now
        or normalized(snapshot.city) != normalized(candidate.city)
        or not snapshot.coverage_from <= ad.published_at <= snapshot.coverage_until
    ):
        return (
            'COVERAGE_OR_DATE_UNKNOWN',
            'Дата публикации, актуальность или полнота охвата не позволяют сделать вывод.',
            [],
        )
    entries = [dto.RegistryEntry.model_validate(value) for value in snapshot.entries]
    same_project = [
        entry
        for entry in entries
        if normalized(entry.name) == normalized(candidate.name) and normalized(entry.city) == normalized(candidate.city)
    ]
    exact = [
        entry
        for entry in same_project
        if normalized(entry.address) == normalized(candidate.address)
        and normalized(entry.phase) == normalized(candidate.phase)
    ]
    applicable = [
        entry
        for entry in exact
        if entry.status == 'ACTIVE'
        and entry.valid_from <= ad.published_at
        and (entry.valid_until is None or ad.published_at <= entry.valid_until)
    ]
    if applicable:
        return (
            'MATCHED_APPLICABLE_RECORD',
            'Найдено применимое основание для точных адреса, очереди и даты публикации.',
            [entry.model_dump(mode='json') for entry in applicable],
        )
    if same_project:
        return (
            'RECORD_SCOPE_OR_STATUS_CONFLICT',
            'Есть запись того же проекта, но область, статус или срок документа не подтверждают это предложение.',
            [entry.model_dump(mode='json') for entry in same_project],
        )
    return (
        'NO_MATCH_IN_APPROVED_SNAPSHOT',
        'В полном DEMO-снимке для города и даты совпадение не найдено. Требуется проверка аналитика; нарушение не установлено.',
        [],
    )


def incident_event(action, state, reason, actor, now):
    return {
        'action': action,
        'state': state,
        'reason': reason,
        'actor_id': str(actor.id),
        'occurred_at': now.isoformat(),
    }


def attach_incident(db, candidate, comparison, actor, reason, now):
    """Candidate lock serializes discovery; DB uniqueness also protects active cases."""
    if comparison.result not in INCIDENT_RESULTS:
        return None, None
    row = db.scalar(
        select(MonitoringIncident)
        .where(
            MonitoringIncident.candidate_id == candidate.id,
            MonitoringIncident.rule_code == comparison.result,
            MonitoringIncident.state != 'CLOSED',
        )
        .with_for_update()
    )
    old = row.revision if row else None
    if row is None:
        row = MonitoringIncident(
            candidate_id=candidate.id,
            candidate_name=candidate.name,
            is_demo=candidate.is_demo,
            rule_code=comparison.result,
            state='OPEN',
            revision=1,
            created_at=now,
            updated_at=now,
            latest_comparison_id=comparison.id,
            history=[incident_event('CREATED', 'OPEN', reason, actor, now)],
        )
        db.add(row)
        db.flush()
    else:
        row.latest_comparison_id = comparison.id
        row.revision += 1
        row.updated_at = now
        row.history = row.history + [incident_event('COMPARISON_ADDED', row.state, reason, actor, now)]
    db.add(MonitoringIncidentComparison(incident_id=row.id, comparison_id=comparison.id))
    return row, old
