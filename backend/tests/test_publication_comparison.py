import hashlib
from datetime import datetime, timezone
from uuid import uuid4

import pytest
from sqlalchemy import func, select

from app.dependencies import get_db
from app.models import (
    Advertisement,
    AnalysisJob,
    Asset,
    AuditEvent,
    ExtractionResult,
    RiskFactor,
    Signal,
    TelegramNotification,
    User,
)

PATH = '/api/v1/advertisements/compare'


@pytest.fixture
def pair(signed):
    with signed.app.state.sessions() as db:
        actor = db.scalar(select(User).where(User.role == 'analyst'))
        ads = []
        for text in ['ЖК «Қуаныш» 🏠\nАқылы брондау 500 000 теңге\n', 'ЖК «Қуаныш» 🏠\nБрондау тегін\n']:
            ad = Advertisement(
                source_label='SYNTHETIC comparison test',
                source_url='https://example.test/publication',
                original_text=text,
                created_by=actor.id,
                is_demo=True,
                captured_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
            )
            db.add(ad)
            db.flush()
            db.add(
                Asset(
                    advertisement_id=ad.id,
                    kind='TEXT',
                    mime_type='text/plain',
                    byte_size=len(text.encode()),
                    sha256=hashlib.sha256(text.encode()).hexdigest(),
                    storage_key=f'comparison-{uuid4()}',
                    is_demo=True,
                )
            )
            db.flush()
            ads.append(ad)

        def test_db():
            yield db

        signed.app.dependency_overrides[get_db] = test_db
        try:
            yield db, ads, actor
        finally:
            signed.app.dependency_overrides.pop(get_db)
            db.rollback()


def compare(signed, pair, **params):
    _, ads, _ = pair
    return signed.get(PATH, params={'left_id': str(ads[0].id), 'right_id': str(ads[1].id)} | params)


def analyzed(db, ad, text):
    row = ExtractionResult(
        advertisement_id=ad.id,
        source_asset_id=ad.assets[0].id,
        pipeline_version='DEMO comparison-test',
        analysis_text=text,
        original_ocr_text='DEMO original OCR',
        hypotheses=[],
        warnings=[],
    )
    db.add(row)
    db.flush()
    return row


@pytest.mark.parametrize(
    ('left', 'right', 'expected'),
    [
        ('ЖК «Қуаныш» 🏠\nАқылы брондау', 'ЖК «Қуаныш» 🏠\nАқылы брондау', 'IDENTICAL_TEXT'),
        ('Бронь платная', 'Бронь бесплатная', 'DIFFERENT_TEXT'),
        ('Кепілақы 100 000 теңге', 'Кепілақы 200 000 теңге', 'DIFFERENT_TEXT'),
        ('A\n', 'A', 'DIFFERENT_TEXT'),
        ('A\r\n', 'A\n', 'DIFFERENT_TEXT'),
        ('ТК Қуаныш', 'ТК Куаныш', 'DIFFERENT_TEXT'),
        ('ЖК', 'жк', 'DIFFERENT_TEXT'),
        ('', '', 'TEXT_UNAVAILABLE'),
        ('', 'text', 'TEXT_UNAVAILABLE'),
        (' \n', '\t', 'TEXT_UNAVAILABLE'),
    ],
)
def test_exact_text_status_without_inferred_equivalence(signed, pair, left, right, expected):
    db, ads, _ = pair
    ads[0].original_text, ads[1].original_text = left, right
    db.flush()
    response = compare(signed, pair)
    assert response.status_code == 200, response.text
    result = response.json()
    assert result['status'] == expected
    assert result['left']['text'] == left and result['right']['text'] == right
    assert result['same_advertisement'] is False
    if expected == 'TEXT_UNAVAILABLE':
        assert result['changes'] == [] and result['left']['text_sha256'] is None
    else:
        assert result['left']['text_sha256'] == hashlib.sha256(left.encode('utf-8')).hexdigest()


@pytest.mark.parametrize(
    ('left', 'right'),
    [
        ('head\nold\ntail\n', 'head\nnew\ntail\n'),
        ('head\ntail\n', 'prefix\nhead\ninserted\ntail\nsuffix'),
        ('prefix\nhead\ndeleted\ntail\nsuffix', 'head\ntail\n'),
        ('A\r\n\r\nҚ\n🏠\n<script>one</script>', 'A\nҚ\n🏠\n<script>two</script>'),
        ('same\n' * 999 + 'before', 'same\n' * 999 + 'after'),
    ],
)
def test_changes_reconstruct_right_text_with_exact_line_endings(signed, pair, left, right):
    db, ads, _ = pair
    ads[0].original_text, ads[1].original_text = left, right
    db.flush()
    response = compare(signed, pair)
    assert response.status_code == 200, response.text
    result = response.json()
    left_lines, right_lines = left.splitlines(keepends=True), right.splitlines(keepends=True)
    restored, cursor = [], 0
    for change in result['changes']:
        a, b, c, d = (change[key] for key in ('left_start_line', 'left_end_line', 'right_start_line', 'right_end_line'))
        assert change['left_text'] == ''.join(left_lines[a:b])
        assert change['right_text'] == ''.join(right_lines[c:d])
        restored.extend(left_lines[cursor:a])
        restored.append(change['right_text'])
        cursor = b
    restored.extend(left_lines[cursor:])
    assert ''.join(restored) == right


def test_image_original_never_silently_uses_saved_ocr(signed, pair):
    db, ads, _ = pair
    for ad in ads:
        ad.original_text = ''
        ad.assets[0].kind = 'IMAGE'
        analyzed(db, ad, 'Одинаковый OCR')
    db.flush()
    result = compare(signed, pair).json()
    assert result['status'] == 'TEXT_UNAVAILABLE'
    assert all(
        side['text_basis'] == 'ORIGINAL' and side['source_asset_id'] is None
        for side in [result['left'], result['right']]
    )


def test_original_text_uses_matching_text_asset_among_html_and_ocr(signed, pair):
    db, ads, _ = pair
    original = ads[0].assets[0]
    for kind, mime in [('HTML', 'text/html'), ('OCR_TEXT', 'text/plain')]:
        db.add(
            Asset(
                advertisement_id=ads[0].id,
                kind=kind,
                mime_type=mime,
                byte_size=original.byte_size,
                sha256=original.sha256,
                storage_key=f'comparison-extra-{uuid4()}',
                is_demo=True,
            )
        )
    db.flush()
    db.expire(ads[0], ['assets'])
    result = compare(signed, pair).json()['left']
    assert result['source_asset_id'] == str(original.id)
    assert result['text_sha256'] == hashlib.sha256(ads[0].original_text.encode()).hexdigest()
    assert {asset['kind'] for asset in result['original_assets']} == {'TEXT', 'HTML'}


def test_mismatching_original_asset_is_not_claimed_as_selected_text_source(signed, pair):
    db, ads, _ = pair
    ads[0].assets[0].sha256 = '0' * 64
    db.flush()
    result = compare(signed, pair).json()['left']
    assert result['source_asset_id'] is None
    assert result['text'] == ads[0].original_text
    assert result['text_sha256'] != result['original_assets'][0]['sha256']


def test_explicit_old_versions_same_ad_and_provenance(signed, pair):
    db, ads, _ = pair
    old = analyzed(db, ads[0], 'DEMO payment 100')
    new = analyzed(db, ads[0], 'DEMO payment 200')
    result = compare(
        signed, pair, right_id=str(ads[0].id), left_extraction_id=str(old.id), right_extraction_id=str(new.id)
    ).json()
    assert result['same_advertisement'] is True and result['status'] == 'DIFFERENT_TEXT'
    assert result['left']['extraction_id'] == str(old.id) and result['right']['extraction_id'] == str(new.id)
    assert result['left']['source_asset_id'] == str(old.source_asset_id)
    assert result['left']['text_basis'] == 'EXTRACTION' and result['left']['extraction_revision'] == 1
    assert result['left']['pipeline_version'] == 'DEMO comparison-test'
    assert result['left']['published_at'] is None and result['right']['published_at'] is None
    assert ads[0].original_text != result['left']['text']


@pytest.mark.parametrize('error', ['foreign_extraction', 'missing_extraction', 'foreign_source_asset'])
def test_selected_version_must_have_local_provenance(signed, pair, error):
    db, ads, _ = pair
    version = analyzed(db, ads[0] if error == 'foreign_source_asset' else ads[1], 'DEMO OCR')
    if error == 'foreign_source_asset':
        version.source_asset_id = ads[1].assets[0].id
    db.flush()
    id = str(uuid4()) if error == 'missing_extraction' else str(version.id)
    assert compare(signed, pair, left_extraction_id=id).status_code == 422


@pytest.mark.parametrize(
    ('left_url', 'right_url', 'expected'),
    [
        (None, None, None),
        ('https://example.test/a', None, None),
        ('https://example.test/a', 'https://example.test/a', True),
        ('https://example.test/a?q=1', 'https://example.test/a?q=2', False),
    ],
)
def test_source_url_equality_is_literal_and_unknown_stays_unknown(signed, pair, left_url, right_url, expected):
    db, ads, _ = pair
    ads[0].source_url, ads[1].source_url = left_url, right_url
    db.flush()
    assert compare(signed, pair).json()['same_source_url'] is expected


@pytest.mark.parametrize(
    ('text', 'expected'),
    [
        ('Қ' * 100_000, 200),
        ('Қ' * 100_001, 413),
        ('line\n' * 1_000, 200),
        ('line\n' * 1_001, 413),
    ],
    ids=['character-boundary', 'character-overflow', 'line-boundary', 'line-overflow'],
)
def test_bounds_apply_before_equality_without_truncation(signed, pair, text, expected):
    db, ads, _ = pair
    ads[0].original_text = ads[1].original_text = text
    db.flush()
    response = compare(signed, pair)
    assert response.status_code == expected, response.text
    if expected == 200:
        assert response.json()['left']['text'] == text and response.json()['status'] == 'IDENTICAL_TEXT'


def test_demo_real_separation_missing_and_invalid_ids(signed, pair):
    db, ads, _ = pair
    assert compare(signed, pair, right_id=str(uuid4())).status_code == 404
    assert compare(signed, pair, right_id='invalid').status_code == 422
    assert signed.get(PATH).status_code == 422
    ads[1].is_demo = False
    db.flush()
    assert compare(signed, pair).status_code == 422


def test_viewer_get_has_no_business_or_audit_side_effects(signed, pair):
    db, ads, actor = pair
    actor.role = 'viewer'
    db.flush()
    models = [Advertisement, ExtractionResult, RiskFactor, AnalysisJob, Signal, AuditEvent, TelegramNotification]
    before = [db.scalar(select(func.count()).select_from(model)) for model in models]
    versions = [(ad.revision, ad.status) for ad in ads]
    assert compare(signed, pair).status_code == compare(signed, pair).status_code == 200
    assert [db.scalar(select(func.count()).select_from(model)) for model in models] == before
    assert [(ad.revision, ad.status) for ad in ads] == versions
    assert signed.get(f'/api/v1/advertisements/{ads[0].id}').status_code == 200
    assert signed.get('/api/v1/advertisements/review-queue').status_code == 200


def test_comparison_requires_session(client):
    assert client.get(PATH, params={'left_id': str(uuid4()), 'right_id': str(uuid4())}).status_code == 401
