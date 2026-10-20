import csv
import hashlib
import io
from uuid import UUID, uuid4

import pytest
from conftest import mutation_headers
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from starlette.exceptions import HTTPException

from app.csv_import import SOCIAL_FIELDS, parse_csv
from app.models import (
    Advertisement,
    AnalysisJob,
    Asset,
    CsvImportBatch,
    CsvImportedMaterial,
    Property,
    RiskFactor,
    Signal,
    User,
)
from app.security import hash_password

PATH = '/api/v1/monitoring/csv-imports'


def file_bytes(rows, *, delimiter=',', fields=None):
    output = io.StringIO(newline='')
    writer = csv.DictWriter(output, fieldnames=fields or list(rows[0]), delimiter=delimiter)
    writer.writeheader()
    writer.writerows(rows)
    return output.getvalue().encode('utf-8-sig')


def row(**updates):
    return {
        'source_label': 'DEMO Әділет',
        'source_url': 'https://example.org/post/' + uuid4().hex,
        'text': 'DEMO Өскемен\nТекст, с запятой; без подтверждения.',
    } | updates


def preview(client, raw, demo=True):
    return client.post(
        PATH + '/preview',
        data={'is_demo': str(demo).lower()},
        files={'file': ('observations.csv', raw, 'text/csv')},
        headers=mutation_headers(client),
    )


def commit(client, raw, checked=None, key=None, demo=True):
    checked = checked or preview(client, raw, demo).json()
    return client.post(
        PATH,
        data={'is_demo': str(demo).lower(), 'preview_digest': checked['preview_digest']},
        files={'file': ('observations.csv', raw, 'text/csv')},
        headers=mutation_headers(client, key),
    )


def counts(client):
    with client.app.state.sessions() as db:
        return {
            model.__tablename__: db.scalar(select(func.count()).select_from(model))
            for model in [
                Advertisement,
                Asset,
                CsvImportBatch,
                CsvImportedMaterial,
                Property,
                AnalysisJob,
                RiskFactor,
                Signal,
                User,
            ]
        }


@pytest.mark.parametrize('delimiter', [',', ';'])
def test_parser_preserves_text_and_timezone(delimiter):
    record = row(published_at='2026-10-19T12:00:00+05:00')
    kind, count, materials = parse_csv(file_bytes([record], delimiter=delimiter), True)
    assert kind == 'STANDARD' and count == 1
    assert materials[0].text == record['text']
    equivalent = record | {'published_at': '2026-10-19T07:00:00Z'}
    assert materials[0].fingerprint == parse_csv(file_bytes([equivalent]), True)[2][0].fingerprint


@pytest.mark.parametrize(
    'raw',
    [
        b'\xff\xfe',
        b'',
        b'x' * 262145,
        b'source_label,source_url,text\nx,https://example.org,"unfinished',
        b'source_label,source_url,text,text\nx,,,x',
        file_bytes([row(source_url='javascript:alert(1)')]),
        file_bytes([row(source_url='https://user:secret@example.org/a')]),
        file_bytes([row(source_url='', text='')]),
        file_bytes([row(published_at='2026-10-19')]),
        file_bytes([row(external_id='1')]),
        file_bytes([row()] * 101),
        file_bytes([row(text='x' * 30001)]),
        file_bytes([row(unknown='unexpected')]),
    ],
    # Large payload IDs overflow PYTEST_CURRENT_TEST on Windows.
    ids=[
        'invalid-encoding',
        'empty',
        'oversized-file',
        'unfinished-quote',
        'duplicate-column',
        'unsafe-url',
        'url-credentials',
        'empty-material',
        'invalid-date',
        'external-id-without-platform',
        'too-many-rows',
        'oversized-text',
        'unknown-column',
    ],
)
def test_invalid_csv_rejected(raw):
    with pytest.raises(HTTPException):
        parse_csv(raw, False)


def test_preview_no_writes_and_commit_immutable_idempotent(signed):
    record = row()
    raw = file_bytes([record, record, row(text='')])
    before = counts(signed)
    files = set(signed.app.state.settings.storage_root.rglob('*'))
    response = preview(signed, raw)
    assert response.status_code == 200, response.text
    checked = response.json()
    assert [e['status'] for e in checked['entries']] == ['NEW', 'DUPLICATE_IN_FILE', 'NEW']
    assert checked['entries'][2]['kind'] == 'LINK'
    assert counts(signed) == before
    assert set(signed.app.state.settings.storage_root.rglob('*')) == files
    key = uuid4()
    response = commit(signed, raw, checked, key)
    assert response.status_code == 200, response.text
    receipt = response.json()
    assert receipt['created_count'] == 2 and receipt['duplicate_count'] == 1
    assert receipt['entries'][0]['advertisement_id'] == receipt['entries'][1]['advertisement_id']
    assert commit(signed, raw, checked, key).json() == receipt
    assert commit(signed, raw).json() == receipt
    downloaded = signed.get('/api/v1/assets/' + receipt['original_asset_id'])
    assert downloaded.status_code == 200 and downloaded.content == raw
    assert '.csv' in downloaded.headers['content-disposition']
    assert receipt['file_sha256'] == hashlib.sha256(raw).hexdigest()
    after = counts(signed)
    assert after['advertisements'] == before['advertisements'] + 2
    for table in ['properties', 'analysis_jobs', 'risk_factors', 'signals']:
        assert after[table] == before[table]
    with signed.app.state.sessions() as db:
        ad = db.get(Advertisement, UUID(receipt['entries'][0]['advertisement_id']))
        assert ad.confirmed_property_id is None and ad.latest_job_id is None and ad.status == 'NEW'
        assert ad.original_text == record['text']
    assert signed.get(PATH + '/' + receipt['id']).json() == receipt
    assert signed.get(PATH + '?page_size=1').json()['page_size'] == 1


def test_changed_content_and_tracking_urls_keep_prior_material(signed):
    record = row()
    original = commit(signed, file_bytes([record])).json()
    original_id = original['entries'][0]['advertisement_id']
    repeated = row(**record) | {'source_url': record['source_url'] + '?utm_source=test#fragment'}
    checked = preview(signed, file_bytes([repeated])).json()
    assert checked['entries'][0]['status'] == 'DUPLICATE'
    changed = file_bytes([record | {'text': 'DEMO обновлённый текст'}])
    checked = preview(signed, changed).json()
    assert checked['entries'][0]['status'] == 'CHANGED'
    assert checked['entries'][0]['previous_advertisement_id'] == original_id
    updated = commit(signed, changed, checked).json()
    assert updated['entries'][0]['advertisement_id'] != original_id
    assert signed.get('/api/v1/advertisements/' + original_id).json()['original_text'] == record['text']
    # Another source URL is a separate observation, even when the text matches.
    assert preview(signed, file_bytes([row(text=record['text'])])).json()['entries'][0]['status'] == 'NEW'


def test_changed_preview_requires_review_again(signed):
    record = row()
    first, second = file_bytes([record]), file_bytes([record, row()])
    stale = preview(signed, second).json()
    commit(signed, first)
    before = counts(signed)
    assert commit(signed, second, stale).status_code == 409
    assert counts(signed) == before
    result = commit(signed, second)
    assert result.status_code == 200, result.text
    assert result.json()['created_count'] == 1 and result.json()['duplicate_count'] == 1


def test_modes_and_invalid_file_are_atomic(signed):
    record = row()
    raw = file_bytes([record])
    demo = commit(signed, raw).json()
    real = commit(signed, raw, demo=False).json()
    assert demo['id'] != real['id']
    assert demo['entries'][0]['advertisement_id'] != real['entries'][0]['advertisement_id']
    before = counts(signed)
    broken = file_bytes([record, row(source_url='https://u:p@example.org')])
    assert preview(signed, broken).status_code == 422
    assert commit(signed, broken, {'preview_digest': '0' * 64}).status_code == 422
    assert counts(signed) == before


def test_legacy_research_is_recognized_without_replacing_text(signed):
    source = row()['source_url']
    research_row = dict.fromkeys(sorted(SOCIAL_FIELDS), '') | {
        'ID': 'A01',
        'ЖК': 'DEMO Әділет',
        'Площадка': 'Instagram',
        'Наблюдаемый фрагмент': 'Авторский пересказ',
        'Ссылка на доказательство': source,
        'Оговорка': 'Оригинал не получен; нарушение не установлено',
    }
    ad_response = signed.post(
        '/api/v1/advertisements',
        json={
            'source_label': 'DEMO legacy',
            'source_url': source,
            'text': 'DEMO сохранённый старый текст',
            'is_demo': True,
        },
        headers=mutation_headers(signed),
    )
    assert ad_response.status_code == 201, ad_response.text
    ad_id = ad_response.json()['id']
    with signed.app.state.sessions.begin() as db:
        asset = db.scalar(select(Asset).where(Asset.advertisement_id == UUID(ad_id)))
        asset.source_details = {'rows': [research_row]}
    raw = file_bytes([research_row | {'ID': 'other'}])
    checked = preview(signed, raw).json()
    assert checked['entries'][0]['status'] == 'DUPLICATE'
    assert checked['entries'][0]['advertisement_id'] == ad_id
    saved = commit(signed, raw, checked).json()
    assert saved['created_count'] == 0
    assert signed.get('/api/v1/advertisements/' + ad_id).json()['original_text'] == 'DEMO сохранённый старый текст'
    changed = file_bytes([research_row | {'Оговорка': 'Другое ограничение'}])
    assert preview(signed, changed).json()['entries'][0]['status'] == 'CHANGED'


def test_authorization_csrf_limits_and_template(client, signed, settings):
    raw = file_bytes([row()])
    assert signed.get(PATH + '/template').content.startswith(b'\xef\xbb\xbfsource_label')
    assert signed.get(PATH + '?page_size=101').status_code == 422
    assert signed.get(PATH + '/' + str(uuid4())).status_code == 404
    assert signed.post(PATH + '/preview', data={'is_demo': 'true'}, files={'file': ('a.csv', raw)}).status_code == 422
    assert (
        signed.post(
            PATH + '/preview',
            data={'is_demo': 'true'},
            files={'file': ('a.csv', raw)},
            headers=mutation_headers(signed) | {'Origin': 'https://untrusted.example'},
        ).status_code
        == 403
    )
    assert preview(signed, b'x' * 262145).status_code == 413
    username, password = 'csv-viewer-' + uuid4().hex, uuid4().hex
    with signed.app.state.sessions.begin() as db:
        db.add(
            User(
                username=username, display_name='DEMO CSV viewer', role='viewer', password_hash=hash_password(password)
            )
        )
    with TestClient(client.app, base_url='http://localhost:3000') as viewer:
        assert viewer.get(PATH).status_code == 401
        response = viewer.post(
            '/api/v1/auth/login',
            json={
                'username': username,
                'password': password,
            },
            headers=mutation_headers(viewer),
        )
        assert response.status_code == 200
        assert viewer.get(PATH).status_code == 200
        assert preview(viewer, raw).status_code == 403
        assert commit(viewer, raw, {'preview_digest': '0' * 64}).status_code == 403


def test_csv_contract_matches_runtime(client):
    import json
    from pathlib import Path

    spec = json.loads((Path(__file__).resolve().parents[2] / 'contracts/openapi.yaml').read_text(encoding='utf-8'))
    live = client.app.openapi()
    for path, operations in live['paths'].items():
        if path.startswith(PATH):
            assert spec['paths'][path] == operations


def test_concurrent_commits_and_failed_audit_are_atomic(signed, monkeypatch):
    from concurrent.futures import ThreadPoolExecutor

    from app.api import csv_import as api_module

    raw = file_bytes([row()])
    checked = preview(signed, raw).json()
    headers, cookies = mutation_headers(signed), dict(signed.cookies)

    def send(_):
        with TestClient(signed.app, base_url='http://localhost:3000') as client:
            client.cookies.update(cookies)
            return client.post(
                PATH,
                data={'is_demo': 'true', 'preview_digest': checked['preview_digest']},
                files={'file': ('same.csv', raw, 'text/csv')},
                headers=headers | {'Idempotency-Key': str(uuid4())},
            )

    with ThreadPoolExecutor(max_workers=2) as pool:
        responses = list(pool.map(send, range(2)))
    assert [r.status_code for r in responses] == [200, 200]
    assert responses[0].json() == responses[1].json()
    broken = file_bytes([row()])
    checked = preview(signed, broken).json()
    before = counts(signed)

    def fail(*args, **kwargs):
        raise RuntimeError('injected CSV audit failure')

    monkeypatch.setattr(api_module, 'audit', fail)
    with TestClient(signed.app, base_url='http://localhost:3000', raise_server_exceptions=False) as client:
        client.cookies.update(cookies)
        assert commit(client, broken, checked).status_code == 500
    assert counts(signed) == before


def test_no_url_distinct_text_and_legacy_bad_url(signed):
    first, second = row(source_url='', text='DEMO first'), row(source_url='', text='DEMO second')
    commit(signed, file_bytes([first]))
    assert preview(signed, file_bytes([second])).json()['entries'][0]['status'] == 'NEW'
    with signed.app.state.sessions.begin() as db:
        actor = db.scalar(select(User).where(User.role == 'analyst'))
        db.add(
            Advertisement(
                source_label='DEMO malformed historical',
                source_url='invalid legacy URL',
                original_text='DEMO invalid historical',
                is_demo=True,
                created_by=actor.id,
            )
        )
    assert preview(signed, file_bytes([second])).status_code == 200
