"""Independent manual PAYMENT_TERM proposals preserve original text and risk gates."""

from copy import deepcopy
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from test_analysis import analyzed, concurrent_reviews, contract, post
from test_legal_bases import property_id

from app.extraction import payment_offer
from app.models import AuditEvent, ExtractionResult, PropertyMatch, User, utcnow
from app.security import hash_password

QUOTE = 'Оплатите первый этап 2 млн тенге сегодня…'
TEXT = '🏗️ DEMO ТК «Құрылыс»\n' + QUOTE


@pytest.fixture
def other_analyst(signed):
    with signed.app.state.sessions.begin() as db:
        username = 'demo-manual-' + uuid4().hex
        password = 'DEMO-test-password-' + uuid4().hex
        db.add(User(username=username, display_name='DEMO тәуелсіз аналитик', password_hash=hash_password(password)))
    with TestClient(signed.app, base_url='http://localhost:3000') as client:
        csrf = client.get('/api/v1/auth/csrf').json()['csrf_token']
        result = client.post(
            '/api/v1/auth/login',
            json={'username': username, 'password': password},
            headers={'Origin': 'http://localhost:3000', 'X-CSRF-Token': csrf},
        )
        assert result.status_code == 200, result.text
        yield client


def manual_case(signed, settings):
    prop = property_id(signed)
    ad, extraction = analyzed(signed, settings, TEXT)
    assert not payment_offer(TEXT)
    assert not any(item['field'] == 'PAYMENT_TERM' for item in extraction['hypotheses'])
    matched = post(
        signed,
        f'/advertisements/{ad["id"]}/matches',
        {
            'property_id': prop,
            'expected_advertisement_revision': ad['revision'],
            'action': 'CONFIRM',
            'reason': 'DEMO: отдельная проверка адреса и очереди',
        },
    )
    assert matched.status_code == 200, matched.text
    body = {
        'expected_revision': extraction['revision'],
        'field': 'PAYMENT_TERM',
        'start_offset': TEXT.index(QUOTE),
        'end_offset': len(TEXT),
        'quote': QUOTE,
        'reason': 'DEMO: правила пропустили прямое условие оплаты',
    }
    return prop, ad, extraction, body


def propose(client, extraction, body, key=None):
    return post(client, f'/extractions/{extraction["id"]}/manual-annotations', body, key)


def manual_hypothesis(extraction):
    return next(item for item in extraction['hypotheses'] if item.get('origin') == 'MANUAL')


def review(client, extraction, action='CONFIRM', key=None, **changes):
    return post(
        client,
        f'/extractions/{extraction["id"]}/review',
        {
            'expected_revision': extraction['revision'],
            'hypothesis_id': manual_hypothesis(extraction)['id'],
            'action': action,
            'reason': 'DEMO: независимо сверены оригинал и платёжный смысл',
            **changes,
        },
        key,
    )


def evidence_body(prop, ad, extraction):
    hypothesis = manual_hypothesis(extraction)
    return {
        'property_id': prop,
        'kind': 'ADVERTISEMENT_FRAGMENT',
        'asset_id': hypothesis['fragment']['asset_id'],
        'advertisement_id': ad['id'],
        'extraction_id': extraction['id'],
        'hypothesis_id': hypothesis['id'],
        'fragment': hypothesis['fragment'],
        'description': 'DEMO: условие оплаты из независимо проверенной ручной цитаты',
        'source_label': 'DEMO: сервер использует исходную атрибуцию',
        'event_at': None,
        'is_demo': True,
    }


def score(client, prop):
    return client.get(f'/api/v1/properties/{prop}/risk').json()['summary']['score']


def test_independent_manual_proposal_to_evidence_then_separate_r2_and_later_rejection(signed, settings, other_analyst):
    prop, ad, original, body = manual_case(signed, settings)
    matches = signed.get(f'/api/v1/advertisements/{ad["id"]}/matches').json()
    original_assets = [(asset['id'], signed.get(f'/api/v1/assets/{asset["id"]}').content) for asset in ad['assets']]
    response = propose(signed, original, body)
    assert response.status_code == 201, response.text
    proposed = response.json()
    contract(proposed, 'ExtractionResult')
    hypothesis = manual_hypothesis(proposed)
    assert proposed['id'] == original['id'] and proposed['revision'] == original['revision'] + 1
    assert proposed['analysis_text'] == original['analysis_text']
    assert proposed['original_ocr_text'] == original['original_ocr_text']
    assert proposed['hypotheses'][:-1] == original['hypotheses']
    assert hypothesis['review_status'] == 'PENDING' and hypothesis['reviewed_by'] is None
    assert hypothesis['proposed_by'] == signed.get('/api/v1/auth/me').json()
    assert hypothesis['proposal_reason'] == body['reason'] and hypothesis['proposed_at']
    assert hypothesis['value'] == {'text': QUOTE, 'money': None, 'percent': None}
    assert hypothesis['fragment']['text_version_id'] == original['id']
    assert proposed['analysis_text'][body['start_offset'] : body['end_offset']] == QUOTE
    assert signed.get(f'/api/v1/advertisements/{ad["id"]}/matches').json() == matches
    assert score(signed, prop) == 0
    payload = evidence_body(prop, ad, proposed)
    assert post(signed, '/evidence', payload).status_code == 422
    assert review(signed, proposed).status_code == 403
    assert (
        review(
            other_analyst,
            proposed,
            'CORRECT',
            corrected_value={'text': 'Изменённый смысл', 'money': None, 'percent': None},
        ).status_code
        == 422
    )
    reviewed = review(other_analyst, proposed)
    assert reviewed.status_code == 200, reviewed.text
    accepted = reviewed.json()
    checked = manual_hypothesis(accepted)
    assert checked['review_status'] == 'CONFIRMED'
    assert checked['reviewed_by'] == other_analyst.get('/api/v1/auth/me').json()
    assert checked['reviewed_by']['id'] != checked['proposed_by']['id']
    assert checked['review_reason'] and checked['reviewed_at'] and score(signed, prop) == 0
    evidence = post(signed, '/evidence', payload)
    assert evidence.status_code == 201, evidence.text
    assert score(signed, prop) == 0
    created = post(
        signed,
        f'/properties/{prop}/risk-factors',
        {
            'code': 'R2',
            'as_of': utcnow().isoformat(),
            'evidence_ids': [evidence.json()['id']],
            'reason': 'DEMO: к проверке',
        },
    )
    assert created.status_code == 201, created.text
    factor = created.json()['factor']
    assert factor['status'] == 'PENDING' and score(signed, prop) == 0
    confirmed = post(
        signed,
        f'/risk-factors/{factor["id"]}/review',
        {
            'expected_revision': factor['revision'],
            'status': 'CONFIRMED',
            'evidence_ids': [evidence.json()['id']],
            'reason': 'DEMO: отдельное решение по фактору R2',
        },
    )
    assert confirmed.status_code == 200, confirmed.text
    assert score(signed, prop) == 25
    rejected = review(other_analyst, accepted, 'REJECT')
    assert rejected.status_code == 200, rejected.text
    assert manual_hypothesis(rejected.json())['review_status'] == 'REJECTED'
    assert score(signed, prop) == 0
    assert post(signed, '/evidence', payload).status_code == 422
    with signed.app.state.sessions() as db:
        events = list(db.scalars(select(AuditEvent).where(AuditEvent.entity_id == UUID(original['id']))))
        stored = db.get(ExtractionResult, UUID(original['id']))
        assert stored.analysis_text == TEXT and stored.original_ocr_text == original['original_ocr_text']
    assert any(event.action == 'MANUAL_ANNOTATION_PROPOSED' for event in events)
    assert sum(event.action == 'HYPOTHESIS_REVIEWED' for event in events) == 2
    for asset_id, content in original_assets:
        assert signed.get(f'/api/v1/assets/{asset_id}').content == content


@pytest.mark.parametrize(
    'changes',
    [
        {'quote': QUOTE.replace('2 млн', '3 млн')},
        {'start_offset': 0, 'end_offset': len(QUOTE)},
        {'start_offset': 0, 'end_offset': 100000},
        {'start_offset': -1},
        {'end_offset': 0},
        {'quote': '   ', 'start_offset': 0, 'end_offset': 3},
        {'reason': '   '},
        {'field': 'AMOUNT'},
        {'origin': 'MANUAL', 'review_status': 'CONFIRMED'},
        {'quote': 'x' * 2001, 'start_offset': 0, 'end_offset': 2001},
    ],
)
def test_manual_proposal_rejects_nonexact_or_unbounded_input(signed, settings, changes):
    prop, _, original, body = manual_case(signed, settings)
    response = propose(signed, original, body | changes)
    assert response.status_code == 422, response.text
    assert score(signed, prop) == 0
    current = signed.get(f'/api/v1/advertisements/{original["advertisement_id"]}/extractions').json()[0]
    assert current == original


def test_manual_proposal_retries_duplicates_and_stale_revision(signed, settings, other_analyst):
    _, _, original, body = manual_case(signed, settings)
    key = uuid4()
    first = propose(signed, original, body, key)
    assert first.status_code == 201, first.text
    assert propose(signed, original, body, key).json() == first.json()
    assert propose(signed, original, body | {'reason': 'DEMO: другой запрос'}, key).status_code == 409
    assert propose(signed, original, body).status_code == 409
    assert propose(signed, original, body | {'expected_revision': first.json()['revision']}).status_code == 409
    review_key = uuid4()
    confirmed = review(other_analyst, first.json(), key=review_key)
    assert confirmed.status_code == 200, confirmed.text
    assert review(other_analyst, first.json(), key=review_key).json() == confirmed.json()
    assert review(other_analyst, first.json()).status_code == 409


def test_manual_proposal_and_review_require_analyst_and_csrf(signed, settings, other_analyst):
    _, _, original, body = manual_case(signed, settings)
    no_csrf = signed.post(
        f'/api/v1/extractions/{original["id"]}/manual-annotations',
        json=body,
        headers={'Idempotency-Key': str(uuid4()), 'Origin': 'http://localhost:3000', 'X-CSRF-Token': 'x' * 40},
    )
    assert no_csrf.status_code == 403
    proposed = propose(signed, original, body)
    assert proposed.status_code == 201, proposed.text
    reviewer_id = other_analyst.get('/api/v1/auth/me').json()['id']
    with signed.app.state.sessions.begin() as db:
        db.get(User, UUID(reviewer_id)).role = 'viewer'
    assert propose(other_analyst, original, body).status_code == 403
    assert review(other_analyst, proposed.json()).status_code == 403
    assert other_analyst.get(f'/api/v1/advertisements/{original["advertisement_id"]}/extractions').status_code == 200


def test_old_extraction_cannot_receive_or_review_manual_annotations(signed, settings, other_analyst):
    _, _, original, body = manual_case(signed, settings)
    proposed = propose(signed, original, body).json()
    corrected = post(
        signed,
        f'/extractions/{original["id"]}/transcription',
        {'expected_revision': proposed['revision'], 'text': TEXT + '\nDEMO уточнение', 'reason': 'DEMO: сверка текста'},
    )
    assert corrected.status_code == 201, corrected.text
    assert propose(signed, original, body | {'expected_revision': proposed['revision']}).status_code == 409
    assert review(other_analyst, proposed).status_code == 409


@pytest.mark.parametrize('tamper', ['no-audit', 'author', 'reviewer', 'quote', 'value', 'review-status'])
def test_manual_flags_cannot_replace_authenticated_proposal_and_independent_decision(
    signed, settings, other_analyst, tamper
):
    prop, ad, original, body = manual_case(signed, settings)
    proposed = propose(signed, original, body).json()
    accepted = review(other_analyst, proposed).json()
    payload = evidence_body(prop, ad, accepted)
    with signed.app.state.sessions.begin() as db:
        row = db.get(ExtractionResult, UUID(original['id']))
        values = deepcopy(row.hypotheses)
        hypothesis = next(item for item in values if item.get('origin') == 'MANUAL')
        if tamper == 'no-audit':
            hypothesis['id'] = str(uuid4())
            payload['hypothesis_id'] = hypothesis['id']
        elif tamper == 'author':
            hypothesis['proposed_by'] = hypothesis['reviewed_by']
        elif tamper == 'reviewer':
            hypothesis['reviewed_by'] = hypothesis['proposed_by']
        elif tamper == 'quote':
            hypothesis['fragment']['quote'] = 'DEMO: выдуманная цитата'
            payload['fragment'] = deepcopy(hypothesis['fragment'])
        elif tamper == 'value':
            hypothesis['value']['text'] = 'Первоначальный взнос 20%'
        else:
            hypothesis['review_status'] = 'CORRECTED'
        row.hypotheses = values
    result = post(signed, '/evidence', payload)
    assert result.status_code == 422, result.text
    assert score(signed, prop) == 0


def test_automatic_false_negative_still_requires_payment_rule(signed, settings):
    prop, ad, original, _ = manual_case(signed, settings)
    with signed.app.state.sessions.begin() as db:
        row = db.get(ExtractionResult, UUID(original['id']))
        fake = {
            'id': str(uuid4()),
            'field': 'PAYMENT_TERM',
            'value': {'text': QUOTE, 'money': None, 'percent': None},
            'fragment': {
                'asset_id': ad['assets'][0]['id'],
                'text_version_id': original['id'],
                'quote': QUOTE,
                'start_offset': TEXT.index(QUOTE),
                'end_offset': len(TEXT),
                'bbox': None,
            },
            'confidence': None,
            'review_status': 'CONFIRMED',
            'reviewed_value': None,
        }
        row.hypotheses = [*row.hypotheses, fake]
    manual_shape = deepcopy(original)
    manual_shape['hypotheses'] = [fake | {'origin': 'MANUAL'}]
    result = post(signed, '/evidence', evidence_body(prop, ad, manual_shape))
    assert result.status_code == 422, result.text
    assert score(signed, prop) == 0
    with signed.app.state.sessions() as db:
        assert db.scalar(select(PropertyMatch.id).where(PropertyMatch.extraction_id == UUID(original['id'])))


def test_simultaneous_manual_proposals_keep_one_revision_and_one_annotation(signed, settings):
    _, _, original, body = manual_case(signed, settings)
    responses = concurrent_reviews(signed, f'/extractions/{original["id"]}/manual-annotations', [body, body])
    assert sorted(response.status_code for response in responses) == [201, 409]
    current = signed.get(f'/api/v1/advertisements/{original["advertisement_id"]}/extractions').json()[0]
    assert current['revision'] == original['revision'] + 1
    assert sum(item.get('origin') == 'MANUAL' for item in current['hypotheses']) == 1
