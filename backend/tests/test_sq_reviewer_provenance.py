"""Frozen review attribution with honest legacy IDs and unchanged stale semantics (SQ-11)."""

from copy import deepcopy
from datetime import datetime
from uuid import UUID, uuid4

import pytest
from pydantic import ValidationError
from sqlalchemy import event
from test_analysis import contract
from test_legal_bases import create as create_basis
from test_legal_bases import post, property_id, review_body
from test_signals import create as create_signal
from test_signals import source
from test_sq_historical_context import template_payload

from app.analysis_dto import RiskFactorReview
from app.dossier_report import dossier_report
from app.dossier_report_render import report_html
from app.models import Property, Signal, User
from app.pdf_render import signal_html
from app.signals import build_snapshot, comparable_snapshot


def test_new_signal_freezes_reviewers_and_profile_rename_does_not_rewrite_or_stale(signed, settings):
    prop = property_id(signed)
    _, _, actor_id = source(signed, settings, prop)
    basis, _ = create_basis(signed, prop)
    reviewed = post(signed, f'/legal-bases/{basis["id"]}/review', review_body(basis))
    assert reviewed.status_code == 200, reviewed.text
    created = create_signal(signed, prop)
    assert created.status_code == 201, created.text
    path = f'/api/v1/signals/{created.json()["id"]}'
    original = signed.get(path).json()
    contract(original, 'SignalDetail')
    expected_name = signed.get('/api/v1/auth/me').json()['display_name']
    for key in ['factors', 'legal_bases']:
        saved = original['snapshot'][key][0]
        assert saved['reviewed_by'] == str(actor_id)
        assert saved['reviewed_by_details']['id'] == str(actor_id)
        assert saved['reviewed_by_details']['display_name'] == expected_name
        assert saved['reviewed_at']
        assert 'password_hash' not in saved['reviewed_by_details']
    with signed.app.state.sessions.begin() as db:
        db.get(User, actor_id).display_name = 'DEMO новое текущее имя · жаңа есім'
    try:
        changed = signed.get(path).json()
        assert changed['signal']['is_stale'] is False
        assert changed['snapshot'] == original['snapshot']
        assert changed['decisions'] == original['decisions']
        for key in ['factors', 'legal_bases']:
            assert changed['snapshot'][key][0]['reviewed_by_details']['display_name'] == expected_name
        with signed.app.state.sessions() as db:
            assert db.get(Signal, UUID(created.json()['id'])).snapshot == original['snapshot']
    finally:
        with signed.app.state.sessions.begin() as db:
            db.get(User, actor_id).display_name = expected_name


def test_legacy_signal_keeps_raw_json_and_reads_never_resolve_reviewer_profiles(signed, settings):
    prop = property_id(signed)
    source(signed, settings, prop)
    response = create_signal(signed, prop)
    assert response.status_code == 201, response.text
    signal_id = UUID(response.json()['id'])
    with signed.app.state.sessions.begin() as db:
        row = db.get(Signal, signal_id)
        original = deepcopy(row.snapshot)
        for record in [*original['factors'], *original['legal_bases']]:
            record.pop('reviewed_by_details', None)
        row.snapshot = original
    with signed.app.state.sessions() as db:
        queries = []

        def record_query(_connection, _cursor, statement, _parameters, _context, _many):
            queries.append(statement.lower())

        engine = db.get_bind()
        event.listen(engine, 'before_cursor_execute', record_query)
        try:
            current = build_snapshot(db, db.get(Property, UUID(prop)))
        finally:
            event.remove(engine, 'before_cursor_execute', record_query)
        assert current.factors[0].reviewed_by_details is None
        assert all('from users' not in statement for statement in queries)
    for _ in range(2):
        detail = signed.get(f'/api/v1/signals/{signal_id}').json()
        assert detail['signal']['is_stale'] is False
        assert detail['snapshot']['factors'][0]['reviewed_by_details'] is None
        assert detail['snapshot']['factors'][0]['reviewed_by'] == original['factors'][0]['reviewed_by']
    with signed.app.state.sessions() as db:
        assert db.get(Signal, signal_id).snapshot == original


@pytest.mark.parametrize('language', ['ru', 'kk'])
def test_current_dossier_pdf_keeps_reviewer_id_and_separate_assessment_and_review_dates(signed, settings, language):
    prop = property_id(signed)
    _, _, actor_id = source(signed, settings, prop)
    basis, _ = create_basis(signed, prop)
    reviewed = post(signed, f'/legal-bases/{basis["id"]}/review', review_body(basis))
    assert reviewed.status_code == 200, reviewed.text
    with signed.app.state.sessions() as db:
        report = dossier_report(db, UUID(prop), ('risk', 'documents'), language)
    records = {section['id']: section['rows'][0] for section in report['sections']}
    for section in ['risk', 'documents']:
        assert records[section]['reviewed_by'] == str(actor_id)
        assert records[section]['reviewed_at']
        assert 'reviewed_by_details' not in records[section]
    assert records['risk']['as_of']
    assert datetime.fromisoformat(records['documents']['verification_as_of']) == datetime.fromisoformat(
        reviewed.json()['verification_as_of'].replace('Z', '+00:00')
    )
    document = report_html(report)
    assert document.count(str(actor_id)) == 2
    assert ('Кто принял решение (ID)' if language == 'ru' else 'Шешімді қабылдаған (ID)') in document


@pytest.mark.parametrize('section', ['factors', 'legal_bases'])
def test_identity_enrichment_does_not_hide_meaningful_review_changes(section):
    legacy = {
        'property': {'risk': {'as_of': 'old'}},
        section: [{'reviewed_by': 'historical-id', 'reviewed_at': 'decision-time', 'as_of': 'assessment-date'}],
    }
    original = deepcopy(legacy)
    enriched = deepcopy(legacy)
    enriched[section][0]['reviewed_by_details'] = {'display_name': 'DEMO имя в снимке'}
    assert comparable_snapshot(legacy) == comparable_snapshot(enriched)
    assert legacy == original
    for key in ['reviewed_by', 'reviewed_at', 'as_of']:
        changed = deepcopy(enriched)
        changed[section][0][key] = 'changed'
        assert comparable_snapshot(legacy) != comparable_snapshot(changed)


def test_pdf_uses_saved_reviewer_name_and_id_for_both_reviewed_records_and_legacy_fallback():
    payload = template_payload()
    historical_id = str(uuid4())
    name = 'DEMO Ә Ғ Қ Ң Ө Ұ Ү Һ І <script>alert(1)</script>'
    review = {
        'reviewed_by': historical_id,
        'reviewed_by_details': {'display_name': name},
        'reviewed_at': '2026-10-02T12:00:00Z',
    }
    payload['snapshot']['factors'] = [
        {
            'id': str(uuid4()),
            'code': 'R4',
            'status': 'CONFIRMED',
            'weight': 15,
            'as_of': '2026-09-01T12:00:00Z',
            'reason': 'DEMO отдельная дата оценки',
            'evidence_ids': [],
            **review,
        }
    ]
    payload['snapshot']['legal_bases'] = [
        {
            'id': str(uuid4()),
            'mechanism': 'KZHK_GUARANTEE',
            'verification_status': 'VERIFIED_VALID',
            'issuer': 'DEMO issuer',
            'scope_description': 'DEMO очередь',
            'verification_as_of': '2026-09-03T12:00:00Z',
            **review,
        }
    ]
    document = signal_html(payload)
    assert document.count(historical_id) == 2
    assert document.count('DEMO Ә Ғ Қ Ң Ө Ұ Ү Һ І &lt;script&gt;') == 2
    assert '<script>' not in document
    assert '2026-09-01T12:00:00Z' in document
    assert '2026-09-03T12:00:00Z' in document
    assert document.count('2026-10-02T12:00:00Z') == 2
    for record in [*payload['snapshot']['factors'], *payload['snapshot']['legal_bases']]:
        record.pop('reviewed_by_details')
    legacy_document = signal_html(payload)
    assert legacy_document.count(historical_id) == 2
    assert 'DEMO Ә Ғ Қ Ң Ө Ұ Ү Һ І &lt;script&gt;' not in legacy_document


def test_reviewer_identity_is_not_accepted_from_review_input():
    with pytest.raises(ValidationError):
        RiskFactorReview.model_validate(
            {
                'expected_revision': 1,
                'status': 'REJECTED',
                'as_of': '2026-10-01T12:00:00Z',
                'evidence_ids': [],
                'reason': 'DEMO проверка',
                'reviewed_by_details': {'display_name': 'forged'},
            }
        )
