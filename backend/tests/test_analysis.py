import io
import json
import threading
from datetime import timedelta
from uuid import UUID, uuid4

import pytest
from conftest import mutation_headers
from fastapi.testclient import TestClient
from jsonschema import Draft202012Validator
from PIL import Image
from referencing import Registry, Resource
from sqlalchemy import select

from app.analysis_dto import ExtractionOut
from app.config import ROOT
from app.extraction import extract, payment_offer
from app.models import AnalysisJob, ExtractionResult, utcnow
from app.ocr import parse_tsv
from app.seed import demo_id
from app.uploads import validate_image
from app.worker import claim_job, process_one


@pytest.mark.parametrize(
    ('text', 'positive'),
    [
        ('Платная бронь 500 000 тенге', True),
        ('Бронь бесплатная, цена квартиры 20 млн тенге', False),
        ('Без аванса. Цена 30 млн тенге', False),
        ('Первоначальный взнос 20%', True),
        ('Аванс не требуется, квартира 20 млн тенге', False),
        ('Внесите взнос 200 000 ₸', True),
        ('Задаток 500 тыс. тенге', True),
        ('Не переводите аванс 100 000 тенге мошенникам', False),
        ('Депозит 1 млн тенге', True),
        ('Предупреждение: бронь 500000 тенге — мошенники', False),
        ('Бесплатная бронь. Аванс не нужен', False),
        ('Бронь без оплаты, цена 10 млн тенге', False),
        ('Квартира 30 млн тенге', False),
        ('Аванс 0 тенге', False),
        ('Бронь — 250 000 KZT', True),
        ('Ақылы брондау 500 000 теңге', True),
        ('Брондау тегін, пәтер бағасы 20 млн теңге', False),
        ('Бастапқы жарна 20%', True),
        ('Кепілақы 200 000 теңге', True),
        ('Алдын ала төлем 1 млн теңге', True),
        ('Кепілақы алынбайды, пәтер 20 млн теңге', False),
        ('Тегін брондау, бағасы 10 млн теңге', False),
        ('Алғашқы жарна 15%', True),
        ('Сақ болыңыз! Ақылы брондау 500000 теңге', False),
        ('Брондау ақысыз, бағасы 20 млн теңге', False),
        ('Пәтер бағасы 30 млн теңге', False),
        ('Кепілақы 0 теңге', False),
        ('Брондау жоқ, бағасы 30 млн теңге', False),
        ('Ақылы брондау', True),
        ('Алаяқтар: кепілақы 500000 теңге', False),
    ],
)
def test_bilingual_payment_rules(text, positive):
    assert payment_offer(text) is positive


def post(signed, path, body, key=None):
    return signed.post('/api/v1' + path, json=body, headers=mutation_headers(signed, key))


def contract(value, name):
    spec = json.loads((ROOT / 'contracts/openapi.yaml').read_text(encoding='utf8'))
    spec['$schema'] = 'https://json-schema.org/draft/2020-12/schema'
    registry = Registry().with_resource('urn:saq:contract', Resource.from_contents(spec))
    Draft202012Validator({'$ref': f'urn:saq:contract#/components/schemas/{name}'}, registry=registry).validate(value)


def analyzed(signed, settings, text='ЖК «Жаңа Арман»\nПервоначальный взнос 20%. Строящийся дом.'):
    ad = post(signed, '/advertisements', {'text': text, 'source_label': f'Test {uuid4()}', 'is_demo': True}).json()
    key = uuid4()
    job = post(signed, f'/advertisements/{ad["id"]}/analyze', {'expected_advertisement_revision': ad['revision']}, key)
    assert job.status_code == 202, job.text
    assert (
        post(
            signed, f'/advertisements/{ad["id"]}/analyze', {'expected_advertisement_revision': ad['revision']}, key
        ).json()
        == job.json()
    )
    assert process_one(signed.app.state.sessions, settings)
    result = signed.get(f'/api/v1/analysis-jobs/{job.json()["id"]}').json()
    assert result['state'] == 'SUCCEEDED', result
    contract(result, 'AnalysisJob')
    ad = signed.get(f'/api/v1/advertisements/{ad["id"]}').json()
    extraction = signed.get(f'/api/v1/advertisements/{ad["id"]}/extractions').json()[0]
    ExtractionOut.model_validate(extraction)
    contract(extraction, 'ExtractionResult')
    return ad, extraction


def test_text_analysis_exact_offsets_and_candidates(signed, settings):
    ad, result = analyzed(signed, settings)
    assert ad['status'] == 'READY_FOR_REVIEW'
    assert result['original_ocr_text'] is None
    for hypothesis in result['hypotheses']:
        fragment = hypothesis['fragment']
        assert result['analysis_text'][fragment['start_offset'] : fragment['end_offset']] == fragment['quote']
        assert fragment['bbox'] is None
        assert hypothesis['review_status'] == 'PENDING'
    matches = signed.get(f'/api/v1/advertisements/{ad["id"]}/matches').json()
    assert matches and all(m['status'] == 'PENDING' for m in matches)
    for match in matches:
        contract(match, 'PropertyMatch')
    assert ad['confirmed_property_id'] is None


def reviewed_evidence(signed, settings, property_id=None):
    ad, result = analyzed(signed, settings)
    property_id = property_id or demo_id('orken')
    matched = post(
        signed,
        f'/advertisements/{ad["id"]}/matches',
        {
            'property_id': str(property_id),
            'expected_advertisement_revision': ad['revision'],
            'action': 'CONFIRM',
            'reason': 'Проверены очередь и адрес',
        },
    )
    assert matched.status_code == 200, matched.text
    hypothesis = next(h for h in result['hypotheses'] if h['field'] == 'PAYMENT_TERM')
    review = post(
        signed,
        f'/extractions/{result["id"]}/review',
        {
            'expected_revision': result['revision'],
            'hypothesis_id': hypothesis['id'],
            'action': 'CONFIRM',
            'reason': 'Проверено по оригиналу',
        },
    )
    assert review.status_code == 200, review.text
    result = review.json()
    payload = {
        'property_id': str(property_id),
        'kind': 'ADVERTISEMENT_FRAGMENT',
        'asset_id': hypothesis['fragment']['asset_id'],
        'advertisement_id': ad['id'],
        'extraction_id': result['id'],
        'hypothesis_id': hypothesis['id'],
        'fragment': hypothesis['fragment'],
        'description': 'Условие оплаты из оригинала',
        'source_label': 'подмена источника',
        'event_at': None,
        'is_demo': True,
    }
    evidence = post(signed, '/evidence', payload)
    assert evidence.status_code == 201, evidence.text
    assert evidence.json()['source_label'] == ad['source_label']
    contract(evidence.json(), 'Evidence')
    return ad, result, hypothesis, evidence.json(), payload


def test_human_r2_confirm_reject_and_invalidate(signed, settings):
    property_id = demo_id('orken')
    ad, extraction, hypothesis, evidence, payload = reviewed_evidence(signed, settings, property_id)
    detail = signed.get(f'/api/v1/properties/{property_id}').json()
    factor = next((f for f in detail['factors'] if f['code'] == 'R2'), None)
    if not factor:
        created = post(
            signed,
            f'/properties/{property_id}/risk-factors',
            {
                'code': 'R2',
                'as_of': utcnow().isoformat(),
                'evidence_ids': [evidence['id']],
                'reason': 'На ручную проверку',
            },
        )
        assert created.status_code == 201, created.text
        factor = created.json()['factor']
        assert factor['status'] == 'PENDING'
        assert created.json()['risk']['score'] == detail['property']['risk']['score']
    before = detail['property']['risk']['score']
    body = {
        'expected_revision': factor['revision'],
        'status': 'CONFIRMED',
        'evidence_ids': [evidence['id']],
        'reason': 'Оплата подтверждена',
    }
    key = uuid4()
    confirmed = post(signed, f'/risk-factors/{factor["id"]}/review', body, key)
    assert confirmed.status_code == 200, confirmed.text
    contract(confirmed.json(), 'RiskReviewResult')
    assert confirmed.json()['risk']['score'] == before + (0 if factor['status'] == 'CONFIRMED' else 25)
    assert post(signed, f'/risk-factors/{factor["id"]}/review', body, key).json() == confirmed.json()
    assert post(signed, f'/risk-factors/{factor["id"]}/review', body).status_code == 409
    changed = post(
        signed,
        f'/extractions/{extraction["id"]}/review',
        {
            'expected_revision': extraction['revision'],
            'hypothesis_id': hypothesis['id'],
            'action': 'REJECT',
            'reason': 'Повторная проверка: гипотеза не подтверждена',
        },
    )
    assert changed.status_code == 200, changed.text
    risk = signed.get(f'/api/v1/properties/{property_id}/risk').json()
    assert next(f for f in risk['factors'] if f['code'] == 'R2')['status'] == 'PENDING'
    assert risk['summary']['score'] == confirmed.json()['risk']['score'] - 25
    newfactor = next(f for f in risk['factors'] if f['code'] == 'R2')
    assert (
        post(
            signed, f'/risk-factors/{factor["id"]}/review', body | {'expected_revision': newfactor['revision']}
        ).status_code
        == 422
    )
    rejected = post(
        signed,
        f'/risk-factors/{factor["id"]}/review',
        body | {'expected_revision': newfactor['revision'], 'status': 'REJECTED'},
    )
    assert rejected.status_code == 200 and rejected.json()['risk']['score'] == risk['summary']['score']
    events = signed.get(f'/api/v1/properties/{property_id}/audit').json()['items']
    for event in events:
        contract(event, 'AuditEvent')
    assert any(e['action'] == 'RISK_INVALIDATED' for e in events)
    assert any(
        e['details'].get('before', {}).get('status') == 'CONFIRMED'
        for e in events
        if e['action'] == 'RISK_FACTOR_REVIEWED'
    ) or any(e['action'] == 'RISK_INVALIDATED' for e in events)
    forged = payload | {'fragment': payload['fragment'] | {'quote': 'другой текст'}}
    assert post(signed, '/evidence', forged).status_code == 422


def test_transcription_preserves_original_and_reviews(signed, settings):
    ad, result = analyzed(signed, settings)
    corrected = post(
        signed,
        f'/extractions/{result["id"]}/transcription',
        {
            'expected_revision': result['revision'],
            'text': 'ЖК «Жаңа Арман». Бронь бесплатная.',
            'reason': 'Сверка с оригиналом',
        },
    )
    assert corrected.status_code == 201, corrected.text
    assert corrected.json()['parent_extraction_id'] == result['id']
    assert not any(h['field'] == 'PAYMENT_TERM' for h in corrected.json()['hypotheses'])
    versions = signed.get(f'/api/v1/advertisements/{ad["id"]}/extractions').json()
    assert len(versions) == 2 and versions[1] == result
    assert signed.get(f'/api/v1/advertisements/{ad["id"]}').json()['original_text'] == ad['original_text']
    assert (
        post(
            signed,
            f'/extractions/{result["id"]}/transcription',
            {'expected_revision': result['revision'], 'text': 'x', 'reason': 'x'},
        ).status_code
        == 409
    )


def test_image_validation_and_authenticated_preview(signed, client, settings):
    stream = io.BytesIO()
    Image.new('RGB', (200, 100), 'white').save(stream, format='PNG')
    content = stream.getvalue()
    assert validate_image(content, 'image/png', settings.max_image_pixels) == ('image/png', 'png')
    response = signed.post(
        '/api/v1/advertisements/upload',
        files={'file': ('../original.png', content, 'image/png')},
        data={'source_label': 'Собственный баннер', 'is_demo': 'true'},
        headers=mutation_headers(signed),
    )
    assert response.status_code == 201, response.text
    asset = response.json()['assets'][0]
    downloaded = signed.get(f'/api/v1/assets/{asset["id"]}?inline=true')
    assert downloaded.content == content and downloaded.headers['content-type'] == 'image/png'
    assert 'sandbox' in downloaded.headers['content-security-policy']
    with TestClient(signed.app, base_url='http://localhost:3000') as anonymous:
        assert anonymous.get(f'/api/v1/assets/{asset["id"]}?inline=true').status_code == 401
    for content, mime in [
        (b'<svg/>', 'image/png'),
        (stream.getvalue(), 'image/jpeg'),
        (stream.getvalue()[:50], 'image/png'),
    ]:
        bad = signed.post(
            '/api/v1/advertisements/upload',
            files={'file': ('x.png', content, mime)},
            data={'source_label': 'bad', 'is_demo': 'true'},
            headers=mutation_headers(signed),
        )
        assert bad.status_code == 415


def test_chunked_body_is_bounded(signed):
    response = signed.post(
        '/api/v1/advertisements',
        content=iter([b'x' * 300_000, b'x' * 300_000]),
        headers=mutation_headers(signed) | {'Content-Type': 'application/json'},
    )
    assert response.status_code == 413
    assert response.json()['error']['request_id']


def test_lease_recovery_and_exhaustion(signed, settings):
    ad = post(
        signed, '/advertisements', {'text': 'Аванс 500000 тенге', 'source_label': 'lease', 'is_demo': True}
    ).json()
    result = post(
        signed, f'/advertisements/{ad["id"]}/analyze', {'expected_advertisement_revision': ad['revision']}
    ).json()
    first = claim_job(signed.app.state.sessions, settings)
    assert first and claim_job(signed.app.state.sessions, settings) is None
    with signed.app.state.sessions.begin() as db:
        job = db.get(AnalysisJob, UUID(result['id']))
        job.lease_until = utcnow() - timedelta(seconds=1)
    assert process_one(signed.app.state.sessions, settings)
    status = signed.get(f'/api/v1/analysis-jobs/{result["id"]}').json()
    assert status['state'] == 'SUCCEEDED' and status['attempt'] == 2
    with signed.app.state.sessions() as db:
        assert len(list(db.scalars(select(ExtractionResult).where(ExtractionResult.job_id == UUID(result['id']))))) == 1
    ad = signed.get(f'/api/v1/advertisements/{ad["id"]}').json()
    queued = post(
        signed, f'/advertisements/{ad["id"]}/analyze', {'expected_advertisement_revision': ad['revision']}
    ).json()
    with signed.app.state.sessions.begin() as db:
        job = db.get(AnalysisJob, UUID(queued['id']))
        job.attempt = settings.job_max_attempts
    assert process_one(signed.app.state.sessions, settings)
    failed = signed.get(f'/api/v1/analysis-jobs/{queued["id"]}').json()
    assert failed['state'] == 'FAILED' and failed['error']['error']['code'] == 'LEASE_EXHAUSTED'


def test_tsv_fragments_have_pixel_boxes():
    tsv = 'level\tpage_num\tblock_num\tpar_num\tline_num\tleft\ttop\twidth\theight\tconf\ttext\n5\t1\t1\t1\t1\t10\t20\t80\t30\t91\tАванс\n5\t1\t1\t1\t1\t100\t20\t80\t30\t95\t500000\n5\t1\t1\t1\t1\t190\t20\t80\t30\t90\tтенге\n'
    text, words = parse_tsv(tsv)
    hypotheses, _ = extract(text, uuid4(), uuid4(), [], words)
    payment = next(h for h in hypotheses if h['field'] == 'PAYMENT_TERM')
    assert payment['fragment']['quote'] == 'Аванс 500000 тенге'
    assert payment['fragment']['bbox'] == {'x': 10, 'y': 20, 'width': 260, 'height': 30}


def test_extraction_warning_and_nearest_payment_amount():
    for text in ['Предупреждение! Внесите взнос 100000 тенге мошенникам.', 'Сақ болыңыз! Бастапқы жарна 20%.']:
        hypotheses, warnings = extract(text, uuid4(), uuid4(), [])
        assert not any(h['field'] == 'PAYMENT_TERM' for h in hypotheses) and warnings
    hypotheses, _ = extract('Цена 20 млн тенге, аванс 500000 тенге.', uuid4(), uuid4(), [])
    assert next(h for h in hypotheses if h['field'] == 'PAYMENT_TERM')['value']['money']['amount'] == '500000'
    hypotheses, warnings = extract('Бастапкы жарна 20%. Акылы брондау 500000 тенге.', uuid4(), uuid4(), [])
    assert len([h for h in hypotheses if h['field'] == 'PAYMENT_TERM']) == 2
    assert any('диакритики' in warning for warning in warnings)


def test_foreign_candidate_demo_scope_and_empty_reason_are_rejected(signed, settings):
    first, _ = analyzed(signed, settings)
    second, _ = analyzed(signed, settings)
    candidate = signed.get(f'/api/v1/advertisements/{first["id"]}/matches').json()[0]
    body = {
        'property_id': candidate['property_id'],
        'candidate_id': candidate['id'],
        'expected_advertisement_revision': second['revision'],
        'action': 'CONFIRM',
        'reason': 'Проверка',
    }
    assert post(signed, f'/advertisements/{second["id"]}/matches', body).status_code == 422
    assert post(signed, f'/advertisements/{second["id"]}/matches', body | {'reason': '  '}).status_code == 422
    from app.models import Advertisement

    with signed.app.state.sessions.begin() as db:
        db.get(Advertisement, UUID(second['id'])).is_demo = False
    assert post(signed, f'/advertisements/{second["id"]}/matches', body | {'candidate_id': None}).status_code == 422


def image_job(signed):
    stream = io.BytesIO()
    Image.new('RGB', (200, 100), 'white').save(stream, format='PNG')
    ad = signed.post(
        '/api/v1/advertisements/upload',
        files={'file': ('x.png', stream.getvalue(), 'image/png')},
        data={'source_label': 'DEMO worker recovery', 'is_demo': 'true'},
        headers=mutation_headers(signed),
    ).json()
    job = post(
        signed, f'/advertisements/{ad["id"]}/analyze', {'expected_advertisement_revision': ad['revision']}
    ).json()
    return ad, job


def test_missing_ocr_blocks_job_and_preserves_original(signed, settings):
    ad, job = image_job(signed)
    assert process_one(
        signed.app.state.sessions, settings.model_copy(update={'tesseract_command': 'saq-test-no-such-executable'})
    )
    result = signed.get(f'/api/v1/analysis-jobs/{job["id"]}').json()
    assert result['state'] == 'BLOCKED' and result['error']['error']['code'] == 'OCR_UNAVAILABLE'
    contract(result, 'AnalysisJob')
    assert signed.get(f'/api/v1/assets/{ad["assets"][0]["id"]}').status_code == 200
    assert signed.get(f'/api/v1/advertisements/{ad["id"]}').json()['status'] == 'FAILED'


def test_late_worker_cannot_publish_after_lease_was_reclaimed(signed, settings, monkeypatch):
    _, job = image_job(signed)
    entered, release = threading.Event(), threading.Event()
    calls = []

    def recognize(_content, _settings):
        calls.append(True)
        if len(calls) == 1:
            entered.set()
            assert release.wait(15)
            return 'Аванс 999 тенге', []
        return 'Аванс 200 тенге', []

    monkeypatch.setattr('app.worker.recognize', recognize)
    errors = []

    def run():
        try:
            process_one(signed.app.state.sessions, settings)
        except Exception as exc:
            errors.append(type(exc).__name__)

    thread = threading.Thread(target=run)
    thread.start()
    try:
        assert entered.wait(10)
        with signed.app.state.sessions.begin() as db:
            db.get(AnalysisJob, UUID(job['id'])).lease_until = utcnow() - timedelta(seconds=1)
        assert process_one(signed.app.state.sessions, settings)
    finally:
        release.set()
        thread.join(15)
    assert not thread.is_alive() and not errors
    with signed.app.state.sessions() as db:
        results = list(db.scalars(select(ExtractionResult).where(ExtractionResult.job_id == UUID(job['id']))))
        assert len(results) == 1 and results[0].analysis_text == 'Аванс 200 тенге'


def test_corrected_negative_term_cannot_become_payment_evidence(signed, settings):
    _, result, hypothesis, _, payload = reviewed_evidence(signed, settings)
    value = {'text': 'Бронь бесплатная', 'money': None, 'percent': None}
    corrected = post(
        signed,
        f'/extractions/{result["id"]}/review',
        {
            'expected_revision': result['revision'],
            'hypothesis_id': hypothesis['id'],
            'action': 'CORRECT',
            'corrected_value': value,
            'reason': 'Проверено отрицание',
        },
    )
    assert corrected.status_code == 200
    after = next(h for h in corrected.json()['hypotheses'] if h['id'] == hypothesis['id'])
    assert after['value'] == hypothesis['value'] and after['reviewed_value'] == value
    assert post(signed, '/evidence', payload).status_code == 422
    confirmed = post(
        signed,
        f'/extractions/{result["id"]}/review',
        {
            'expected_revision': corrected.json()['revision'],
            'hypothesis_id': hypothesis['id'],
            'action': 'CONFIRM',
            'reason': 'Подтверждаю исправленный текст',
        },
    )
    assert confirmed.status_code == 200
    assert next(h for h in confirmed.json()['hypotheses'] if h['id'] == hypothesis['id'])['reviewed_value'] == value
    assert post(signed, '/evidence', payload).status_code == 422


def test_new_mutations_require_analyst(signed, settings):
    from app.models import User

    with signed.app.state.sessions.begin() as db:
        user = db.scalar(select(User).where(User.username == settings.bootstrap_analyst_username))
        user.role = 'viewer'
    try:
        unknown = uuid4()
        requests = [
            (f'/advertisements/{unknown}/analyze', {'expected_advertisement_revision': 1}),
            (
                f'/extractions/{unknown}/review',
                {'expected_revision': 1, 'hypothesis_id': str(unknown), 'action': 'CONFIRM', 'reason': 'x'},
            ),
            (f'/extractions/{unknown}/transcription', {'expected_revision': 1, 'text': 'x', 'reason': 'x'}),
            (
                f'/advertisements/{unknown}/matches',
                {'expected_advertisement_revision': 1, 'property_id': str(unknown), 'action': 'CONFIRM', 'reason': 'x'},
            ),
            (
                f'/properties/{unknown}/risk-factors',
                {'code': 'R2', 'as_of': utcnow().isoformat(), 'evidence_ids': [str(unknown)], 'reason': 'x'},
            ),
            (
                f'/risk-factors/{unknown}/review',
                {'expected_revision': 1, 'status': 'CONFIRMED', 'evidence_ids': [str(unknown)], 'reason': 'x'},
            ),
            (
                '/evidence',
                {
                    'property_id': str(unknown),
                    'asset_id': str(unknown),
                    'kind': 'ADVERTISEMENT_FRAGMENT',
                    'description': 'x',
                    'source_label': 'x',
                    'event_at': None,
                    'is_demo': True,
                },
            ),
        ]
        for path, body in requests:
            assert post(signed, path, body).status_code == 403
        assert (
            signed.post(
                '/api/v1/advertisements/upload',
                files={'file': ('x.png', b'invalid', 'image/png')},
                data={'source_label': 'x', 'is_demo': 'true'},
                headers=mutation_headers(signed),
            ).status_code
            == 403
        )
    finally:
        with signed.app.state.sessions.begin() as db:
            db.scalar(select(User).where(User.username == settings.bootstrap_analyst_username)).role = 'analyst'


def test_new_analysis_needs_its_own_confirmed_match_for_new_evidence(signed, settings):
    ad, _, _, _, payload = reviewed_evidence(signed, settings)
    ad = signed.get(f'/api/v1/advertisements/{ad["id"]}').json()
    assert (
        post(
            signed, f'/advertisements/{ad["id"]}/analyze', {'expected_advertisement_revision': ad['revision']}
        ).status_code
        == 202
    )
    assert process_one(signed.app.state.sessions, settings)
    result = signed.get(f'/api/v1/advertisements/{ad["id"]}/extractions').json()[0]
    hypothesis = next(h for h in result['hypotheses'] if h['field'] == 'PAYMENT_TERM')
    assert (
        post(
            signed,
            f'/extractions/{result["id"]}/review',
            {
                'expected_revision': result['revision'],
                'hypothesis_id': hypothesis['id'],
                'action': 'CONFIRM',
                'reason': 'Сверено',
            },
        ).status_code
        == 200
    )
    new_payload = payload | {
        'extraction_id': result['id'],
        'hypothesis_id': hypothesis['id'],
        'fragment': hypothesis['fragment'],
    }
    assert post(signed, '/evidence', new_payload).status_code == 422
    ad = signed.get(f'/api/v1/advertisements/{ad["id"]}').json()
    assert (
        post(
            signed,
            f'/advertisements/{ad["id"]}/matches',
            {
                'property_id': payload['property_id'],
                'expected_advertisement_revision': ad['revision'],
                'action': 'CONFIRM',
                'reason': 'Проверена новая версия',
            },
        ).status_code
        == 200
    )
    assert post(signed, '/evidence', new_payload).status_code == 201


def test_manual_transcription_supersedes_old_payment_evidence(signed, settings):
    ad, result, _, evidence, payload = reviewed_evidence(signed, settings)
    factor = next(
        (f for f in signed.get(f'/api/v1/properties/{payload["property_id"]}').json()['factors'] if f['code'] == 'R2'),
        None,
    )
    if not factor:
        factor = post(
            signed,
            f'/properties/{payload["property_id"]}/risk-factors',
            {'code': 'R2', 'as_of': utcnow().isoformat(), 'evidence_ids': [evidence['id']], 'reason': 'На проверку'},
        ).json()['factor']
    body = {
        'expected_revision': factor['revision'],
        'status': 'CONFIRMED',
        'evidence_ids': [evidence['id']],
        'reason': 'Проверено',
    }
    assert post(signed, f'/risk-factors/{factor["id"]}/review', body).status_code == 200
    changed = post(
        signed,
        f'/extractions/{result["id"]}/transcription',
        {
            'expected_revision': result['revision'],
            'text': 'Бронь бесплатная.',
            'reason': 'Сверка оригинала: ошибка расшифровки',
        },
    )
    assert changed.status_code == 201
    risk = signed.get(f'/api/v1/properties/{payload["property_id"]}/risk').json()
    current = next(f for f in risk['factors'] if f['code'] == 'R2')
    assert current['status'] == 'PENDING'
    assert (
        post(
            signed, f'/risk-factors/{factor["id"]}/review', body | {'expected_revision': current['revision']}
        ).status_code
        == 422
    )
    assert post(signed, '/evidence', payload).status_code == 422
    assert (
        post(
            signed,
            f'/risk-factors/{factor["id"]}/review',
            body | {'expected_revision': current['revision'], 'status': 'REJECTED'},
        ).status_code
        == 200
    )
    assert signed.get(f'/api/v1/advertisements/{ad["id"]}').json()['original_text'] == ad['original_text']


def test_ocr_timeout_preserves_source(signed, settings, monkeypatch):
    import subprocess

    ad, job = image_job(signed)

    def timeout(*args, **kwargs):
        raise subprocess.TimeoutExpired('tesseract', 60)

    monkeypatch.setattr('app.ocr.subprocess.run', timeout)
    assert process_one(signed.app.state.sessions, settings)
    status = signed.get(f'/api/v1/analysis-jobs/{job["id"]}').json()
    assert status['state'] == 'FAILED' and status['error']['error']['code'] == 'OCR_TIMEOUT'
    assert signed.get(f'/api/v1/assets/{ad["assets"][0]["id"]}').status_code == 200


def concurrent_reviews(signed, path, payloads):
    from concurrent.futures import ThreadPoolExecutor

    headers, cookies = mutation_headers(signed), dict(signed.cookies)

    def send(body):
        with TestClient(signed.app, base_url='http://localhost:3000') as client:
            client.cookies.update(cookies)
            return client.post('/api/v1' + path, json=body, headers=headers | {'Idempotency-Key': str(uuid4())})

    with ThreadPoolExecutor(max_workers=2) as pool:
        return list(pool.map(send, payloads))


def test_concurrent_hypothesis_reviews_reject_stale_loaded_orm_state(signed, settings, monkeypatch):
    from app.api import analysis

    _, result = analyzed(signed, settings)
    hypothesis = next(h for h in result['hypotheses'] if h['field'] == 'PAYMENT_TERM')
    original, barrier = analysis.ad_locked, threading.Barrier(2)

    def locked(db, id):
        # Both requests have loaded extraction revision before either takes the ad lock.
        barrier.wait(timeout=10)
        return original(db, id)

    monkeypatch.setattr(analysis, 'ad_locked', locked)
    body = {
        'expected_revision': result['revision'],
        'hypothesis_id': hypothesis['id'],
        'action': 'CONFIRM',
        'reason': 'Сверка',
    }
    responses = concurrent_reviews(signed, f'/extractions/{result["id"]}/review', [body, body | {'action': 'REJECT'}])
    assert sorted(r.status_code for r in responses) == [200, 409]


def test_concurrent_factor_reviews_reject_stale_loaded_orm_state(signed, settings, monkeypatch):
    from app.api import reviews

    property_id = demo_id('orken')
    _, _, _, evidence, _ = reviewed_evidence(signed, settings, property_id)
    factor = next(
        (f for f in signed.get(f'/api/v1/properties/{property_id}').json()['factors'] if f['code'] == 'R2'), None
    )
    if not factor:
        created = post(
            signed,
            f'/properties/{property_id}/risk-factors',
            {'code': 'R2', 'as_of': utcnow().isoformat(), 'evidence_ids': [evidence['id']], 'reason': 'На проверку'},
        )
        assert created.status_code == 201
        factor = created.json()['factor']
    original, barrier = reviews.property_locked, threading.Barrier(2)

    def locked(db, id):
        barrier.wait(timeout=10)
        return original(db, id)

    monkeypatch.setattr(reviews, 'property_locked', locked)
    body = {
        'expected_revision': factor['revision'],
        'status': 'PENDING',
        'evidence_ids': [evidence['id']],
        'reason': 'Сверка',
    }
    responses = concurrent_reviews(
        signed, f'/risk-factors/{factor["id"]}/review', [body, body | {'status': 'REJECTED'}]
    )
    assert sorted(r.status_code for r in responses) == [200, 409]
