import hashlib
import io
import json
import sys
from uuid import UUID, uuid4

import pytest
from conftest import mutation_headers
from fastapi.testclient import TestClient
from pypdf import PdfWriter
from pypdf.generic import DictionaryObject, NameObject, TextStringObject
from sqlalchemy import func, select
from test_analysis import contract
from test_legal_bases import property_id, review_body
from test_signals import create as create_signal

from app.main import create_app
from app.models import Asset, AuditEvent

linux = pytest.mark.skipif(sys.platform != 'linux', reason='PDF inspection requires Linux resource limits')


def pdf_bytes(*, javascript=False):
    writer = PdfWriter()
    writer.add_blank_page(400, 300)
    writer.add_metadata({'/Title': 'DEMO supporting document'})
    if javascript:
        writer.root_object[NameObject('/OpenAction')] = DictionaryObject(
            {
                NameObject('/S'): NameObject('/JavaScript'),
                NameObject('/JS'): TextStringObject('app.alert("DEMO blocked");'),
            }
        )
    output = io.BytesIO()
    writer.write(output)
    return output.getvalue()


def upload(
    client, prop, content, *, purpose='LEGAL_BASIS', filename='DEMO.pdf', mime='application/pdf', key=None, **changes
):
    facts = {
        'COLLECTIVE_APPEAL': {'signatory_count': '2'},
        'CONSTRUCTION_STAGE': {'construction_stage': 'UNDER_CONSTRUCTION'},
        'PROGRESS_MEASUREMENT': {
            'measurement_percent': '60',
            'measurement_role': 'VERIFIED',
            'comparison_key': 'DEMO whole phase',
        },
        'DELAY_DOCUMENT': {'delay_status': 'NOT_COMPLETED', 'planned_completion_at': '2020-01-01T12:00:00+05:00'},
        'LEGAL_ABSENCE_REVIEW': {
            'absence_as_of': '2020-01-02T12:00:00+05:00',
            'scope_description': 'DEMO only this phase',
            'legal_checks': json.dumps(
                [
                    {'mechanism': key, 'result': 'UNKNOWN', 'reason': 'DEMO: unknown remains unknown'}
                    for key in ['KZHK_GUARANTEE', 'BANK_WITH_MIO_PERMIT', 'FRAME_WITH_MIO_PERMIT']
                ]
            ),
        },
    }.get(purpose, {})
    return client.post(
        '/api/v1/assets/upload',
        files={'file': (filename, content, mime)},
        data={
            'property_id': prop,
            'purpose': purpose,
            'source_label': 'DEMO PDF source',
            'event_at': '2020-01-03T12:00:00+05:00',
            'methodology': 'DEMO: manual document inspection',
            'source_url': 'https://example.com/demo-pdf',
            'is_demo': 'true',
            **facts,
            **changes,
        },
        headers=mutation_headers(client, key),
    )


@linux
@pytest.mark.parametrize(
    'purpose',
    [
        'LEGAL_BASIS',
        'COLLECTIVE_APPEAL',
        'CONSTRUCTION_STAGE',
        'PROGRESS_MEASUREMENT',
        'DELAY_DOCUMENT',
        'LEGAL_ABSENCE_REVIEW',
    ],
)
def test_supporting_pdf_preserves_bytes_scope_and_idempotency(signed, settings, purpose):
    prop, content, key = property_id(signed), pdf_bytes(), uuid4()
    response = upload(signed, prop, content, purpose=purpose, key=key)
    assert response.status_code == 201, response.text
    asset = response.json()
    contract(asset, 'Asset')
    assert asset['kind'] == 'DOCUMENT' and asset['mime_type'] == 'application/pdf'
    assert asset['sha256'] == hashlib.sha256(content).hexdigest() and asset['byte_size'] == len(content)
    assert upload(signed, prop, content, purpose=purpose, key=key).json() == asset
    assert upload(signed, prop, content, purpose=purpose, key=key, source_label='changed').status_code == 409
    path = '/api/v1/assets/' + asset['id']
    with TestClient(create_app(settings), base_url='http://localhost:3000') as anonymous:
        assert anonymous.get(path).status_code == 401
    original = signed.get(path + '?inline=true')
    assert original.content == content
    assert original.headers['content-type'] == 'application/octet-stream'
    assert original.headers['content-disposition'].startswith('attachment;')
    assert original.headers['x-content-type-options'] == 'nosniff'
    assert 'sandbox' in original.headers['content-security-policy']
    with signed.app.state.sessions() as db:
        row = db.get(Asset, UUID(asset['id']))
        assert row.source_details['purpose'] == purpose and row.source_details['property_id'] == prop
        assert row.storage_key.endswith('.pdf')
        assert db.scalar(select(func.count()).select_from(AuditEvent).where(AuditEvent.entity_id == row.id)) == 1
    detail = signed.get(f'/api/v1/properties/{prop}').json()
    assert detail['property']['risk']['score'] == 0 and detail['factors'] == []


@linux
def test_pdf_legal_basis_separate_review_and_signal_snapshot(signed):
    prop, content = property_id(signed), pdf_bytes()
    asset = upload(signed, prop, content).json()
    body = {
        'mechanism': 'KZHK_GUARANTEE',
        'document_number': 'DEMO-PDF-1',
        'document_date': '2020-01-02',
        'issuer': 'DEMO issuer',
        'asset_id': asset['id'],
        'scope_description': 'DEMO only this phase',
        'is_demo': True,
        'applies_from': '2020-01-02T12:00:00+05:00',
    }
    response = signed.post(f'/api/v1/properties/{prop}/legal-bases', json=body, headers=mutation_headers(signed))
    assert response.status_code == 201, response.text
    basis = response.json()
    assert basis['verification_status'] == 'PENDING'
    decision = signed.post(
        f'/api/v1/legal-bases/{basis["id"]}/review', json=review_body(basis), headers=mutation_headers(signed)
    )
    assert decision.status_code == 200, decision.text
    signal = create_signal(signed, prop=prop).json()
    snapshot = signed.get(f'/api/v1/signals/{signal["id"]}').json()['snapshot']
    assert snapshot['assets'][0]['id'] == asset['id'] and snapshot['assets'][0]['sha256'] == asset['sha256']
    assert snapshot['legal_bases'][0]['verification_status'] == 'VERIFIED_VALID'
    assert signal['risk_snapshot']['score'] == 0


@linux
@pytest.mark.parametrize(
    ('content', 'filename', 'mime'),
    [
        (b'%PDF-1.7\ninvalid\n%%EOF\n', 'broken.pdf', 'application/pdf'),
        (b'<html>not a PDF</html>', 'fake.pdf', 'application/pdf'),
        (pdf_bytes(javascript=True), 'script.pdf', 'application/pdf'),
        (pdf_bytes()[:-8], 'truncated.pdf', 'application/pdf'),
        (pdf_bytes() + b'<script>polyglot</script>', 'appended.pdf', 'application/pdf'),
        (pdf_bytes(), 'wrong.pdf', 'image/png'),
    ],
)
def test_rejected_pdf_creates_neither_asset_nor_file(signed, settings, content, filename, mime):
    prop = property_id(signed)
    with signed.app.state.sessions() as db:
        before = db.scalar(select(func.count()).select_from(Asset))
    files = set(settings.storage_root.rglob('*.pdf'))
    response = upload(signed, prop, content, filename=filename, mime=mime)
    assert response.status_code == 415, response.text
    assert '<script>' not in response.text
    assert set(settings.storage_root.rglob('*.pdf')) == files
    with signed.app.state.sessions() as db:
        assert db.scalar(select(func.count()).select_from(Asset)) == before


@linux
def test_pdf_size_scope_and_advertisement_boundary(signed, settings):
    prop, content = property_id(signed), pdf_bytes()
    too_big = content + b' ' * (settings.max_upload_bytes + 1)
    assert upload(signed, prop, too_big).status_code == 413
    assert upload(signed, prop, content, is_demo='false').status_code == 422
    assert upload(signed, prop, content, mime='application/octet-stream').status_code == 201
    advertisement = signed.post(
        '/api/v1/advertisements/upload',
        files={'file': ('advertisement.pdf', content, 'application/pdf')},
        data={'source_label': 'DEMO ad', 'is_demo': 'true'},
        headers=mutation_headers(signed),
    )
    assert advertisement.status_code == 415
