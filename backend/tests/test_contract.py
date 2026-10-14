import json

from jsonschema import Draft202012Validator
from openapi_spec_validator import validate
from referencing import Registry, Resource

from app.config import ROOT
from app.seed import demo_id


def test_contract_is_valid_openapi():
    validate(json.loads((ROOT / 'contracts/openapi.yaml').read_text(encoding='utf-8')))


def test_live_responses_match_approved_contract(signed):
    spec = json.loads((ROOT / 'contracts/openapi.yaml').read_text(encoding='utf-8'))
    spec['$schema'] = 'https://json-schema.org/draft/2020-12/schema'
    registry = Registry().with_resource('urn:saq:contract', Resource.from_contents(spec))
    samples = [
        ('/properties', 'PropertyPage'),
        ('/properties/' + str(demo_id('orken')), 'PropertyDetail'),
        ('/properties/' + str(demo_id('samal')) + '/risk', 'RiskDetail'),
        ('/advertisements', 'AdvertisementPage'),
        ('/dashboard/summary', 'DashboardSummary'),
        ('/auth/me', 'User'),
    ]
    for path, schema in samples:
        response = signed.get('/api/v1' + path)
        assert response.status_code == 200
        Draft202012Validator({'$ref': f'urn:saq:contract#/components/schemas/{schema}'}, registry=registry).validate(
            response.json()
        )
    live_ids = {op['operationId'] for path in signed.app.openapi()['paths'].values() for op in path.values()}
    expected_ids = {op['operationId'] for path in spec['paths'].values() for op in path.values()}
    assert live_ids <= expected_ids
