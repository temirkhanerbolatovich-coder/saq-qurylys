"""Evaluation metrics must not turn negative-only cases or failures into acceptance."""

import importlib.util
import json
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest

SCRIPT = Path(__file__).resolve().parents[2] / 'scripts/evaluate_publications.py'
spec = importlib.util.spec_from_file_location('evaluate_publications', SCRIPT)
evaluator = importlib.util.module_from_spec(spec)
spec.loader.exec_module(evaluator)


def record(language, expected, predicted, candidates=None, target=None):
    return {
        'language': language,
        'expected': {'payment_offer': expected, 'target_property': target},
        'prediction': None if predicted is None else {'payment_offer': predicted, 'candidates': candidates or []},
    }


def test_negative_only_sample_does_not_invent_precision_or_recall():
    value = evaluator.metrics([record('ru', False, False)])

    assert value['payment'] == {
        'tp': 0,
        'fp': 0,
        'fn': 0,
        'tn': 1,
        'expected_positive': 0,
        'precision': None,
        'recall': None,
        'recall_end_to_end': None,
    }


def test_false_positive_on_negative_sample_has_zero_precision_and_undefined_recall():
    value = evaluator.metrics([record('kz', False, True, [{'property_id': 'unrelated'}])])

    assert value['payment']['fp'] == 1
    assert value['payment']['precision'] == 0
    assert value['payment']['recall'] is None
    assert value['matching']['false_candidate_count'] == 1


def test_failed_parser_is_missing_coverage_not_true_negative():
    value = evaluator.metrics([record('ru', False, None), record('ru', False, False)])

    assert value['coverage'] == 0.5
    assert value['error_count'] == 1
    assert value['payment']['tn'] == 1
    assert value['matching']['no_target_evaluated'] == 1


def test_failed_positive_cannot_inflate_end_to_end_recall():
    value = evaluator.metrics([record('ru', True, None), record('ru', True, True)])

    assert value['payment']['recall'] == 1
    assert value['payment']['recall_end_to_end'] == 0.5
    assert value['error_count'] == 1


def test_matching_ranks_expected_property_and_keeps_failures_in_denominator():
    value = evaluator.metrics(
        [
            record('ru', True, True, [{'property_id': 'wrong'}, {'property_id': 'known'}], target='known'),
            record('ru', True, True, [{'property_id': 'known'}], target='known'),
            record('kz', True, False, target='known'),
            record('kz', True, None, target='known'),
        ]
    )

    assert value['matching']['known_target_count'] == 4
    assert value['matching']['known_target_evaluated'] == 3
    assert value['matching']['top1_hits'] == 1
    assert value['matching']['top1_rate'] == 0.25
    assert value['matching']['top3_hits'] == 2
    assert value['matching']['top3_rate'] == 0.5


def test_matching_does_not_invent_recall_without_known_targets():
    value = evaluator.metrics([record('ru', False, False)])

    assert value['matching']['known_target_count'] == 0
    assert value['matching']['known_target_evaluated'] == 0
    assert value['matching']['top1_rate'] is None
    assert value['matching']['top3_rate'] is None


def test_false_candidate_rate_excludes_failed_no_target_cases_but_exposes_coverage():
    value = evaluator.metrics(
        [
            record('ru', False, False, [{'property_id': 'wrong'}, {'property_id': 'also-wrong'}]),
            record('kz', False, False),
            record('kz', False, None),
        ]
    )

    assert value['matching']['no_target_evaluated'] == 2
    assert value['matching']['false_candidate_count'] == 2
    assert value['matching']['cases_with_false_candidates'] == 1
    assert value['matching']['cases_with_false_candidates_rate'] == 0.5
    assert value['coverage'] == pytest.approx(2 / 3)
    assert value['error_count'] == 1


def test_false_candidate_rate_is_undefined_without_evaluated_no_target_cases():
    value = evaluator.metrics([record('ru', False, None)])

    assert value['matching']['cases_with_false_candidates_rate'] is None


def test_translations_keep_case_denominators_but_share_topic_count():
    records = [
        {**record('ru', False, False), 'id': 'topic-ru', 'group_id': 'topic'},
        {**record('kz', False, False), 'id': 'topic-kz', 'group_id': 'topic'},
    ]

    value = evaluator.metrics(records)

    assert value['case_count'] == 2
    assert value['evaluated_count'] == 2
    assert value['payment']['tn'] == 2
    assert value['topic_group_count'] == 1


@pytest.fixture
def saved_corpus(tmp_path):
    original = b'<html>original publication</html>'
    (tmp_path / 'original.html').write_bytes(original)
    manifest = {
        'schema_version': 1,
        'provenance': {'kind': 'external'},
        'properties': [{'key': 'demo', 'name': 'DEMO unrelated', 'aliases': []}],
        'cases': [
            {
                'id': 'article-ru',
                'language': 'ru',
                'original': 'original.html',
                'sha256': evaluator.digest(original),
                'source': {
                    'requested_url': 'https://primeminister.kz/ru/news/example',
                    'final_url': 'https://primeminister.kz/ru/news/example',
                    'redirect_chain': [],
                    'content_type': 'text/html',
                    'captured_at': '2026-10-17T00:00:00+00:00',
                    'publisher': 'Primeminister.kz',
                    'license_url': 'https://creativecommons.org/licenses/by/4.0/',
                },
                'expected': {'payment_offer': False, 'target_property': None},
            }
        ],
    }
    path = tmp_path / 'manifest.json'
    path.write_text(json.dumps(manifest), encoding='utf-8')
    return path, manifest


def test_report_keeps_ru_and_kz_results_separate(saved_corpus):
    path, manifest = saved_corpus
    texts = {
        'ru': 'Платная бронь 100 000 тенге. Квартиры предлагаются покупателям. Условия требуют ручной проверки.',
        'kz': 'Бұл тек ақпараттық хабарлама. Мәтінде пәтер сатып алу үшін ақша аудару немесе брондау ұсынылмайды.',
    }
    cases = []
    for language, text in texts.items():
        original = (
            f'<html><h1 class="articles__title">Sample {language}</h1>'
            f'<div class="articles__container"><p>{text}</p></div></html>'
        ).encode('utf-8')
        name = f'sample-{language}.html'
        (path.parent / name).write_bytes(original)
        source = {
            **manifest['cases'][0]['source'],
            'final_url': f'https://primeminister.kz/{"ru/" if language == "ru" else ""}news/sample-{language}',
        }
        cases.append(
            {
                'id': f'sample-{language}',
                'language': language,
                'original': name,
                'sha256': evaluator.digest(original),
                'source': source,
                'expected': {'payment_offer': language == 'ru', 'target_property': None},
            }
        )
    manifest['cases'] = cases
    path.write_text(json.dumps(manifest), encoding='utf-8')

    report = evaluator.evaluate(path)

    assert report['overall']['evaluated_count'] == 2
    assert report['by_language']['ru']['payment']['tp'] == 1
    assert report['by_language']['ru']['payment']['precision'] == 1
    assert report['by_language']['kz']['payment']['tn'] == 1
    assert report['by_language']['kz']['payment']['recall'] is None


def test_changed_original_stops_scoring(saved_corpus):
    path, _ = saved_corpus
    (path.parent / 'original.html').write_bytes(b'changed source')

    with pytest.raises(ValueError, match='SHA-256 mismatch'):
        evaluator.load_manifest(path)


def test_manifest_cannot_read_original_outside_corpus(saved_corpus):
    path, manifest = saved_corpus
    manifest['cases'][0]['original'] = '../outside.html'
    path.write_text(json.dumps(manifest), encoding='utf-8')

    with pytest.raises(ValueError, match='inside the manifest directory'):
        evaluator.load_manifest(path)


@pytest.mark.parametrize('group_id', ['', [], 'contains space'])
def test_invalid_topic_group_is_rejected(saved_corpus, group_id):
    path, manifest = saved_corpus
    manifest['cases'][0]['group_id'] = group_id
    path.write_text(json.dumps(manifest), encoding='utf-8')

    with pytest.raises(ValueError, match='invalid topic group id'):
        evaluator.load_manifest(path)


def test_frozen_manifest_content_is_used_instead_of_later_file_contents(saved_corpus):
    path, manifest = saved_corpus
    frozen = path.read_bytes()
    path.write_text('invalid replacement', encoding='utf-8')

    assert evaluator.load_manifest(path, content=frozen) == manifest


def test_changed_original_after_validation_stops_inference(saved_corpus, monkeypatch):
    path, _ = saved_corpus
    load_manifest = evaluator.load_manifest

    def validate_then_change(*args, **kwargs):
        manifest = load_manifest(*args, **kwargs)
        (path.parent / 'original.html').write_bytes(b'changed after validation')
        return manifest

    def unexpected_parse(page):
        pytest.fail('Changed original bytes must never reach the parser')

    monkeypatch.setattr(evaluator, 'load_manifest', validate_then_change)
    monkeypatch.setattr(evaluator, 'parse_publication', unexpected_parse)

    with pytest.raises(ValueError, match='SHA-256 mismatch'):
        evaluator.evaluate(path)


def stub_inference(monkeypatch, on_parse=None):
    def parse(page):
        if on_parse:
            on_parse()
        return SimpleNamespace(language='ru', title='Unchanged title', text='Unchanged source text', published_at=None)

    monkeypatch.setattr(evaluator, 'parse_publication', parse)
    monkeypatch.setattr(evaluator, 'extract', lambda *args: ([], []))
    monkeypatch.setattr(evaluator, 'match_candidates', lambda *args: [])


def test_manifest_mutation_invalidates_run_and_keeps_original_manifest_hash(saved_corpus, monkeypatch):
    path, manifest = saved_corpus
    initial_hash = evaluator.digest(path.read_bytes())

    def change_manifest():
        manifest['provenance']['changed_during_run'] = True
        path.write_text(json.dumps(manifest), encoding='utf-8')

    stub_inference(monkeypatch, change_manifest)

    report = evaluator.evaluate(path)

    assert report['manifest_sha256'] == initial_hash
    assert report['run_valid'] is False
    assert any('manifest' in item for item in report['inputs_changed_during_run'])
    assert report['overall']['evaluated_count'] == 1


def test_source_mutation_invalidates_run_and_keeps_initial_code_hashes(saved_corpus, monkeypatch):
    path, _ = saved_corpus
    hashes = iter([{'extractor': 'before'}, {'extractor': 'after'}])
    monkeypatch.setattr(evaluator, 'source_code_hashes', lambda: next(hashes))
    stub_inference(monkeypatch)

    report = evaluator.evaluate(path)

    assert report['source_code_sha256'] == {'extractor': 'before'}
    assert report['run_valid'] is False
    assert any('extractor' in item for item in report['inputs_changed_during_run'])


def test_original_mutation_during_parse_invalidates_run(saved_corpus, monkeypatch):
    path, _ = saved_corpus
    stub_inference(monkeypatch, lambda: (path.parent / 'original.html').write_bytes(b'changed during parse'))

    report = evaluator.evaluate(path)

    assert report['run_valid'] is False
    assert any('original' in item for item in report['inputs_changed_during_run'])
    assert report['overall']['evaluated_count'] == 1


def test_existing_report_is_preserved_without_running_inference(saved_corpus, monkeypatch):
    path, _ = saved_corpus
    output = path.parent / 'baseline.json'
    baseline = b'{"frozen": "first unseen result"}\n'
    output.write_bytes(baseline)
    monkeypatch.setattr(sys, 'argv', ['evaluate_publications', '--manifest', str(path), '--output', str(output)])

    def unexpected_evaluation(manifest):
        pytest.fail('Existing report must be rejected before inference')

    monkeypatch.setattr(evaluator, 'evaluate', unexpected_evaluation)

    with pytest.raises(SystemExit) as failure:
        evaluator.main()

    assert failure.value.code == 2
    assert output.read_bytes() == baseline


def test_report_created_by_another_run_during_inference_is_preserved(saved_corpus, monkeypatch):
    path, _ = saved_corpus
    output = path.parent / 'baseline.json'
    baseline = b'{"frozen": "concurrent result"}\n'
    monkeypatch.setattr(sys, 'argv', ['evaluate_publications', '--manifest', str(path), '--output', str(output)])

    def evaluate_while_another_run_finishes(manifest):
        output.write_bytes(baseline)
        return {'run_valid': True, 'overall': {'error_count': 0}, 'cases': []}

    monkeypatch.setattr(evaluator, 'evaluate', evaluate_while_another_run_finishes)

    with pytest.raises(SystemExit) as failure:
        evaluator.main()

    assert failure.value.code == 2
    assert output.read_bytes() == baseline


def test_cli_invalid_run_returns_failure_and_retains_report(saved_corpus, monkeypatch):
    path, _ = saved_corpus
    output = path.parent / 'invalid-run.json'
    report = {
        'run_valid': False,
        'inputs_changed_during_run': ['manifest'],
        'overall': {'error_count': 0},
        'by_language': {},
        'limitations': [],
        'cases': [],
    }
    monkeypatch.setattr(sys, 'argv', ['evaluate_publications', '--manifest', str(path), '--output', str(output)])
    monkeypatch.setattr(evaluator, 'evaluate', lambda manifest: report)

    assert evaluator.main() == 1
    assert json.loads(output.read_text(encoding='utf-8')) == report
