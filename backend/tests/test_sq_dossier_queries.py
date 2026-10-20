"""Actionable dashboard counts and property-scoped provenance regressions."""

from copy import deepcopy
from datetime import timedelta
from uuid import UUID, uuid4

from fastapi.testclient import TestClient
from sqlalchemy import event, func, select
from test_analysis import contract
from test_legal_bases import property_id
from test_signals import create, decide

from app.models import AuditEvent, Property, Signal, User, utcnow


def make_named_property(signed, name):
    prop = property_id(signed)
    with signed.app.state.sessions.begin() as db:
        row = db.get(Property, UUID(prop))
        row.name = name
        row.city = 'DEMO SQ query city'
    return prop


def test_dashboard_pending_signals_equals_current_draft_queue_and_preserves_conflict_guards(signed):
    prefix = 'DEMO-SQ12-' + uuid4().hex
    properties = {
        kind: make_named_property(signed, f'{prefix} {kind}')
        for kind in ['fresh', 'stale', 'superseded', 'confirmed', 'returned']
    }
    signals = {}
    for kind, prop in properties.items():
        response = create(signed, prop)
        assert response.status_code == 201, response.text
        signals[kind] = response.json()
    with signed.app.state.sessions.begin() as db:
        row = db.get(Property, UUID(properties['stale']))
        row.address += ' DEMO изменён после снимка'
        row.revision += 1
    latest = create(signed, properties['superseded'], previous=signals['superseded']['id'])
    assert latest.status_code == 201, latest.text
    assert decide(signed, signals['confirmed']).status_code == 200
    assert decide(signed, signals['returned'], action='RETURN').status_code == 200
    with signed.app.state.sessions() as db:
        before = {
            row.id: (deepcopy(row.snapshot), deepcopy(row.decisions), row.revision)
            for row in db.scalars(
                select(Signal).where(Signal.property_id.in_([UUID(value) for value in properties.values()]))
            )
        }
        audit_count = db.scalar(select(func.count()).select_from(AuditEvent))
    queue = signed.get('/api/v1/signals', params={'state': 'DRAFT', 'is_stale': 'false', 'q': prefix}).json()
    assert queue['total'] == 2
    assert {row['id'] for row in queue['items']} == {signals['fresh']['id'], latest.json()['id']}
    summary = signed.get('/api/v1/dashboard/summary', params={'q': prefix}).json()
    assert summary['property_count'] == 5
    assert summary['pending_signals'] == queue['total']
    stale_queue = signed.get('/api/v1/signals', params={'state': 'DRAFT', 'is_stale': 'true', 'q': prefix}).json()
    assert {row['id'] for row in stale_queue['items']} == {signals['stale']['id'], signals['superseded']['id']}
    for kind in ['stale', 'superseded', 'confirmed', 'returned']:
        assert decide(signed, signals[kind]).status_code == 409
    assert (
        signed.get('/api/v1/dashboard/summary', params={'q': prefix, 'is_demo': 'false'}).json()['pending_signals'] == 0
    )
    assert signed.get('/api/v1/dashboard/summary', params={'q': properties['fresh']}).json()['pending_signals'] == 0
    with signed.app.state.sessions() as db:
        for signal_id, original in before.items():
            row = db.get(Signal, signal_id)
            assert (row.snapshot, row.decisions, row.revision) == original
        assert db.scalar(select(func.count()).select_from(AuditEvent)) == audit_count


def import_event(actor_id, prop, *, at, source, entity_type='properties', action='SOURCE_PACKAGE_IMPORTED'):
    return AuditEvent(
        id=uuid4(),
        actor_id=actor_id,
        entity_type=entity_type,
        entity_id=UUID(prop),
        occurred_at=at,
        action=action,
        reason='DEMO: сохранённый импорт, не подтверждение идентичности',
        details={'source_row': {'project': 'DEMO Сақ құрылыс', 'official_source': source}, 'identity_confirmed': False},
    )


def test_provenance_uses_latest_exact_property_import_beyond_first_hundred_audit_events(signed):
    prop, other = property_id(signed), property_id(signed)
    now = utcnow()
    actor_id = UUID(signed.get('/api/v1/auth/me').json()['id'])
    selected = import_event(actor_id, prop, at=now - timedelta(days=2), source='https://example.com/latest')
    selected_id = selected.id
    with signed.app.state.sessions.begin() as db:
        db.add(import_event(actor_id, prop, at=now - timedelta(days=3), source='https://example.com/older'))
        db.add(selected)
        db.add(import_event(actor_id, other, at=now, source='https://example.com/other'))
        db.add(
            import_event(actor_id, prop, at=now, source='https://example.com/wrong-type', entity_type='risk_factors')
        )
        db.add_all(
            import_event(
                actor_id,
                prop,
                at=now - timedelta(minutes=index),
                source='https://example.com/activity',
                action='DEMO_LATER_ACTIVITY',
            )
            for index in range(120)
        )
    audit_page = signed.get(f'/api/v1/properties/{prop}/audit?page_size=100').json()
    assert audit_page['total'] > 100
    assert all(row['id'] != str(selected_id) for row in audit_page['items'])
    with signed.app.state.sessions() as db:
        audit_count = db.scalar(select(func.count()).select_from(AuditEvent))
        original = deepcopy(db.get(AuditEvent, selected_id).details)
        engine = db.get_bind()
    statements = []

    def collect_sql(_connection, _cursor, statement, _parameters, _context, _executemany):
        if 'audit_events' in statement:
            statements.append(statement)

    event.listen(engine, 'before_cursor_execute', collect_sql)
    try:
        response = signed.get(f'/api/v1/properties/{prop}/provenance')
    finally:
        event.remove(engine, 'before_cursor_execute', collect_sql)
    assert response.status_code == 200, response.text
    data = response.json()
    contract(data, 'AuditEvent')
    assert data['id'] == str(selected_id)
    assert data['entity_id'] == prop and data['entity_type'] == 'properties'
    assert data['details']['source_row']['official_source'] == 'https://example.com/latest'
    assert data['details']['identity_confirmed'] is False
    assert len(statements) == 1 and 'LIMIT' in statements[0]
    with signed.app.state.sessions() as db:
        assert db.scalar(select(func.count()).select_from(AuditEvent)) == audit_count
        assert db.get(AuditEvent, selected_id).details == original


def test_provenance_null_and_missing_property_are_distinct_and_viewer_can_read(signed):
    prop = property_id(signed)
    path = f'/api/v1/properties/{prop}/provenance'
    assert signed.get(path).status_code == 200 and signed.get(path).json() is None
    assert signed.get(f'/api/v1/properties/{uuid4()}/provenance').status_code == 404
    assert signed.get('/api/v1/properties/not-a-uuid/provenance').status_code == 422
    with TestClient(signed.app, base_url='http://localhost:3000') as anonymous:
        assert anonymous.get(path).status_code == 401
    actor_id = UUID(signed.get('/api/v1/auth/me').json()['id'])
    with signed.app.state.sessions.begin() as db:
        db.get(User, actor_id).role = 'viewer'
    try:
        assert signed.get(path).status_code == 200 and signed.get(path).json() is None
    finally:
        with signed.app.state.sessions.begin() as db:
            db.get(User, actor_id).role = 'analyst'
