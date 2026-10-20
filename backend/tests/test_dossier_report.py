"""Current dossier report boundaries, scope and actual offline PDF generation."""

import io
import json
import sys
from copy import deepcopy
from datetime import datetime, timezone
from uuid import UUID, uuid4

import pytest
from pypdf import PdfReader
from sqlalchemy import func, select
from test_signals import create

from app import dossier_report as reports
from app.dossier_report_render import report_html
from app.models import (
    Advertisement,
    AnalysisJob,
    Asset,
    AuditEvent,
    Command,
    Developer,
    Evidence,
    Property,
    RiskFactor,
    Signal,
    User,
)
from app.seed import demo_id
from app.storage import save_text


def endpoint(id, query=''):
    return f'/api/v1/properties/{id}/report.pdf' + (f'?{query}' if query else '')


@pytest.fixture
def report_source(signed, settings):
    with signed.app.state.sessions.begin() as db:
        actor = db.scalar(select(User).where(User.role == 'analyst'))
        developer = Developer(id=uuid4(), name='DEMO Әділет құрылыс', is_demo=True)
        db.add(developer)
        db.flush()
        prop = Property(
            id=uuid4(),
            name='DEMO Ә Ғ Қ Ң Ө Ұ Ү Һ І',
            city='Өскемен',
            address='DEMO мекенжай 19',
            developer_id=developer.id,
            is_demo=True,
        )
        db.add(prop)
        db.flush()
        ad = Advertisement(
            id=uuid4(),
            source_label='DEMO подтверждённая публикация',
            original_text='<script>fetch("http://127.0.0.1/private")</script> DEMO исходный текст',
            source_url='https://example.org/ad',
            is_demo=True,
            confirmed_property_id=prop.id,
            created_by=actor.id,
        )
        observation = Advertisement(
            id=uuid4(),
            source_label='Наблюдение из файла SAQ-TEST',
            source_url='https://example.org/unverified',
            original_text='Импортированный пересказ, не оригинал страницы',
            is_demo=True,
            created_by=actor.id,
        )
        db.add_all([ad, observation])
        db.flush()
        key, digest, size = save_text(settings.storage_root, ad.original_text)
        asset = Asset(
            id=uuid4(),
            advertisement_id=ad.id,
            kind='TEXT',
            mime_type='text/plain',
            sha256=digest,
            byte_size=size,
            storage_key=key,
            is_demo=True,
            source_details={
                'source_label': 'DEMO original',
                'secret': 'SECRET-METADATA',
                'storage_path': '/private/path',
            },
        )
        db.add(asset)
        db.flush()
        evidence = Evidence(
            id=uuid4(),
            property_id=prop.id,
            asset_id=asset.id,
            details={
                'kind': 'ADVERTISEMENT_FRAGMENT',
                'description': 'DEMO проверенный фрагмент',
                'is_demo': True,
                'secret': 'SECRET-EVIDENCE',
            },
        )
        db.add_all(
            [
                evidence,
                AuditEvent(
                    id=uuid4(),
                    actor_id=actor.id,
                    entity_type='properties',
                    entity_id=prop.id,
                    action='SOURCE_PACKAGE_IMPORTED',
                    reason='Непроверенная строка файла; идентичность не подтверждена',
                    details={
                        'advertisement_id': str(observation.id),
                        'identity_confirmed': False,
                        'secret': 'SECRET-AUDIT',
                        'source_row': {
                            'record_id': 'SAQ-TEST',
                            'project': prop.name,
                            'official_source': 'https://example.org/list',
                            'token': 'SECRET-ROW',
                        },
                        'package': {
                            'files': [{'name': 'input.csv', 'sha256': 'b' * 64, 'absolute_path': '/private/input.csv'}]
                        },
                    },
                ),
            ]
        )
        return {
            'property_id': prop.id,
            'advertisement_id': ad.id,
            'observation_id': observation.id,
            'asset_id': asset.id,
            'sha': digest,
        }


def test_report_requires_auth_validates_sections_language_and_missing_id(client, signed, monkeypatch):
    # The unsigned request uses a separate client, because signed shares its fixture client.
    signed.cookies.clear()
    assert signed.get(endpoint(demo_id('orken'))).status_code == 401

    csrf = signed.get('/api/v1/auth/csrf').json()['csrf_token']
    settings = signed.app.state.settings
    assert (
        signed.post(
            '/api/v1/auth/login',
            json={'username': settings.bootstrap_analyst_username, 'password': settings.bootstrap_analyst_password},
            headers={'Origin': settings.app_origin, 'X-CSRF-Token': csrf},
        ).status_code
        == 200
    )
    monkeypatch.setattr('app.api.exports.render_document_pdf', lambda *_: b'%PDF-fixture')
    for query in ['sections=', 'sections=summary,unknown', 'sections=risk,risk', 'language=en']:
        assert signed.get(endpoint(demo_id('orken'), query)).status_code == 422
    assert signed.get(endpoint('invalid')).status_code == 422
    assert signed.get(endpoint(uuid4())).status_code == 404


def test_default_and_selected_sections_always_include_summary(signed, report_source, monkeypatch):
    captured = []
    monkeypatch.setattr(
        'app.api.exports.render_document_pdf',
        lambda payload, _: captured.append(payload['dossier_report']) or b'%PDF-fixture',
    )
    id = report_source['property_id']
    response = signed.get(endpoint(id))
    assert response.status_code == 200
    assert response.headers['content-type'] == 'application/pdf'
    assert response.headers['cache-control'] == 'no-store'
    assert 'dossier-report' in response.headers['content-disposition']
    assert [section['id'] for section in captured[-1]['sections']] == list(reports.SECTIONS[1:])
    assert signed.get(endpoint(id, 'sections=sources&language=kk')).status_code == 200
    assert [section['id'] for section in captured[-1]['sections']] == ['sources']
    assert captured[-1]['property']['legal_verification_status'] == 'UNKNOWN'
    assert captured[-1]['property']['risk']['score'] == 0
    assert captured[-1]['property']['risk']['unknown_codes'] == ['R1', 'R2', 'R3', 'R4', 'R5', 'R6']
    html = report_html(captured[-1])
    assert 'Қысқаша мәлімет' in html and 'Құқықтық мәртебе' in html
    assert signed.get(endpoint(id, 'sections=summary')).status_code == 200
    assert captured[-1]['sections'] == []


def test_whitelisted_provenance_keeps_observation_separate_and_escapes_html(signed, report_source):
    with signed.app.state.sessions() as db:
        payload = reports.dossier_report(db, report_source['property_id'], reports.SECTIONS, 'ru')
    encoded = json.dumps(payload, ensure_ascii=False)
    assert 'SECRET-' not in encoded and '/private/' not in encoded
    assert report_source['sha'] in encoded and 'https://example.org/list' in encoded
    sections = {section['id']: section for section in payload['sections']}
    assert sections['publications']['total'] == 1
    assert sections['publications']['rows'][0]['id'] == str(report_source['advertisement_id'])
    imported = next(row for row in sections['sources']['rows'] if 'observation' in row)
    assert imported['identity_confirmed'] is False and imported['derived_observation'] is True
    assert imported['files'] == [{'name': 'input.csv', 'sha256': 'b' * 64}]
    html = report_html(payload)
    assert '&lt;script&gt;' in html and '<script>' not in html
    assert 'src="http' not in html and '<iframe' not in html


def test_report_summary_keeps_absence_date_distinct_from_review_and_generation(signed, report_source, monkeypatch):
    absence_at = datetime(2020, 2, 3, 4, 5, tzinfo=timezone.utc)
    reviewed_at = datetime(2021, 3, 4, 5, 6, tzinfo=timezone.utc)
    generated_at = datetime(2026, 10, 19, 6, 7, tzinfo=timezone.utc)
    with signed.app.state.sessions.begin() as db:
        prop = db.get(Property, report_source['property_id'])
        prop.last_reviewed_at = reviewed_at
        db.add(
            RiskFactor(
                property_id=prop.id, code='R1', status='CONFIRMED', as_of=absence_at, evidence_ids=[], revision=1
            )
        )
    captured = []
    monkeypatch.setattr(reports, 'utcnow', lambda: generated_at)
    monkeypatch.setattr(
        'app.api.exports.render_document_pdf',
        lambda payload, _: captured.append(payload['dossier_report']) or b'%PDF-fixture',
    )
    for language, caption in (
        ('ru', 'Отсутствие основания установлено на дату'),
        ('kk', 'Құқықтық негіздің жоқтығы анықталған күн'),
    ):
        assert signed.get(endpoint(prop.id, f'sections=summary&language={language}')).status_code == 200
        payload = captured[-1]
        assert payload['sections'] == []
        saved_absence = payload['property']['legal_absence_as_of']
        assert datetime.fromisoformat(saved_absence) == absence_at
        assert datetime.fromisoformat(payload['property']['risk']['as_of']) == reviewed_at
        assert datetime.fromisoformat(payload['generated_at']) == generated_at
        html = report_html(payload)
        assert caption in html and saved_absence in html
        assert payload['property']['last_reviewed_at'] in html
        assert '19.10.2026 11:07:00 UTC+5' in html


def test_report_legal_checks_preserve_results_and_bound_untrusted_metadata(signed, report_source, monkeypatch):
    checks = [
        {'mechanism': 'KZHK_GUARANTEE', 'result': 'DOCUMENTED_ABSENT', 'reason': 'DEMO датированный документ'},
        {'mechanism': 'BANK_WITH_MIO_PERMIT', 'result': 'NOT_FOUND', 'reason': 'DEMO только проверенная выборка'},
        {'mechanism': 'FRAME_WITH_MIO_PERMIT', 'result': 'UNAVAILABLE', 'reason': 'DEMO источник недоступен'},
    ]
    with signed.app.state.sessions.begin() as db:
        evidence = db.scalar(select(Evidence).where(Evidence.property_id == report_source['property_id']))
        evidence_id = evidence.id
        original = {
            **evidence.details,
            'kind': 'LEGAL_ABSENCE_REVIEW',
            'legal_checks': [dict(check, private={'password': 'SECRET-CHECK'}) for check in checks]
            + [dict(checks[0], reason='SECRET-OUTSIDE-LIMIT')],
        }
        evidence.details = original
    captured = []
    monkeypatch.setattr(
        'app.api.exports.render_document_pdf',
        lambda payload, _: captured.append(payload['dossier_report']) or b'%PDF-fixture',
    )
    for language, expected in (
        ('ru', ('Отсутствие подтверждено документом', 'Не найдено в проверенной выборке', 'Источник недоступен')),
        ('kk', ('Жоқтығы тиісті күнге құжатпен расталған', 'Тексерілген тізімнен табылмады', 'Дереккөз қолжетімсіз')),
    ):
        assert (
            signed.get(endpoint(report_source['property_id'], f'sections=evidence&language={language}')).status_code
            == 200
        )
        payload = captured[-1]
        assert payload['sections'][0]['rows'][0]['legal_checks'] == checks
        assert payload['property']['risk']['score'] == 0
        assert 'R1' in payload['property']['risk']['unknown_codes']
        html = report_html(payload)
        assert all(value in html for value in expected)
        assert all(check['reason'] in html for check in checks)
        assert 'SECRET-' not in html and 'private' not in html
    with signed.app.state.sessions() as db:
        assert db.get(Evidence, evidence_id).details == original
        assert (
            db.scalar(
                select(func.count())
                .select_from(RiskFactor)
                .where(RiskFactor.property_id == report_source['property_id'])
            )
            == 0
        )
    for invalid in (
        dict(checks[0], mechanism='UNTRUSTED'),
        dict(checks[0], result='VERIFIED_ABSENT'),
        dict(checks[0], reason={'password': 'SECRET-NESTED'}),
        dict(checks[0], reason=' '),
        dict(checks[0], reason='x' * 2001),
        None,
    ):
        row = Evidence(
            id=evidence_id,
            asset_id=report_source['asset_id'],
            details={'kind': 'LEGAL_ABSENCE_REVIEW', 'legal_checks': [invalid]},
        )
        assert reports.evidence_record(row)['legal_checks'] == []


def test_report_viewer_and_all_reads_leave_commands_jobs_audit_and_revisions_unchanged(
    signed, report_source, monkeypatch
):
    monkeypatch.setattr('app.api.exports.render_document_pdf', lambda *_: b'%PDF-fixture')
    models = (Command, AnalysisJob, AuditEvent, Signal)
    with signed.app.state.sessions.begin() as db:
        actor = db.scalar(select(User).where(User.role == 'analyst'))
        actor_id = actor.id
        actor.role = 'viewer'
    try:
        with signed.app.state.sessions() as db:
            counts = [db.scalar(select(func.count()).select_from(model)) for model in models]
            revision = db.get(Property, report_source['property_id']).revision
        assert signed.get(endpoint(report_source['property_id'])).status_code == 200
        with signed.app.state.sessions() as db:
            assert [db.scalar(select(func.count()).select_from(model)) for model in models] == counts
            assert db.get(Property, report_source['property_id']).revision == revision
            assert db.get(Advertisement, report_source['observation_id']).confirmed_property_id is None
    finally:
        with signed.app.state.sessions.begin() as db:
            db.get(User, actor_id).role = 'analyst'


def test_report_history_is_bounded_and_payload_limit_is_explicit(signed, report_source, monkeypatch):
    with signed.app.state.sessions.begin() as db:
        actor = db.scalar(select(User).where(User.role == 'analyst'))
        db.add_all(
            [
                AuditEvent(
                    actor_id=actor.id,
                    entity_type='properties',
                    entity_id=report_source['property_id'],
                    action='NOTE',
                    reason=f'DEMO {index}',
                )
                for index in range(102)
            ]
        )
    with signed.app.state.sessions() as db:
        payload = reports.dossier_report(db, report_source['property_id'], ('summary', 'history'), 'ru')
    assert payload['sections'][0]['shown'] == reports.MAX_ROWS
    assert payload['sections'][0]['total'] == 103
    assert 'не весь набор' in report_html(payload)
    monkeypatch.setattr(reports, 'MAX_REPORT_BYTES', 128)
    assert signed.get(endpoint(report_source['property_id'], 'sections=summary')).status_code == 413


def test_report_signal_uses_frozen_identity_and_risk_without_queueing(signed, report_source):
    response = create(signed, prop=str(report_source['property_id']))
    assert response.status_code == 201
    signal = response.json()
    with signed.app.state.sessions.begin() as db:
        prop = db.get(Property, report_source['property_id'])
        prop.name = 'DEMO новое текущее имя'
    with signed.app.state.sessions() as db:
        payload = reports.dossier_report(db, report_source['property_id'], ('summary', 'signals'), 'ru')
        snapshot = deepcopy(db.get(Signal, UUID(signal['id'])).snapshot)
    row = payload['sections'][0]['rows'][0]
    assert row['saved_name'] == 'DEMO Ә Ғ Қ Ң Ө Ұ Ү Һ І'
    assert row['risk_snapshot'] == signal['risk_snapshot']
    with signed.app.state.sessions() as db:
        assert db.get(Signal, UUID(signal['id'])).snapshot == snapshot
        assert db.get(Signal, UUID(signal['id'])).pdf_state == 'NOT_REQUESTED'


@pytest.mark.skipif(sys.platform != 'linux', reason='The offline PDF runtime is Linux Docker')
@pytest.mark.parametrize('language, expected', [('ru', 'Отчёт по объекту'), ('kk', 'Нысан бойынша есеп')])
def test_real_report_pdf_has_text_brand_unknown_source_and_cyrillic(signed, report_source, language, expected):
    response = signed.get(endpoint(report_source['property_id'], f'sections=summary,sources&language={language}'))
    assert response.status_code == 200, response.text[:200]
    assert response.content.startswith(b'%PDF-')
    reader = PdfReader(io.BytesIO(response.content))
    extracted = '\n'.join(page.extract_text() for page in reader.pages)
    assert 'SAQ QURYLYS' in extracted and expected in extracted
    assert 'DEMO Ә Ғ Қ Ң Ө Ұ Ү Һ І' in extracted
    assert report_source['sha'] in extracted.replace('\n', '').replace(' ', '')
    assert 'https://example.org/list' in extracted
    assert ('Не установлено' if language == 'ru' else 'Анықталмаған') in extracted
    if language == 'kk':
        assert 'Ағымдағы күнге қолданылатын расталған негіз жоқ.' in extracted
        assert 'Жалпы мәліметтерде дайындық көрсетілмеген.' in extracted


def test_report_contract_matches_live(client):
    from app.config import ROOT

    spec = json.loads((ROOT / 'contracts/openapi.yaml').read_text(encoding='utf-8'))
    path = '/api/v1/properties/{id}/report.pdf'
    assert spec['paths'][path] == client.app.openapi()['paths'][path]
