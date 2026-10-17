"""Actual API decisions and isolated database rows exercise the derived work queue."""

import copy
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from uuid import uuid4

import pytest
from conftest import mutation_headers
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.models import (
    Advertisement,
    Asset,
    AuditEvent,
    Evidence,
    ExtractionResult,
    Property,
    PropertyMatch,
    RiskFactor,
    User,
)

PATH = '/api/v1/advertisements/review-queue'
START = datetime(2098, 1, 1, tzinfo=timezone.utc)
FILTER = {'from': START.isoformat(), 'to': (START + timedelta(days=1)).isoformat()}


@pytest.fixture
def cases(signed):
    # Command commits release savepoints, never this fixture's outer transaction.
    with signed.app.state.engine.connect() as connection:
        transaction = connection.begin()
        db = Session(bind=connection, join_transaction_mode='create_savepoint', expire_on_commit=False)
        actor = db.scalar(select(User).where(User.role == 'analyst'))
        developer_id = db.scalar(select(Property.developer_id).limit(1))
        count = 0

        def create(hypotheses=None, *, status='READY_FOR_REVIEW', matched=False, is_demo=True, extraction=True):
            nonlocal count
            count += 1
            prop = Property(
                name=f'DEMO queue {uuid4()}',
                city='DEMO city',
                address='DEMO street',
                developer_id=developer_id,
                is_demo=is_demo,
            )
            db.add(prop)
            db.flush()
            ad = Advertisement(
                source_label='SYNTHETIC queue test',
                original_text='Первоначальный взнос 20%',
                created_by=actor.id,
                status=status,
                is_demo=is_demo,
                captured_at=START + timedelta(seconds=count),
                published_at=datetime(2020, 1, 1, tzinfo=timezone.utc),
                confirmed_property_id=prop.id if matched else None,
            )
            db.add(ad)
            db.flush()
            asset = Asset(
                advertisement_id=ad.id,
                kind='TEXT',
                mime_type='text/plain',
                byte_size=1,
                sha256='0' * 64,
                storage_key=f'queue-{uuid4()}',
                is_demo=is_demo,
            )
            db.add(asset)
            db.flush()
            result = ExtractionResult(
                id=uuid4(),
                advertisement_id=ad.id,
                source_asset_id=asset.id,
                pipeline_version='queue-test',
                analysis_text=ad.original_text,
                hypotheses=[],
                warnings=[],
            )
            for field, state in hypotheses if hypotheses is not None else [('PAYMENT_TERM', 'PENDING')]:
                result.hypotheses.append(
                    {
                        'id': str(uuid4()),
                        'field': field,
                        'value': {'text': ad.original_text, 'money': None, 'percent': None},
                        'fragment': {
                            'asset_id': str(asset.id),
                            'text_version_id': str(result.id),
                            'quote': ad.original_text,
                            'start_offset': 0,
                            'end_offset': len(ad.original_text),
                            'bbox': None,
                        },
                        'confidence': None,
                        'review_status': state,
                        'reviewed_value': None,
                    }
                )
            if extraction:
                db.add(result)
                db.flush()
            match = None
            if matched and extraction:
                match = PropertyMatch(
                    advertisement_id=ad.id,
                    extraction_id=result.id,
                    property_id=prop.id,
                    similarity=100,
                    reasons=['DEMO test'],
                    status='CONFIRMED',
                )
                db.add(match)
            db.flush()
            return SimpleNamespace(ad=ad, prop=prop, asset=asset, extraction=result, match=match, db=db, actor=actor)

        def test_db():
            yield db

        signed.app.dependency_overrides[get_db] = test_db
        try:
            yield create
        finally:
            signed.app.dependency_overrides.pop(get_db)
            db.close()
            transaction.rollback()


def queue(signed, **params):
    response = signed.get(PATH, params=FILTER | params)
    assert response.status_code == 200, response.text
    return response.json()


def post(signed, path, body):
    response = signed.post('/api/v1' + path, json=body, headers=mutation_headers(signed))
    assert response.status_code in {200, 201}, response.text
    return response.json()


def evidence(signed, case):
    h = next(h for h in case.extraction.hypotheses if h['field'] == 'PAYMENT_TERM')
    return post(
        signed,
        '/evidence',
        {
            'property_id': str(case.prop.id),
            'kind': 'ADVERTISEMENT_FRAGMENT',
            'asset_id': str(case.asset.id),
            'advertisement_id': str(case.ad.id),
            'extraction_id': str(case.extraction.id),
            'hypothesis_id': h['id'],
            'fragment': h['fragment'],
            'description': 'DEMO checked source',
            'source_label': 'DEMO source',
            'event_at': None,
            'is_demo': case.ad.is_demo,
        },
    )


def factor(signed, case, source, status='CONFIRMED'):
    row = post(
        signed,
        f'/properties/{case.prop.id}/risk-factors',
        {
            'code': 'R2',
            'as_of': datetime.now(timezone.utc).isoformat(),
            'evidence_ids': [source['id']],
            'reason': 'DEMO pending review',
        },
    )['factor']
    return review_factor(signed, row, status)


def review_factor(signed, row, status):
    return post(
        signed,
        f'/risk-factors/{row["id"]}/review',
        {
            'expected_revision': row['revision'],
            'status': status,
            'evidence_ids': row['evidence_ids'],
            'reason': 'DEMO explicit decision',
        },
    )['factor']


def test_queue_lifecycle_only_explicit_decisions_remove_work(signed, cases):
    case = cases([('PAYMENT_TERM', 'PENDING')])
    assert queue(signed)['items'][0]['actions'] == ['REVIEW_HYPOTHESES']
    post(
        signed,
        f'/extractions/{case.extraction.id}/review',
        {
            'expected_revision': 1,
            'hypothesis_id': case.extraction.hypotheses[0]['id'],
            'action': 'CONFIRM',
            'reason': 'DEMO checked payment',
        },
    )
    assert queue(signed)['items'][0]['actions'] == ['REVIEW_MATCH']
    post(
        signed,
        f'/advertisements/{case.ad.id}/matches',
        {
            'property_id': str(case.prop.id),
            'expected_advertisement_revision': 1,
            'action': 'CONFIRM',
            'reason': 'DEMO checked property',
        },
    )
    assert queue(signed)['items'][0]['actions'] == ['CREATE_PAYMENT_EVIDENCE']
    source = evidence(signed, case)
    item = queue(signed)['items'][0]
    assert item['actions'] == ['REVIEW_R2']
    assert item['r2_reviews'] == [{'property_id': str(case.prop.id), 'factor_id': None, 'evidence_ids': [source['id']]}]
    factor(signed, case, source)
    assert queue(signed)['total'] == 0
    assert signed.get(f'/api/v1/advertisements/{case.ad.id}').json()['status'] == 'READY_FOR_REVIEW'
    assert signed.get(f'/api/v1/properties/{case.prop.id}/risk').json()['summary']['score'] == 25


@pytest.mark.parametrize(
    'status,has_extraction,expected',
    [
        ('NEW', True, 0),
        ('ANALYZING', True, 0),
        ('FAILED', True, 0),
        ('READY_FOR_REVIEW', False, 0),
        ('READY_FOR_REVIEW', True, 1),
        ('REVIEWED', True, 1),
    ],
)
def test_processing_status_is_distinct_from_pending_decisions(signed, cases, status, has_extraction, expected):
    cases(status=status, extraction=has_extraction)
    assert queue(signed)['total'] == expected


@pytest.mark.parametrize(
    'hypotheses,expected',
    [
        ([], []),
        ([('PAYMENT_TERM', 'REJECTED')], []),
        ([('PROPERTY_NAME', 'REJECTED')], []),
        ([('PROPERTY_NAME', 'CONFIRMED')], ['REVIEW_MATCH']),
        ([('PAYMENT_TERM', 'CONFIRMED')], ['REVIEW_MATCH']),
    ],
)
def test_rejected_candidates_and_absent_hypotheses(signed, cases, hypotheses, expected):
    case = cases(hypotheses)
    case.db.add(
        PropertyMatch(
            advertisement_id=case.ad.id,
            extraction_id=case.extraction.id,
            property_id=case.prop.id,
            similarity=20,
            reasons=[],
            status='REJECTED',
        )
    )
    case.db.flush()
    result = queue(signed)
    assert (result['items'][0]['actions'] if result['items'] else []) == expected


def test_current_match_ignores_pending_alternative_but_old_match_does_not(signed, cases):
    case = cases([('PROPERTY_NAME', 'CONFIRMED')], matched=True)
    other = cases([])
    case.db.add(
        PropertyMatch(
            advertisement_id=case.ad.id,
            extraction_id=case.extraction.id,
            property_id=other.prop.id,
            similarity=20,
            reasons=[],
            status='PENDING',
        )
    )
    case.db.flush()
    assert queue(signed)['total'] == 0
    new = ExtractionResult(
        id=uuid4(),
        advertisement_id=case.ad.id,
        source_asset_id=case.asset.id,
        pipeline_version='queue-test-next',
        analysis_text=case.ad.original_text,
        hypotheses=case.extraction.hypotheses,
        warnings=[],
        created_at=case.extraction.created_at + timedelta(seconds=1),
    )
    case.db.add(new)
    case.db.flush()
    assert queue(signed)['items'][0]['actions'] == ['REVIEW_MATCH']


def test_corrected_negative_payment_does_not_request_impossible_evidence(signed, cases):
    case = cases([('PAYMENT_TERM', 'CONFIRMED')], matched=True)
    post(
        signed,
        f'/extractions/{case.extraction.id}/review',
        {
            'expected_revision': 1,
            'hypothesis_id': case.extraction.hypotheses[0]['id'],
            'action': 'CORRECT',
            'corrected_value': {'text': 'Бронь бесплатная', 'money': None, 'percent': None},
            'reason': 'DEMO free booking',
        },
    )
    assert queue(signed)['total'] == 0


@pytest.mark.parametrize('changed', ['property', 'advertisement', 'extraction', 'hypothesis', 'asset', 'fragment'])
def test_foreign_or_stale_evidence_does_not_satisfy_current_payment(signed, cases, changed):
    case = cases([('PAYMENT_TERM', 'CONFIRMED')], matched=True)
    source = evidence(signed, case)
    row = case.db.get(Evidence, source['id'])
    details = copy.deepcopy(row.details)
    if changed == 'property':
        row.property_id = cases([]).prop.id
    elif changed == 'asset':
        row.asset_id = cases([]).asset.id
    elif changed == 'fragment':
        details['fragment']['quote'] = 'another quote'
    else:
        details[f'{changed}_id'] = str(uuid4())
    row.details = details
    case.db.flush()
    assert queue(signed)['items'][0]['actions'] == ['CREATE_PAYMENT_EVIDENCE']


def test_one_sufficient_payment_source_satisfies_r2_without_requiring_every_clause(signed, cases):
    case = cases([('PAYMENT_TERM', 'CONFIRMED'), ('PAYMENT_TERM', 'CONFIRMED')], matched=True)
    factor(signed, case, evidence(signed, case))
    assert queue(signed)['total'] == 0


def test_rejected_r2_returns_after_new_hypothesis_decision(signed, cases):
    case = cases([('PAYMENT_TERM', 'CONFIRMED')], matched=True)
    row = factor(signed, case, evidence(signed, case), 'REJECTED')
    assert queue(signed)['total'] == 0
    post(
        signed,
        f'/extractions/{case.extraction.id}/review',
        {
            'expected_revision': 1,
            'hypothesis_id': case.extraction.hypotheses[0]['id'],
            'action': 'CONFIRM',
            'reason': 'DEMO rechecked source after previous rejection',
        },
    )
    assert queue(signed)['items'][0]['actions'] == ['REVIEW_R2']
    review_factor(signed, row, 'REJECTED')
    assert queue(signed)['total'] == 0


def test_negative_transcription_keeps_related_invalidated_r2(signed, cases):
    case = cases([('PAYMENT_TERM', 'CONFIRMED')], matched=True)
    factor(signed, case, evidence(signed, case))
    post(
        signed,
        f'/extractions/{case.extraction.id}/transcription',
        {
            'expected_revision': 1,
            'text': 'Бронь бесплатная.',
            'reason': 'DEMO source correction',
        },
    )
    item = queue(signed)['items'][0]
    assert item['actions'] == ['REVIEW_R2']
    assert item['r2_reviews'][0]['property_id'] == str(case.prop.id)
    current = case.db.scalar(select(RiskFactor).where(RiskFactor.property_id == case.prop.id))
    assert current.status == 'PENDING'
    review_factor(
        signed, {'id': str(current.id), 'revision': current.revision, 'evidence_ids': current.evidence_ids}, 'REJECTED'
    )
    assert queue(signed)['total'] == 0


@pytest.mark.parametrize('missing', ['reviewer', 'timestamp', 'linked_evidence', 'terminal_status'])
def test_property_level_factor_alone_does_not_finish_this_material(signed, cases, missing):
    case = cases([('PAYMENT_TERM', 'CONFIRMED')], matched=True)
    source = evidence(signed, case)
    factor(signed, case, source)
    row = case.db.scalar(select(RiskFactor).where(RiskFactor.property_id == case.prop.id))
    if missing == 'reviewer':
        row.reviewed_by = None
    elif missing == 'timestamp':
        row.reviewed_at = None
    elif missing == 'linked_evidence':
        row.evidence_ids = []
    else:
        row.status = 'PENDING'
    case.db.flush()
    assert queue(signed)['items'][0]['actions'] == ['REVIEW_R2']


def test_only_binding_changes_reopen_rejected_payment_decision(signed, cases):
    case = cases([('PAYMENT_TERM', 'CONFIRMED')], matched=True)
    row = factor(signed, case, evidence(signed, case), 'REJECTED')
    other = cases([])
    alternative = PropertyMatch(
        advertisement_id=case.ad.id,
        extraction_id=case.extraction.id,
        property_id=other.prop.id,
        similarity=20,
        reasons=[],
        status='PENDING',
    )
    case.db.add(alternative)
    case.db.flush()
    post(
        signed,
        f'/advertisements/{case.ad.id}/matches',
        {
            'property_id': str(other.prop.id),
            'candidate_id': str(alternative.id),
            'expected_advertisement_revision': case.ad.revision,
            'action': 'REJECT',
            'reason': 'DEMO wrong alternative',
        },
    )
    assert queue(signed)['total'] == 0
    post(
        signed,
        f'/advertisements/{case.ad.id}/matches',
        {
            'property_id': str(case.prop.id),
            'expected_advertisement_revision': case.ad.revision,
            'action': 'CONFIRM',
            'reason': 'DEMO rechecked binding',
        },
    )
    assert queue(signed)['items'][0]['actions'] == ['REVIEW_R2']
    review_factor(signed, row, 'REJECTED')
    assert queue(signed)['total'] == 0


def test_pending_r2_does_not_add_unrelated_material_from_same_property(signed, cases):
    case = cases([('PAYMENT_TERM', 'CONFIRMED')], matched=True)
    factor(signed, case, evidence(signed, case), 'PENDING')
    unrelated = cases([])
    unrelated.ad.confirmed_property_id = case.prop.id
    case.db.flush()
    result = queue(signed)
    assert result['total'] == 1
    assert result['items'][0]['advertisement_id'] == str(case.ad.id)


def test_filter_totals_and_pagination_cover_full_work_set(signed, cases):
    first = cases()
    second = cases([('PROPERTY_NAME', 'CONFIRMED')], is_demo=False)
    third = cases()
    cases([])
    result = queue(signed, page_size=1)
    assert result['total'] == 3
    assert result['action_totals'] == {
        'REVIEW_HYPOTHESES': 2,
        'REVIEW_MATCH': 1,
        'CREATE_PAYMENT_EVIDENCE': 0,
        'REVIEW_R2': 0,
    }
    assert result['items'][0]['advertisement_id'] == str(third.ad.id)
    assert queue(signed, page=2, page_size=1)['items'][0]['advertisement_id'] == str(second.ad.id)
    assert queue(signed, page=3, page_size=1)['items'][0]['advertisement_id'] == str(first.ad.id)
    assert queue(signed, page=4, page_size=1)['items'] == []
    assert queue(signed, action='REVIEW_HYPOTHESES', page_size=1)['total'] == 2
    assert queue(signed, is_demo=False)['total'] == 1
    assert queue(signed, property_id=first.prop.id)['total'] == 0
    result = queue(signed, **{'from': second.ad.captured_at.isoformat(), 'to': third.ad.captured_at.isoformat()})
    assert result['total'] == 1 and result['items'][0]['advertisement_id'] == str(second.ad.id)


def test_get_is_read_only_and_available_to_viewer(signed, cases):
    case = cases([('PAYMENT_TERM', 'CONFIRMED')], matched=True)
    factor(signed, case, evidence(signed, case))
    actor = case.db.scalar(select(User).where(User.id == case.actor.id))
    actor.role = 'viewer'
    case.db.flush()
    before = (case.ad.revision, case.ad.status, case.db.scalar(select(func.count()).select_from(AuditEvent)))
    assert queue(signed)['total'] == queue(signed)['total'] == 0
    case.db.refresh(case.ad)
    assert (case.ad.revision, case.ad.status, case.db.scalar(select(func.count()).select_from(AuditEvent))) == before


def test_queue_requires_session(client):
    assert client.get(PATH).status_code == 401


@pytest.mark.parametrize(
    'params',
    [{'page': 0}, {'page_size': 101}, {'action': 'AUTO_CONFIRM'}, {'property_id': 'bad'}, {'from': '2026-10-17'}],
)
def test_invalid_queue_filters_are_rejected(signed, params):
    assert signed.get(PATH, params=params).status_code == 422
