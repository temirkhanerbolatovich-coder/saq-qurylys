"""Historical date provenance and frozen legal/risk context regressions (SQ-01–03)."""

import hashlib
import html
import json
import re
import sys
from copy import deepcopy
from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

import pytest
from pydantic import ValidationError
from sqlalchemy import Text, cast, select
from test_analysis import contract, post, reviewed_evidence
from test_legal_bases import create as create_basis
from test_legal_bases import property_id, review_body
from test_signal_pdf import queue_pdf, run_job
from test_signals import create as create_signal
from test_signals import source

from app.analysis_dto import EvidenceCreate, EvidenceOut
from app.models import Advertisement, Evidence, LegalBasis, Property, Signal, utcnow
from app.pdf_render import signal_html
from app.signal_dto import DISCLAIMER
from app.signal_pdf import pdf_payload
from app.signals import comparable_snapshot


def definition_values(document):
    return {
        html.unescape(label): html.unescape(value)
        for label, value in re.findall(r'<dt>([^<]*)</dt><dd>(.*?)</dd>', document)
    }


def template_payload():
    """A complete zero/GREEN template input without current database state."""
    risk = {
        'score': 0,
        'zone': 'GREEN',
        'revision': 1,
        'rules_version': 'rules-v1',
        'as_of': '2026-10-01T10:00:00Z',
        'confirmed_codes': [],
        'unknown_codes': ['R1', 'R2', 'R3', 'R4', 'R5', 'R6'],
    }
    return {
        'signal': {
            'id': str(uuid4()),
            'version': 1,
            'revision': 1,
            'state': 'DRAFT',
            'created_at': '2026-10-01T10:00:00Z',
            'created_by': {'display_name': 'DEMO Ә Ғ Қ Ң Ө Ұ Ү Һ І'},
            'is_demo': True,
            'risk_snapshot': risk,
        },
        'snapshot': {
            'property': {
                'name': 'DEMO ТК «Сақ құрылыс»',
                'city': 'DEMO Өскемен',
                'address': 'DEMO мекенжай',
                'risk': deepcopy(risk),
            },
            'disclaimer': DISCLAIMER,
            'unknown_information': ['Проверка источников не завершена.'],
            'factors': [],
            'legal_bases': [],
            'evidence': [],
            'assets': [],
        },
        'decisions': [],
    }


@pytest.mark.parametrize('publication_known', [False, True], ids=['capture-only', 'publication-known'])
def test_fragment_dates_come_from_advertisement_and_ignore_client_event(signed, settings, publication_known):
    ad, _, _, first, payload = reviewed_evidence(signed, settings, property_id(signed))
    assert first['event_at'] is None
    assert first['published_at'] is None
    assert first['date_basis'] == 'CAPTURE_ONLY'
    published = utcnow() - timedelta(days=3) if publication_known else None
    with signed.app.state.sessions.begin() as db:
        historical_details = deepcopy(db.get(Evidence, UUID(first['id'])).details)
        row = db.get(Advertisement, UUID(ad['id']))
        row.published_at = published
    payload['event_at'] = (utcnow() - timedelta(days=1)).isoformat()
    response = post(signed, '/evidence', payload)
    assert response.status_code == 201, response.text
    evidence = response.json()
    contract(evidence, 'Evidence')
    assert evidence['date_basis'] == ('PUBLICATION' if publication_known else 'CAPTURE_ONLY')
    assert evidence['captured_at'] == ad['captured_at']
    assert evidence['event_at'] == evidence['published_at']
    if publication_known:
        assert datetime.fromisoformat(evidence['published_at'].replace('Z', '+00:00')) == published
    else:
        assert evidence['published_at'] is None
    assert evidence['event_at'] != payload['event_at']
    # A subsequent change in the advertisement cannot invent a date in earlier evidence.
    with signed.app.state.sessions() as db:
        assert db.get(Evidence, UUID(first['id'])).details == historical_details
    document = template_payload()
    document['snapshot']['evidence'] = [evidence]
    fields = definition_values(signal_html(document))
    assert fields['Дата публикации'] == (evidence['published_at'] or 'Дата публикации неизвестна')
    assert fields['Зафиксировано'] == evidence['captured_at']
    assert 'Дата события' not in fields


def test_legacy_evidence_output_defaults_do_not_allow_client_provenance_fields():
    legacy = {
        'id': str(uuid4()),
        'property_id': str(uuid4()),
        'kind': 'ADVERTISEMENT_FRAGMENT',
        'asset_id': str(uuid4()),
        'description': 'DEMO: исторический фрагмент',
        'source_label': 'DEMO: исходник',
        'event_at': '2026-09-01T10:00:00Z',
        'captured_at': '2026-09-01T10:00:00Z',
        'created_by': str(uuid4()),
        'is_demo': True,
    }
    before = deepcopy(legacy)
    parsed = EvidenceOut.model_validate(legacy)
    assert parsed.published_at is None and parsed.date_basis == 'LEGACY_UNSPECIFIED'
    assert legacy == before
    contract(parsed.model_dump(mode='json'), 'Evidence')
    request = {key: value for key, value in legacy.items() if key not in {'id', 'captured_at', 'created_by'}}
    for forged in ({'date_basis': 'PUBLICATION'}, {'published_at': legacy['event_at']}):
        with pytest.raises(ValidationError):
            EvidenceCreate.model_validate(request | forged)


def test_legacy_snapshot_defaults_do_not_create_staleness_or_rewrite_json(signed, settings):
    prop = property_id(signed)
    source(signed, settings, prop)
    response = create_signal(signed, prop)
    assert response.status_code == 201, response.text
    signal_id = UUID(response.json()['id'])
    with signed.app.state.sessions.begin() as db:
        row = db.get(Signal, signal_id)
        historical = deepcopy(row.snapshot)
        for evidence in historical['evidence']:
            evidence.pop('published_at', None)
            evidence.pop('date_basis', None)
        row.snapshot = historical
    with signed.app.state.sessions() as db:
        original_json = db.scalar(select(cast(Signal.snapshot, Text)).where(Signal.id == signal_id))
    checksum = hashlib.sha256(original_json.encode()).hexdigest()
    original = json.loads(original_json)
    for _ in range(2):
        response = signed.get(f'/api/v1/signals/{signal_id}')
        assert response.status_code == 200, response.text
        detail = response.json()
        contract(detail, 'SignalDetail')
        assert detail['signal']['is_stale'] is False
        assert all(item['date_basis'] == 'LEGACY_UNSPECIFIED' for item in detail['snapshot']['evidence'])
    with signed.app.state.sessions() as db:
        row = db.get(Signal, signal_id)
        payload = pdf_payload(row)
        signal_html(payload)
        assert row.snapshot == original
        current_json = db.scalar(select(cast(Signal.snapshot, Text)).where(Signal.id == signal_id))
    assert current_json == original_json
    assert hashlib.sha256(current_json.encode()).hexdigest() == checksum
    assert original['evidence'] and 'date_basis' not in original['evidence'][0]


def test_date_default_normalization_preserves_meaningful_snapshot_changes():
    legacy = {'property': {'risk': {'as_of': 'old'}}, 'evidence': [{'id': 'demo', 'event_at': 'old'}]}
    before = deepcopy(legacy)
    compatible = deepcopy(legacy)
    compatible['evidence'][0] |= {'published_at': None, 'date_basis': 'LEGACY_UNSPECIFIED'}
    assert comparable_snapshot(legacy) == comparable_snapshot(compatible)
    assert legacy == before
    compatible['evidence'][0]['date_basis'] = 'CAPTURE_ONLY'
    assert comparable_snapshot(legacy) != comparable_snapshot(compatible)
    compatible['evidence'][0] |= {'date_basis': 'PUBLICATION', 'published_at': '2026-09-01T10:00:00Z'}
    assert comparable_snapshot(legacy) != comparable_snapshot(compatible)


@pytest.mark.skipif(sys.platform == 'win32', reason='Native PDF archive check requires Linux Pango')
def test_native_archive_bytes_and_snapshot_survive_current_changes(signed, settings, monkeypatch):
    signal = create_signal(signed).json()
    path = f'/api/v1/signals/{signal["id"]}'
    frozen = signed.get(path).json()
    job = queue_pdf(signed, signal).json()
    assert run_job(signed, settings, job['id'])
    original = signed.get(path + '/pdf')
    assert original.status_code == 200 and original.content.startswith(b'%PDF-')
    checksum = hashlib.sha256(original.content).hexdigest()
    completed = signed.get(f'/api/v1/analysis-jobs/{job["id"]}').json()
    monkeypatch.setattr('app.signal_pdf.render_pdf', lambda *_: pytest.fail('An archive GET must never render'))
    with signed.app.state.sessions.begin() as db:
        prop = db.get(Property, UUID(signal['property_id']))
        prop.name = 'DEMO: новое текущее имя / жаңа атау'
    detail = signed.get(path).json()
    assert detail['signal']['is_stale'] is True
    assert detail['snapshot'] == frozen['snapshot'] and detail['decisions'] == frozen['decisions']
    for url in [path + '/pdf', f'/api/v1/assets/{completed["result_asset_id"]}']:
        response = signed.get(url)
        assert response.status_code == 200
        assert response.content == original.content
        assert hashlib.sha256(response.content).hexdigest() == checksum


def test_zero_green_pdf_explicitly_lists_all_unknown_codes_without_implying_safety():
    payload = template_payload()
    document = signal_html(payload)
    fields = definition_values(document)
    assert fields['Баллы / зона'] == '0 / GREEN'
    assert fields['Подтверждённые коды'] == 'Нет'
    assert fields['Неустановленные коды'] == 'R1, R2, R3, R4, R5, R6'
    assert 'Зелёная зона не подтверждает безопасность объекта' in document
    assert 'Баллы учитывают только подтверждённые факторы' in document
    assert 'отсутствие подтверждённых факторов, а не полноту проверки' in document
    assert 'Список записей ниже может не содержать всех шести кодов' in document
    assert payload['snapshot']['property']['name'] in document
    assert 'Ә Ғ Қ Ң Ө Ұ Ү Һ І' in document
    assert payload['snapshot']['factors'] == []


@pytest.mark.parametrize('basis_kind', ['null', 'open', 'closed'])
def test_legal_period_and_review_in_pdf_remain_frozen_after_current_change(signed, basis_kind):
    prop = property_id(signed)
    now = utcnow()
    changes = (
        {'applies_from': None} if basis_kind == 'null' else {'applies_from': (now - timedelta(days=2)).isoformat()}
    )
    if basis_kind == 'closed':
        changes['applies_until'] = (now + timedelta(days=3)).isoformat()
    basis, _ = create_basis(signed, prop, **changes)
    if basis_kind != 'null':
        reviewed = post(signed, f'/legal-bases/{basis["id"]}/review', review_body(basis, as_of=now.isoformat()))
        assert reviewed.status_code == 200, reviewed.text
        basis = reviewed.json()
    response = create_signal(signed, prop)
    assert response.status_code == 201, response.text
    signal_id = UUID(response.json()['id'])
    detail = signed.get(f'/api/v1/signals/{signal_id}').json()
    frozen = detail['snapshot']['legal_bases'][0]
    for key in ['applies_from', 'applies_until', 'verification_as_of', 'reviewed_at', 'reviewed_by']:
        assert frozen[key] == basis[key]
    with signed.app.state.sessions() as db:
        payload = pdf_payload(db.get(Signal, signal_id))
    before_html = signal_html(payload)
    fields = definition_values(before_html)
    for label, key in [
        ('Период действия с', 'applies_from'),
        ('Период действия по', 'applies_until'),
        ('Проверено на дату', 'verification_as_of'),
        ('Решение принято', 'reviewed_at'),
        ('Проверяющий (исторический ID)', 'reviewed_by'),
    ]:
        assert fields[label] == (frozen[key] or 'Не указано')
    with signed.app.state.sessions.begin() as db:
        row = db.get(LegalBasis, UUID(basis['id']))
        row.details = row.details | {
            'verification_status': 'REJECTED',
            'applies_from': (now - timedelta(days=20)).isoformat(),
            'applies_until': (now - timedelta(days=10)).isoformat(),
            'verification_as_of': (now - timedelta(days=11)).isoformat(),
            'revision': row.revision + 1,
        }
    changed = signed.get(f'/api/v1/signals/{signal_id}').json()
    assert changed['signal']['is_stale'] is True
    assert changed['snapshot'] == detail['snapshot']
    with signed.app.state.sessions() as db:
        assert signal_html(pdf_payload(db.get(Signal, signal_id))) == before_html


@pytest.mark.parametrize('kind', ['ADVERTISEMENT_FRAGMENT', 'ADVERTISEMENT_PUBLICATION'])
def test_legacy_advertisement_date_is_labeled_unconfirmed_and_source_text_escaped(kind):
    payload = template_payload()
    hostile = '<img src="https://example.com/private">'
    payload['snapshot']['evidence'] = [
        {
            'id': str(uuid4()),
            'kind': kind,
            'asset_id': str(uuid4()),
            'description': 'DEMO: публикация',
            'source_label': hostile,
            'source_url': 'https://example.com/?a=<script>',
            'event_at': '2026-09-01T10:00:00Z',
            'captured_at': '2026-09-01T10:00:00Z',
        }
    ]
    document = signal_html(payload)
    fields = definition_values(document)
    assert fields['Историческая дата'] == 'Дата публикации не подтверждена; тип даты исторически не определён'
    assert fields['Сохранённое значение даты (тип не определён)'] == '2026-09-01T10:00:00Z'
    assert 'Дата события' not in fields
    assert fields['Дата публикации'] == 'Дата публикации неизвестна'
    assert '<img' not in document and '&lt;img' in document
    assert '<script>' not in document and '&lt;script&gt;' in document
    assert fields['Источник'] == hostile


def test_document_event_date_remains_an_event_and_capture_is_separate():
    payload = template_payload()
    event = datetime(2026, 9, 1, tzinfo=timezone.utc).isoformat()
    capture = datetime(2026, 9, 3, tzinfo=timezone.utc).isoformat()
    payload['snapshot']['evidence'] = [
        {
            'id': str(uuid4()),
            'kind': 'LEGAL_DOCUMENT',
            'asset_id': str(uuid4()),
            'description': 'DEMO: датированный документ',
            'event_at': event,
            'captured_at': capture,
        }
    ]
    fields = definition_values(signal_html(payload))
    assert fields['Дата события'] == event
    assert fields['Получен'] == capture
    assert 'Дата публикации' not in fields
