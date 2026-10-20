import json

from jsonschema import Draft202012Validator
from openapi_spec_validator import validate
from referencing import Registry, Resource

from app.config import ROOT
from app.seed import demo_id


def test_contract_is_valid_openapi():
    validate(json.loads((ROOT / 'contracts/openapi.yaml').read_text(encoding='utf-8')))


def test_monitoring_findings_contract_matches_live(client):
    spec = json.loads((ROOT / 'contracts/openapi.yaml').read_text(encoding='utf-8'))
    live = client.app.openapi()
    for path, operations in live['paths'].items():
        if path.startswith('/api/v1/monitoring/findings') or path == '/api/v1/monitoring/query-profiles/{id}/runs':
            assert spec['paths'][path] == operations
    for name, schema in live['components']['schemas'].items():
        if name.startswith(('Finding', 'Page_Finding', 'ProfileRunInput')):
            assert spec['components']['schemas'][name] == schema


def test_url_schedule_contract_matches_live(client):
    spec = json.loads((ROOT / 'contracts/openapi.yaml').read_text(encoding='utf-8'))
    live = client.app.openapi()
    for path in live['paths']:
        if path.startswith('/api/v1/monitoring/url-schedules'):
            assert spec['paths'][path] == live['paths'][path]
    for name in live['components']['schemas']:
        if name.startswith('UrlSchedule') or name == 'Page_UrlScheduleRunOut_':
            assert spec['components']['schemas'][name] == live['components']['schemas'][name]


def test_candidate_dossier_contract_matches_live(client):
    spec = json.loads((ROOT / 'contracts/openapi.yaml').read_text(encoding='utf-8'))
    live = client.app.openapi()
    for path in [
        '/api/v1/monitoring/candidates/{id}/dossier',
        '/api/v1/monitoring/candidates/{id}/link-dossier',
        '/api/v1/monitoring/candidates/{id}/unlink-dossier',
        '/api/v1/monitoring/candidates/{id}/dossier-history',
    ]:
        assert spec['paths'][path] == live['paths'][path]
    for name in ['CandidateOut', 'CandidateDossierCreate', 'CandidateDossierLink', 'CandidateDossierUnlink']:
        assert spec['components']['schemas'][name] == live['components']['schemas'][name]
    assert (
        spec['components']['schemas']['PropertyDetail']['properties']['source_candidate_id']
        == (live['components']['schemas']['PropertyDetailOut']['properties']['source_candidate_id'])
    )
    assert (
        spec['components']['schemas']['PropertyDetail']['properties']['linked_candidate_count']
        == (live['components']['schemas']['PropertyDetailOut']['properties']['linked_candidate_count'])
    )
    path = '/api/v1/monitoring/candidates'
    assert next(p for p in spec['paths'][path]['get']['parameters'] if p['name'] == 'property_id') == (
        next(p for p in live['paths'][path]['get']['parameters'] if p['name'] == 'property_id')
    )


def test_material_search_contract_matches_live_parameters(client):
    spec = json.loads((ROOT / 'contracts/openapi.yaml').read_text(encoding='utf-8'))
    for path in ['/api/v1/advertisements', '/api/v1/advertisements/review-queue']:
        documented = next(p for p in spec['paths'][path]['get']['parameters'] if p['name'] == 'q')
        actual = next(p for p in client.app.openapi()['paths'][path]['get']['parameters'] if p['name'] == 'q')
        assert documented == actual


def test_material_demo_filter_contract_matches_live_parameter(client):
    spec = json.loads((ROOT / 'contracts/openapi.yaml').read_text(encoding='utf-8'))
    path = '/api/v1/advertisements'
    documented = next(p for p in spec['paths'][path]['get']['parameters'] if p['name'] == 'is_demo')
    actual = next(p for p in client.app.openapi()['paths'][path]['get']['parameters'] if p['name'] == 'is_demo')
    assert documented == actual


def test_registry_search_description_matches_live_parameters(client):
    spec = json.loads((ROOT / 'contracts/openapi.yaml').read_text(encoding='utf-8'))
    live = client.app.openapi()
    for path in ['/api/v1/properties', '/api/v1/dashboard/summary']:
        documented = next(item for item in spec['paths'][path]['get']['parameters'] if item['name'] == 'q')
        actual = next(item for item in live['paths'][path]['get']['parameters'] if item['name'] == 'q')
        assert documented['description'] == actual['description']
        assert documented['schema']['maxLength'] == actual['schema']['anyOf'][0]['maxLength'] == 300


def test_property_order_contract_matches_live_parameter(client):
    spec = json.loads((ROOT / 'contracts/openapi.yaml').read_text(encoding='utf-8'))
    documented = next(
        item for item in spec['paths']['/api/v1/properties']['get']['parameters'] if item['name'] == 'order'
    )
    actual = next(
        item
        for item in client.app.openapi()['paths']['/api/v1/properties']['get']['parameters']
        if item['name'] == 'order'
    )
    assert documented == actual


def test_signal_search_contract_matches_live_parameter(client):
    spec = json.loads((ROOT / 'contracts/openapi.yaml').read_text(encoding='utf-8'))
    documented = next(item for item in spec['paths']['/api/v1/signals']['get']['parameters'] if item['name'] == 'q')
    actual = next(
        item for item in client.app.openapi()['paths']['/api/v1/signals']['get']['parameters'] if item['name'] == 'q'
    )
    assert documented == actual


def test_live_responses_match_approved_contract(signed):
    spec = json.loads((ROOT / 'contracts/openapi.yaml').read_text(encoding='utf-8'))
    spec['$schema'] = 'https://json-schema.org/draft/2020-12/schema'
    registry = Registry().with_resource('urn:saq:contract', Resource.from_contents(spec))
    samples = [
        ('/properties', 'PropertyPage'),
        ('/properties/' + str(demo_id('orken')), 'PropertyDetail'),
        ('/properties/' + str(demo_id('orken')) + '/structure', 'PropertyStructureOut'),
        ('/properties/' + str(demo_id('samal')) + '/risk', 'RiskDetail'),
        ('/advertisements', 'AdvertisementPage'),
        ('/advertisements/review-queue', 'AdvertisementReviewPage'),
        ('/dashboard/summary', 'DashboardSummary'),
        ('/monitoring/candidates', 'Page_CandidateOut_'),
        ('/monitoring/registry-snapshots', 'Page_RegistrySnapshotOut_'),
        ('/monitoring/incidents', 'Page_IncidentOut_'),
        ('/monitoring/threads/status', 'ThreadsConnectionStatus'),
        ('/auth/me', 'User'),
    ]
    left_id, right_id = str(demo_id('ad-1')), str(demo_id('ad-2'))
    samples.append((f'/advertisements/compare?left_id={left_id}&right_id={right_id}', 'PublicationComparison'))
    for path, schema in samples:
        response = signed.get('/api/v1' + path)
        assert response.status_code == 200
        Draft202012Validator({'$ref': f'urn:saq:contract#/components/schemas/{schema}'}, registry=registry).validate(
            response.json()
        )
    live_ids = {op['operationId'] for path in signed.app.openapi()['paths'].values() for op in path.values()}
    expected_ids = {op['operationId'] for path in spec['paths'].values() for op in path.values()}
    assert live_ids <= expected_ids
