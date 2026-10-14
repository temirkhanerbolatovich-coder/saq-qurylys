from datetime import datetime, timedelta
from uuid import UUID, uuid4

import pytest
from conftest import mutation_headers
from sqlalchemy import select
from test_analysis import contract, reviewed_evidence
from test_appeal import upload as upload_appeal

from app.models import Asset, Developer, Property, User, utcnow
from app.worker import process_one

EVENT = '2020-01-10T12:00:00+05:00'
ASSESSMENT = '2020-01-11T12:00:00+05:00'
METHOD = 'DEMO: доля выполненных работ по единой ведомости объёмов'


def post(client, path, body, key=None):
    return client.post('/api/v1' + path, json=body, headers=mutation_headers(client, key))


def new_property(client):
    with client.app.state.sessions.begin() as db:
        row = Property(
            id=uuid4(),
            name=f'DEMO construction {uuid4()}',
            city='DEMO',
            address='DEMO: отдельная тестовая очередь',
            developer_id=db.scalar(select(Developer.id).limit(1)),
            stage='UNKNOWN',
            is_demo=True,
        )
        db.add(row)
        return str(row.id)


def upload(client, prop, purpose, *, content=None, **changes):
    defaults = {
        'CONSTRUCTION_STAGE': {'construction_stage': 'UNDER_CONSTRUCTION'},
        'PROGRESS_MEASUREMENT': {
            'measurement_percent': '80',
            'measurement_role': 'DECLARED',
            'comparison_key': 'DEMO корпус 1, весь объём работ',
        },
        'DELAY_DOCUMENT': {
            'delay_status': 'NOT_COMPLETED',
            'planned_completion_at': '2020-01-08T12:00:00+05:00',
        },
    }
    return client.post(
        '/api/v1/assets/upload',
        files={'file': ('construction.txt', content or f'DEMO source {uuid4()}'.encode(), 'text/plain')},
        data={
            'property_id': prop,
            'purpose': purpose,
            'event_at': EVENT,
            'source_label': 'DEMO документ стройки',
            'source_url': 'https://example.com/construction',
            'methodology': METHOD,
            'is_demo': 'true',
            **defaults[purpose],
            **changes,
        },
        headers=mutation_headers(client),
    )


def evidence_body(prop, asset, kind, **changes):
    return {
        'property_id': prop,
        'asset_id': asset['id'],
        'kind': kind,
        'description': 'DEMO: сверены оригинал, очередь и дата',
        'source_label': 'Клиентская подмена источника',
        'event_at': None,
        'is_demo': True,
        **changes,
    }


def document(client, prop, kind, *, evidence_changes=None, **source_changes):
    response = upload(client, prop, kind, **source_changes)
    assert response.status_code == 201, response.text
    asset = response.json()
    response = post(client, '/evidence', evidence_body(prop, asset, kind, **(evidence_changes or {})))
    assert response.status_code == 201, response.text
    row = response.json()
    contract(row, 'Evidence')
    assert row['source_label'] == 'DEMO документ стройки'
    return asset, row


def progress_pair(client, prop, *, first=None, second=None, same_content=False):
    common = {'content': b'DEMO same original'} if same_content else {}
    _, first_row = document(client, prop, 'PROGRESS_MEASUREMENT', **(common | (first or {})))
    _, second_row = document(
        client,
        prop,
        'PROGRESS_MEASUREMENT',
        **(common | {'measurement_role': 'VERIFIED', 'measurement_percent': '60'} | (second or {})),
    )
    return [first_row['id'], second_row['id']]


def factor(client, prop, code, ids, **changes):
    return post(
        client,
        f'/properties/{prop}/risk-factors',
        {'code': code, 'as_of': ASSESSMENT, 'evidence_ids': ids, 'reason': 'DEMO ручная проверка', **changes},
    )


def review(client, row, status='CONFIRMED', key=None, **changes):
    return post(
        client,
        f'/risk-factors/{row["id"]}/review',
        {
            'expected_revision': row['revision'],
            'status': status,
            'evidence_ids': row['evidence_ids'],
            'reason': 'DEMO проверены происхождение, сопоставимость и существенность',
            **changes,
        },
        key,
    )


def publication(client, settings, prop, *, published_at=EVENT, confirm=True):
    response = post(
        client,
        '/advertisements',
        {
            'text': f'DEMO новый дом {uuid4()}. Продажа квартир без условий оплаты.',
            'source_label': 'DEMO рекламная публикация',
            'published_at': published_at,
            'is_demo': True,
        },
    )
    assert response.status_code == 201, response.text
    ad = response.json()
    response = post(client, f'/advertisements/{ad["id"]}/analyze', {'expected_advertisement_revision': ad['revision']})
    assert response.status_code == 202, response.text
    assert process_one(client.app.state.sessions, settings)
    assert client.get(f'/api/v1/analysis-jobs/{response.json()["id"]}').json()['state'] == 'SUCCEEDED'
    ad = client.get(f'/api/v1/advertisements/{ad["id"]}').json()
    extraction = client.get(f'/api/v1/advertisements/{ad["id"]}/extractions').json()[0]
    if confirm:
        response = post(
            client,
            f'/advertisements/{ad["id"]}/matches',
            {
                'property_id': prop,
                'expected_advertisement_revision': ad['revision'],
                'action': 'CONFIRM',
                'reason': 'DEMO вручную проверены очередь и оригинал',
            },
        )
        assert response.status_code == 200, response.text
        ad = response.json()
    body = evidence_body(
        prop, ad['assets'][0], 'ADVERTISEMENT_PUBLICATION', advertisement_id=ad['id'], extraction_id=extraction['id']
    )
    return ad, extraction, body


@pytest.mark.parametrize(('code', 'weight'), [('R3', 10), ('R5', 10), ('R6', 5)])
def test_construction_factor_pending_confirm_reject_and_audit(signed, settings, code, weight):
    prop = new_property(signed)
    if code == 'R3':
        _, _, body = publication(signed, settings, prop)
        ad_evidence = post(signed, '/evidence', body)
        assert ad_evidence.status_code == 201, ad_evidence.text
        _, stage = document(signed, prop, 'CONSTRUCTION_STAGE')
        ids = [stage['id'], ad_evidence.json()['id']]
    elif code == 'R5':
        ids = progress_pair(signed, prop)
    else:
        _, delay = document(signed, prop, 'DELAY_DOCUMENT')
        ids = [delay['id']]
    response = factor(signed, prop, code, ids)
    assert response.status_code == 201, response.text
    pending = response.json()
    contract(pending, 'RiskReviewResult')
    assert pending['factor']['status'] == 'PENDING' and pending['risk']['score'] == 0
    assert factor(signed, prop, code, ids).status_code == 409
    key = uuid4()
    response = review(signed, pending['factor'], key=key)
    assert response.status_code == 200, response.text
    confirmed = response.json()
    assert confirmed['factor']['status'] == 'CONFIRMED' and confirmed['risk']['score'] == weight
    assert confirmed['risk']['confirmed_codes'] == [code]
    assert datetime.fromisoformat(confirmed['factor']['as_of']) == datetime.fromisoformat(ASSESSMENT)
    assert datetime.fromisoformat(confirmed['factor']['reviewed_at']) > datetime.fromisoformat(ASSESSMENT)
    assert review(signed, pending['factor'], key=key).json() == confirmed
    assert review(signed, pending['factor']).status_code == 409
    rejected = review(signed, confirmed['factor'], 'REJECTED')
    assert rejected.status_code == 200, rejected.text
    assert rejected.json()['factor']['status'] == 'REJECTED' and rejected.json()['risk']['score'] == 0
    events = signed.get(f'/api/v1/properties/{prop}/audit').json()['items']
    reviewed = [event for event in events if event['action'] == 'RISK_FACTOR_REVIEWED']
    assert len(reviewed) == 2
    assert any(event['details']['before']['status'] == 'CONFIRMED' for event in reviewed)


@pytest.mark.parametrize(
    ('declared', 'verified', 'status'),
    [('80', '61', 422), ('80', '60.01', 422), ('80', '60', 201), ('60', '80', 201), ('80.1', '60.1', 201)],
)
def test_r5_threshold_in_percentage_points(signed, declared, verified, status):
    prop = new_property(signed)
    ids = progress_pair(signed, prop, first={'measurement_percent': declared}, second={'measurement_percent': verified})
    response = factor(signed, prop, 'R5', ids)
    assert response.status_code == status, response.text


@pytest.mark.parametrize(
    'changes',
    [
        {'event_at': '2020-01-09T12:00:00+05:00'},
        {'methodology': 'Другая методика: доля этажей'},
        {'comparison_key': 'Другая очередь'},
        {'measurement_role': 'DECLARED'},
    ],
    ids=['different-day', 'different-method', 'different-scope', 'same-role'],
)
def test_r5_rejects_incomparable_measurements(signed, changes):
    prop = new_property(signed)
    ids = progress_pair(signed, prop, second=changes)
    assert factor(signed, prop, 'R5', ids).status_code == 422


def test_r5_calendar_day_normalization_and_duplicate_source(signed):
    prop = new_property(signed)
    ids = progress_pair(
        signed,
        prop,
        first={'event_at': '2020-01-09T20:00:00Z'},
        second={
            'event_at': '2020-01-10T16:00:00Z',
            'methodology': f' {METHOD.upper()} ',
            'comparison_key': ' DEMO КОРПУС 1, ВЕСЬ ОБЪЁМ РАБОТ ',
        },
    )
    assert factor(signed, prop, 'R5', ids).status_code == 201
    prop = new_property(signed)
    ids = progress_pair(signed, prop, same_content=True)
    assert factor(signed, prop, 'R5', ids).status_code == 422
    assert factor(signed, prop, 'R5', [ids[0], ids[0]]).status_code == 422


def test_document_scope_purpose_demo_and_client_fact_replacements(signed):
    first, other = new_property(signed), new_property(signed)
    asset = upload(signed, first, 'PROGRESS_MEASUREMENT').json()
    body = evidence_body(first, asset, 'PROGRESS_MEASUREMENT')
    assert post(signed, '/evidence', body | {'property_id': other}).status_code == 422
    assert post(signed, '/evidence', body | {'is_demo': False}).status_code == 422
    assert post(signed, '/evidence', body | {'kind': 'CONSTRUCTION_STAGE'}).status_code == 422
    response = post(
        signed,
        '/evidence',
        body
        | {
            'measurement_percent': 0,
            'measurement_role': 'VERIFIED',
            'comparison_key': 'forged',
            'methodology': 'forged',
        },
    )
    assert response.status_code == 201, response.text
    row = response.json()
    assert row['measurement_percent'] == 80 and row['measurement_role'] == 'DECLARED'
    assert row['comparison_key'] == 'DEMO корпус 1, весь объём работ' and row['methodology'] == METHOD
    assert upload(signed, first, 'CONSTRUCTION_STAGE', is_demo='false').status_code == 422
    foreign_ids = progress_pair(signed, other)
    assert factor(signed, first, 'R5', foreign_ids).status_code == 422


@pytest.mark.parametrize(
    'changes',
    [
        {'measurement_percent': '-1'},
        {'measurement_percent': '100.1'},
        {'measurement_role': ''},
        {'comparison_key': '  '},
        {'methodology': '  '},
        {'event_at': (utcnow() + timedelta(days=1)).isoformat()},
        {'construction_stage': 'UNDER_CONSTRUCTION'},
    ],
    ids=['negative', 'over-100', 'missing-role', 'blank-scope', 'blank-method', 'future', 'unrelated-fact'],
)
def test_progress_document_rejects_incomplete_or_invalid_facts(signed, changes):
    assert upload(signed, new_property(signed), 'PROGRESS_MEASUREMENT', **changes).status_code == 422


@pytest.mark.parametrize(
    ('changes', 'status'),
    [
        ({'planned_completion_at': '2020-01-10T00:00:00+05:00'}, 422),
        ({'planned_completion_at': '2020-01-11T00:00:00+05:00'}, 422),
        ({'planned_completion_at': '2020-01-09T20:00:00Z'}, 422),
        ({'actual_completion_at': '2020-01-09T12:00:00+05:00'}, 422),
        ({'delay_status': 'COMPLETED_LATE'}, 422),
        ({'delay_status': 'COMPLETED_LATE', 'actual_completion_at': '2020-01-08T15:00:00+05:00'}, 422),
        ({'delay_status': 'COMPLETED_LATE', 'actual_completion_at': '2020-01-07T12:00:00+05:00'}, 422),
        ({'delay_status': 'COMPLETED_LATE', 'actual_completion_at': '2020-01-10T13:00:00+05:00'}, 422),
        ({'delay_status': 'COMPLETED_LATE', 'actual_completion_at': '2020-01-09T12:00:00+05:00'}, 201),
        ({'planned_completion_at': '2020-01-09T18:00:00Z'}, 201),
    ],
    ids=[
        'same-day',
        'planned-after-event',
        'same-project-day-utc-boundary',
        'not-completed-with-actual',
        'late-without-actual',
        'actual-same-day',
        'actual-before-plan',
        'actual-after-event',
        'completed-late',
        'prior-project-day',
    ],
)
def test_delay_calendar_dates_and_coherent_actual_completion(signed, changes, status):
    response = upload(signed, new_property(signed), 'DELAY_DOCUMENT', **changes)
    assert response.status_code == status, response.text


def test_r6_completed_late_and_assessment_date_guards(signed):
    prop = new_property(signed)
    _, row = document(
        signed, prop, 'DELAY_DOCUMENT', delay_status='COMPLETED_LATE', actual_completion_at='2020-01-09T12:00:00+05:00'
    )
    ids = [row['id']]
    assert factor(signed, prop, 'R6', ids, as_of='2020-01-09T12:00:00+05:00').status_code == 422
    assert factor(signed, prop, 'R6', ids, as_of=(utcnow() + timedelta(days=1)).isoformat()).status_code == 422
    response = factor(signed, prop, 'R6', ids)
    assert response.status_code == 201, response.text
    pending = response.json()['factor']
    assert review(signed, pending, as_of='2020-01-09T12:00:00+05:00').status_code == 422
    response = review(signed, pending, as_of='2020-01-12T12:00:00+05:00')
    assert response.status_code == 200, response.text
    assert response.json()['risk']['score'] == 5
    assert datetime.fromisoformat(response.json()['factor']['as_of']) == datetime.fromisoformat(
        '2020-01-12T12:00:00+05:00'
    )


@pytest.mark.parametrize(
    ('published_at', 'confirm'),
    [(None, True), (EVENT, False), ((utcnow() + timedelta(days=1)).isoformat(), True)],
    ids=['unknown-publication-date', 'unconfirmed-match', 'future-publication-date'],
)
def test_r3_publication_requires_known_date_and_confirmed_match(signed, settings, published_at, confirm):
    prop = new_property(signed)
    _, _, body = publication(signed, settings, prop, published_at=published_at, confirm=confirm)
    assert post(signed, '/evidence', body).status_code == 422


@pytest.mark.parametrize(
    'changes',
    [{'construction_stage': 'COMPLETED'}, {'event_at': '2020-01-09T12:00:00+05:00'}],
    ids=['completed', 'different-day'],
)
def test_r3_requires_independent_under_construction_on_publication_day(signed, settings, changes):
    prop = new_property(signed)
    _, _, body = publication(signed, settings, prop)
    advertisement = post(signed, '/evidence', body).json()
    _, stage = document(signed, prop, 'CONSTRUCTION_STAGE', **changes)
    assert factor(signed, prop, 'R3', [advertisement['id'], stage['id']]).status_code == 422
    assert post(signed, '/evidence', body | {'kind': 'CONSTRUCTION_STAGE'}).status_code == 422


def test_r3_reuploading_advertisement_is_not_an_independent_stage_source(signed, settings):
    prop = new_property(signed)
    ad, _, body = publication(signed, settings, prop)
    advertisement = post(signed, '/evidence', body).json()
    _, stage = document(signed, prop, 'CONSTRUCTION_STAGE', content=ad['original_text'].encode())
    assert factor(signed, prop, 'R3', [advertisement['id'], stage['id']]).status_code == 422


def test_r3_new_analysis_needs_its_own_confirmed_match(signed, settings):
    prop = new_property(signed)
    ad, _, body = publication(signed, settings, prop)
    response = post(signed, f'/advertisements/{ad["id"]}/analyze', {'expected_advertisement_revision': ad['revision']})
    assert response.status_code == 202, response.text
    assert process_one(signed.app.state.sessions, settings)
    extraction = signed.get(f'/api/v1/advertisements/{ad["id"]}/extractions').json()[0]
    assert post(signed, '/evidence', body).status_code == 422
    assert post(signed, '/evidence', body | {'extraction_id': extraction['id']}).status_code == 422


@pytest.mark.parametrize('change', ['transcription', 'match'])
def test_r3_changed_source_or_match_invalidates_confirmation(signed, settings, change):
    prop = new_property(signed)
    ad, extraction, body = publication(signed, settings, prop, published_at='2020-01-09T20:00:00Z')
    advertisement = post(signed, '/evidence', body).json()
    _, stage = document(signed, prop, 'CONSTRUCTION_STAGE')
    created = factor(signed, prop, 'R3', [advertisement['id'], stage['id']]).json()['factor']
    confirmed = review(signed, created)
    assert confirmed.status_code == 200, confirmed.text
    if change == 'transcription':
        response = post(
            signed,
            f'/extractions/{extraction["id"]}/transcription',
            {
                'expected_revision': extraction['revision'],
                'text': 'DEMO исправленный исходник рекламного текста',
                'reason': 'DEMO сверка оригинала',
            },
        )
        assert response.status_code == 201, response.text
        assert post(signed, '/evidence', body).status_code == 422
    else:
        response = post(
            signed,
            f'/advertisements/{ad["id"]}/matches',
            {
                'property_id': new_property(signed),
                'expected_advertisement_revision': ad['revision'],
                'action': 'CONFIRM',
                'reason': 'DEMO исправлена очередь',
            },
        )
        assert response.status_code == 200, response.text
    risk = signed.get(f'/api/v1/properties/{prop}/risk').json()
    current = next(row for row in risk['factors'] if row['code'] == 'R3')
    assert current['status'] == 'PENDING' and risk['summary']['score'] == 0
    assert review(signed, current).status_code == 422
    events = signed.get(f'/api/v1/properties/{prop}/audit').json()['items']
    assert any(event['action'] == 'RISK_INVALIDATED' for event in events)


def test_missing_original_prevents_confirmation_but_allows_rejection(signed):
    prop = new_property(signed)
    asset, evidence = document(signed, prop, 'DELAY_DOCUMENT')
    created = factor(signed, prop, 'R6', [evidence['id']]).json()['factor']
    with signed.app.state.sessions.begin() as db:
        db.get(Asset, UUID(asset['id'])).storage_key = 'missing/construction.txt'
    assert review(signed, created).status_code == 409
    assert review(signed, created, 'REJECTED').status_code == 200


def test_payment_and_appeal_evidence_cannot_claim_unrelated_construction_facts(signed, settings):
    *_, payload = reviewed_evidence(signed, settings)
    forged = post(signed, '/evidence', payload | {'construction_stage': 'UNDER_CONSTRUCTION'})
    assert forged.status_code == 422 and 'Факты строительства' in forged.text
    asset = upload_appeal(signed, property_id=payload['property_id']).json()
    payload = evidence_body(payload['property_id'], asset, 'COLLECTIVE_APPEAL', measurement_role='VERIFIED')
    forged = post(signed, '/evidence', payload)
    assert forged.status_code == 422 and 'Факты строительства' in forged.text


def test_viewer_cannot_supply_or_review_construction_facts(signed, settings):
    prop = new_property(signed)
    asset, evidence = document(signed, prop, 'DELAY_DOCUMENT')
    pending = factor(signed, prop, 'R6', [evidence['id']]).json()['factor']
    with signed.app.state.sessions.begin() as db:
        db.scalar(select(User).where(User.username == settings.bootstrap_analyst_username)).role = 'viewer'
    try:
        assert upload(signed, prop, 'DELAY_DOCUMENT').status_code == 403
        assert post(signed, '/evidence', evidence_body(prop, asset, 'DELAY_DOCUMENT')).status_code == 403
        assert factor(signed, prop, 'R6', [evidence['id']]).status_code == 403
        assert review(signed, pending).status_code == 403
    finally:
        with signed.app.state.sessions.begin() as db:
            db.scalar(select(User).where(User.username == settings.bootstrap_analyst_username)).role = 'analyst'
