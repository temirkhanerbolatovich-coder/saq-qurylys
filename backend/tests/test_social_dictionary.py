"""Offline dictionary provenance and bounded planning, without any DB fixtures."""

import hashlib
import json
import subprocess
import sys
from pathlib import Path

import pytest
from pydantic import ValidationError

from app.social_dictionary import MAX_DICTIONARY_BYTES, load_dictionary, normalized_key
from app.social_queries import QueryPreviewOptions, compile_preview

ROOT = Path(__file__).resolve().parents[2]
V1 = (ROOT / 'docs/saq_oskemen_search_dictionary_2026-10-19.json').read_bytes()
V2 = (ROOT / 'docs/saq_oskemen_search_dictionary_v2.json').read_bytes()


def snapshot(raw=V2, original=V1):
    return load_dictionary(raw, source='supplied-dictionary.json', original_raw=original)


def changed(mutator):
    document = json.loads(V2)
    mutator(document)
    return json.dumps(document, ensure_ascii=False).encode()


def test_exact_original_and_provenance_are_preserved():
    source, extended = snapshot(V1), snapshot()
    assert source.raw == V1 and extended.raw == V2
    assert source.content_sha256 == '4eaaca44b6cc549c396fafc2736e88646371c12cd6e5cd400a95bca4e1f9fac5'
    assert extended.content_sha256 == 'a83e67855ad86b79e7857512b7cdba42d5bd5084ddec3db6b1ca3a348cfd2cb4'
    assert source.dictionary_version == 'source_dictionary_v1'
    assert extended.dictionary_version == '2.0'
    assert extended.duplicate_city_aliases == ('Ust-Kamenogorsk',)
    assert len(extended.document.city_aliases) == 14
    assert len({normalized_key(alias) for alias in extended.document.city_aliases}) == 13
    assert len(extended.document.query_templates) == 6
    assert len(extended.document.project_aliases) == 20
    assert sum(map(len, extended.document.project_aliases.values())) == 55
    assert extended.metadata()['activated_at'] is None
    assert extended.metadata()['activation_status'] == 'NOT_ACTIVATED'
    extended.document.city_aliases.clear()
    assert len(extended.document.city_aliases) == 14


@pytest.mark.parametrize('original', [None, V1 + b' ', V2], ids=['missing', 'different-bytes', 'v2-as-original'])
def test_v2_requires_exact_original_bytes(original):
    with pytest.raises(ValueError):
        snapshot(original=original)


@pytest.mark.parametrize(
    'mutator',
    [
        lambda d: d['city_aliases'].pop(),
        lambda d: d['starter_queries_ru'].__setitem__(0, 'replacement'),
        lambda d: d['project_aliases']['Altyn Uia'].remove('Altyn Uia III'),
        lambda d: d['v2_additions'].__setitem__('schema_version', '3.0'),
        lambda d: d['v2_additions']['query_execution_policy'].__setitem__('max_compiled_queries_default', 100000),
        lambda d: d['v2_additions']['query_execution_policy'].__setitem__('no_unbounded_cartesian_product', False),
        lambda d: d['v2_additions']['query_groups'][0]['template_ids'].append('{unknown}'),
        lambda d: d['v2_additions']['new_query_templates'].append('{project.__class__}'),
        lambda d: d['v2_additions']['new_query_templates'].append('{project:>9999999}'),
        lambda d: d['v2_additions']['new_query_templates'].append('{project!r}'),
        lambda d: d['v2_additions']['query_groups'].append(d['v2_additions']['query_groups'][0]),
        lambda d: d['v2_additions']['extended_queries_ru'].append('hidden\u202econtent'),
        lambda d: d['v2_additions']['extended_queries_ru'].append(' '),
        lambda d: d['v2_additions'].__setitem__('extended_queries_ru', [123]),
        lambda d: d.__setitem__('unknown', 'field'),
    ],
)
def test_invalid_or_silently_changed_dictionary_is_rejected(mutator):
    with pytest.raises(ValueError):
        snapshot(changed(mutator))


@pytest.mark.parametrize(
    'raw',
    [b'', b'x' * (MAX_DICTIONARY_BYTES + 1), b'\xff', b'{', b'{"a":1,"a":2}', b'{"a":NaN}', b'[]'],
    ids=['empty', 'oversize', 'invalid-utf8', 'invalid-json', 'duplicate-key', 'nan', 'wrong-root'],
)
def test_malformed_json_is_rejected(raw):
    with pytest.raises(ValueError):
        snapshot(raw)


def test_preview_preserves_seeds_and_tags_but_does_not_claim_access():
    report = compile_preview(snapshot(), QueryPreviewOptions(keyword=True, hashtag=True))
    assert len(report['queries']) == 25
    assert report['original_seed_count'] == 20
    assert report['original_hashtag_count'] == 32
    all_queries = report['queries'] + report['omitted_queries']
    origins = [origin for query in all_queries for origin in query['origins']]
    seeds = [origin['tokens']['seed'] for origin in origins if origin['kind'] == 'original_seed']
    doc = snapshot().document
    assert set(seeds) == set(doc.starter_queries_ru + doc.starter_queries_kk)
    tags = [origin['tokens']['hashtag'] for origin in origins if origin['kind'] == 'original_hashtag']
    assert tags == [tag for group in doc.hashtags.values() for tag in group]
    assert len({(q['discovery'], normalized_key(q['text'])) for q in all_queries}) == len(all_queries)
    assert report['access_status'] == 'ACCESS_UNVERIFIED'
    assert all(q['last_executed_at'] is None for q in all_queries)
    assert all(q['capability_status'] == 'LOCAL_FILTER_ONLY' for q in all_queries)
    assert any(q['discovery'] == 'hashtag' for q in report['queries'])
    assert all(q['dictionary_sha256'] == hashlib.sha256(V2).hexdigest() for q in all_queries)


def test_capabilities_and_budget_are_independent():
    blocked = compile_preview(snapshot(), QueryPreviewOptions())
    assert blocked['queries'] == []
    assert all(q['skip_reason'] == 'CAPABILITY_UNSUPPORTED' for q in blocked['omitted_queries'])
    keyword = compile_preview(snapshot(), QueryPreviewOptions(keyword=True, budget=2))
    assert len(keyword['queries']) == 2
    assert [q['origins'][0]['language'] for q in keyword['queries']] == ['ru', 'kk']
    assert {q['skip_reason'] for q in keyword['omitted_queries']} == {'BUDGET_LIMIT', 'CAPABILITY_UNSUPPORTED'}
    assert all(q['discovery'] == 'keyword' for q in keyword['queries'])
    tags = compile_preview(snapshot(), QueryPreviewOptions(hashtag=True, budget=100))
    assert tags['queries'] and all(q['discovery'] == 'hashtag' for q in tags['queries'])


def test_ids_stay_stable_across_budget_and_change_with_dictionary_content():
    small = compile_preview(snapshot(), QueryPreviewOptions(keyword=True, budget=1))['queries'][0]
    large = compile_preview(snapshot(), QueryPreviewOptions(keyword=True, budget=50))['queries'][0]
    assert small['id'] == large['id']
    raw = changed(lambda d: d['v2_additions']['extended_queries_ru'].append('Новая поисковая гипотеза'))
    revised = compile_preview(snapshot(raw), QueryPreviewOptions(keyword=True))['queries'][0]
    assert revised['id'] != small['id'] and revised['text'] == small['text']
    assert compile_preview(snapshot(), QueryPreviewOptions(keyword=True)) == compile_preview(
        snapshot(), QueryPreviewOptions(keyword=True)
    )


@pytest.mark.parametrize(
    'options',
    [{'budget': 0}, {'budget': 101}, {'budget': True}, {'budget': '25'}, {'keyword': 'true'}, {'language': 'en'}],
)
def test_preview_options_reject_coercion_and_unbounded_budgets(options):
    with pytest.raises(ValidationError):
        QueryPreviewOptions(**options)


def test_length_limit_and_single_language_do_not_silently_rewrite_seeds():
    report = compile_preview(snapshot(), QueryPreviewOptions(keyword=True, max_query_length=1))
    assert not report['queries']
    assert 'QUERY_TOO_LONG' in {q['skip_reason'] for q in report['omitted_queries']}
    report = compile_preview(snapshot(), QueryPreviewOptions(keyword=True, language='kk', budget=100))
    assert report['queries']
    assert all(origin.get('language', 'kk') == 'kk' for q in report['queries'] for origin in q['origins'])


def test_v1_is_also_usable_without_rewriting_the_installed_helper():
    report = compile_preview(snapshot(V1), QueryPreviewOptions(keyword=True))
    assert len(report['queries']) == 20
    assert report['dictionary_version'] == 'source_dictionary_v1'
    assert not any('risk' in key.lower() for key in report)


def test_dictionary_default_budget_is_used_and_explicit_budget_overrides_it():
    raw = changed(lambda d: d['v2_additions']['query_execution_policy'].__setitem__('max_compiled_queries_default', 3))
    assert len(compile_preview(snapshot(raw), QueryPreviewOptions(keyword=True))['queries']) == 3
    assert len(compile_preview(snapshot(raw), QueryPreviewOptions(keyword=True, budget=4))['queries']) == 4


@pytest.mark.parametrize(
    'policy,key',
    [
        ('geo_alias_policy', 'weak_alias_alone_not_sufficient_to_confirm_city'),
        ('phase_and_alias_policy', 'no_automatic_legal_document_inheritance_between_phases'),
        ('review_priority_policy', 'never_apply_R1_R6_automatically'),
        ('extraction_patterns', 'price_alone_not_payment_evidence'),
    ],
)
def test_safety_policy_cannot_be_silently_disabled(policy, key):
    with pytest.raises(ValueError):
        snapshot(changed(lambda d: d['v2_additions'][policy].__setitem__(key, False)))


def test_kazakh_generated_queries_keep_original_unicode_city():
    result = compile_preview(snapshot(), QueryPreviewOptions(keyword=True, language='kk', budget=100))
    regional = [q for q in result['queries'] if any(o.get('group') == 'regional_new_build' for o in q['origins'])]
    assert regional and all(q['text'].startswith('Өскемен ') for q in regional)
    assert any('тұрғын үй' in q['text'] or 'ТҮК' in q['text'] for q in regional)


@pytest.mark.parametrize(
    'arguments,expected_count',
    [([], 0), (['--capability', 'keyword'], 25), (['--capability', 'hashtag', '--budget', '2'], 2)],
)
def test_cli_produces_readable_offline_report(arguments, expected_count):
    result = subprocess.run(
        [sys.executable, str(ROOT / 'scripts/preview_social_queries.py'), *arguments],
        cwd=ROOT,
        capture_output=True,
        check=True,
    )
    report = json.loads(result.stdout)
    assert len(report['queries']) == expected_count
    assert report['access_status'] == 'ACCESS_UNVERIFIED'
    assert report['activated_at'] is None


def test_cli_rejects_invalid_budget_without_echoing_dictionary():
    result = subprocess.run(
        [sys.executable, str(ROOT / 'scripts/preview_social_queries.py'), '--budget', '-1'],
        cwd=ROOT,
        capture_output=True,
    )
    assert result.returncode == 2
    assert not result.stdout
    assert b'No search performed' in result.stderr
