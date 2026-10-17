import copy
import json
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

import evaluate_ocr as evaluator
from PIL import Image


def sample(*, expected=True, predicted=True, target='p01', candidates=None, text='abc', observed='abc', readable=True):
    prediction = (
        None if predicted is None else {'payment_offer': predicted, 'text': observed, 'candidates': candidates or []}
    )
    return {
        'expected': {'payment_offer': expected, 'target_property_key': target, 'text': text, 'readable': readable},
        'image_pipeline': prediction,
        'ocr_output': None if predicted is None else {'text': observed},
    }


class EvaluationMetricsTests(unittest.TestCase):
    def test_confusion_matrix_and_failed_cases_do_not_inflate_results(self):
        rows = [
            sample(candidates=['p01']),
            sample(predicted=False),
            sample(expected=False),
            sample(expected=False, predicted=False),
            sample(predicted=None),
        ]
        value = evaluator.metrics(rows, 'image_pipeline')
        self.assertEqual(
            value['payment'],
            {
                'tp': 1,
                'fp': 1,
                'fn': 1,
                'tn': 1,
                'expected_positive': 3,
                'precision': 0.5,
                'recall_completed': 0.5,
                'recall_end_to_end': 1 / 3,
            },
        )
        self.assertEqual(value['coverage'], 4 / 5)
        self.assertEqual(value['matching']['top3_rate'], 1 / 5)
        self.assertFalse(evaluator.proposed_targets_met(value))

    def test_unmatched_failures_are_not_successful_abstentions(self):
        value = evaluator.metrics(
            [
                sample(expected=False, target=None, candidates=['p01']),
                sample(expected=False, target=None, predicted=None),
            ],
            'image_pipeline',
        )
        self.assertEqual(value['matching']['unmatched_count'], 2)
        self.assertEqual(value['matching']['unmatched_evaluated'], 1)
        self.assertEqual(value['matching']['unmatched_false_candidate_rate'], 1)

    def test_empty_ocr_is_a_false_negative_and_full_character_deletion(self):
        value = evaluator.metrics([sample(predicted=False, observed='')], 'image_pipeline')
        self.assertEqual(value['payment']['fn'], 1)
        self.assertEqual(value['ocr']['cer'], 1)
        self.assertEqual(value['coverage'], 1)

    def test_unreadable_labels_are_not_scored_and_zero_denominators_are_null(self):
        value = evaluator.metrics(
            [sample(readable=False, expected=None, target=None, candidates=['p01'])], 'image_pipeline'
        )
        self.assertIsNone(value['payment']['precision'])
        self.assertIsNone(value['payment']['recall_end_to_end'])
        self.assertIsNone(value['matching']['top3_rate'])
        self.assertIsNone(value['ocr']['cer'])
        self.assertEqual(value['unreadable']['with_payment'], 1)
        self.assertFalse(evaluator.proposed_targets_met(value))

    def test_cer_is_weighted_not_clamped_and_keeps_raw_ocr_after_extractor_failure(self):
        failed = sample(text='a', predicted=None)
        failed['ocr_output'] = {'text': 'aaaa'}
        value = evaluator.metrics([failed, sample(text='123456789', observed='123456789')], 'image_pipeline')
        self.assertEqual(value['ocr']['cer'], 3 / 10)
        self.assertEqual(value['ocr']['character_coverage'], 1)
        self.assertEqual(value['coverage'], 0.5)
        self.assertEqual(evaluator.metrics([failed], 'image_pipeline')['ocr']['cer'], 3)

    def test_character_coverage_tracks_failed_long_images(self):
        value = evaluator.metrics(
            [sample(text='a', observed='a'), sample(text='123456789', predicted=None)], 'image_pipeline'
        )
        self.assertEqual(value['ocr']['cer'], 0)
        self.assertEqual(value['ocr']['character_coverage'], 0.1)

    def test_normalization_does_not_erase_kazakh_letters_case_or_punctuation(self):
        self.assertEqual(evaluator.normalized_text('Ә\n  А,\u00a0қ'), 'Ә А, қ')
        self.assertNotEqual(evaluator.normalized_text('қ'), evaluator.normalized_text('к'))
        self.assertLess(evaluator.fraction(899999, 1000000), 0.90)


class EvaluationInputTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        Image.new('RGB', (40, 40), 'white').save(self.root / 'original.png')
        self.manifest = self.root / 'manifest.json'
        self.corpus = {
            'schema_version': 1,
            'provenance': {'kind': 'external'},
            'properties': [{'key': 'p01', 'name': 'DEMO Test', 'aliases': []}],
            'cases': [
                {
                    'id': 'ru-01',
                    'language': 'ru',
                    'text': 'DEMO. ЖК Test\nПлатная бронь 10 тенге',
                    'readable': True,
                    'payment_offer': True,
                    'target_property_key': 'p01',
                    'image': 'original.png',
                }
            ],
        }

    def save(self):
        self.manifest.write_text(json.dumps(self.corpus), encoding='utf-8')
        return evaluator.load_corpus(self.manifest)

    def test_paths_duplicate_ids_and_unknown_targets_rejected(self):
        for change in [
            {'image': '../outside.png'},
            {'id': '../escape'},
            {'target_property_key': 'missing'},
            {'payment_offer': 'false'},
            {'readable': False},
        ]:
            with self.subTest(change=change):
                original = copy.deepcopy(self.corpus)
                self.corpus['cases'][0].update(change)
                with self.assertRaises(ValueError):
                    self.save()
                self.corpus = original
        self.corpus['cases'].append(copy.deepcopy(self.corpus['cases'][0]))
        with self.assertRaises(ValueError):
            self.save()

    def test_labels_never_change_predictions_and_existing_output_is_preserved(self):
        for value in [True, False]:
            self.corpus['cases'][0]['payment_offer'] = value
            self.save()
            output = self.root / str(value)
            with (
                patch.object(evaluator, 'runtime_metadata', return_value={}),
                patch.object(evaluator, 'recognize', return_value=(self.corpus['cases'][0]['text'], [])),
            ):
                report = evaluator.evaluate(self.corpus, self.manifest, output, None, SimpleNamespace())
                self.assertFalse(report['protocol_eligible'])
                with self.assertRaises(FileExistsError):
                    evaluator.evaluate(self.corpus, self.manifest, output, None, SimpleNamespace())
        positive = json.loads((self.root / 'True/cases.jsonl').read_text(encoding='utf-8'))
        negative = json.loads((self.root / 'False/cases.jsonl').read_text(encoding='utf-8'))
        self.assertEqual(positive['image_pipeline'], negative['image_pipeline'])

    def test_extractor_exception_keeps_ocr_and_marks_run_failed(self):
        self.save()
        with (
            patch.object(evaluator, 'runtime_metadata', return_value={}),
            patch.object(evaluator, 'recognize', return_value=('raw OCR', [])),
            patch.object(evaluator, 'predict', side_effect=ValueError('test')),
        ):
            report = evaluator.evaluate(self.corpus, self.manifest, self.root / 'failed', None, SimpleNamespace())
        record = json.loads((self.root / 'failed/cases.jsonl').read_text(encoding='utf-8'))
        self.assertEqual(record['ocr_output']['text'], 'raw OCR')
        self.assertEqual(record['error']['stage'], 'extract_match')
        self.assertEqual(report['errors'], ['ru-01'])

    def test_runtime_preflight_failure_preserves_prior_evidence(self):
        self.save()
        output = self.root / 'preflight'
        with patch.object(evaluator, 'runtime_metadata', side_effect=FileNotFoundError('Tesseract missing')):
            with self.assertRaises(FileNotFoundError):
                evaluator.evaluate(self.corpus, self.manifest, output, None, SimpleNamespace())
        self.assertFalse(output.exists())

    def test_native_runtime_metadata_reads_system_encoded_cyrillic_path(self):
        directory = self.root / 'языки'
        directory.mkdir()
        (directory / 'rus.traineddata').write_bytes(b'bounded test model')

        def native_run(args, **kwargs):
            message = 'tesseract test\n' if args[-1] == '--version' else f'List in "{directory}" (1):\nrus\n'
            # Native Windows CLI metadata uses the system code page even with Python -X utf8.
            return SimpleNamespace(stdout=message.encode('cp1251').decode(kwargs.get('encoding', 'utf-8')))

        with (
            patch.object(evaluator.locale, 'getencoding', return_value='cp1251'),
            patch.object(evaluator.subprocess, 'run', side_effect=native_run),
        ):
            metadata = evaluator.runtime_metadata(None, SimpleNamespace(tesseract_command='test', ocr_languages='rus'))
        self.assertEqual(metadata['tesseract'], 'tesseract test')
        self.assertEqual(metadata['traineddata_sha256']['rus'], evaluator.sha256(b'bounded test model'))

    def test_modified_manifest_is_flagged_without_losing_the_loaded_snapshot(self):
        self.save()
        original = self.manifest.read_bytes()

        def change_manifest(*args):
            self.manifest.write_text('{}', encoding='utf-8')
            return 'raw OCR', []

        with (
            patch.object(evaluator, 'runtime_metadata', return_value={}),
            patch.object(evaluator, 'recognize', side_effect=change_manifest),
        ):
            report = evaluator.evaluate(self.corpus, self.manifest, self.root / 'mutated', None, SimpleNamespace())
        self.assertEqual(report['inputs_changed_during_run'], ['manifest_or_font'])
        self.assertEqual((self.root / 'mutated/manifest.json').read_bytes(), original)
        self.assertFalse(report['proposed_targets_met'])

    def test_v1_remains_unannotated_in_v2_report(self):
        self.save()
        with (
            patch.object(evaluator, 'runtime_metadata', return_value={}),
            patch.object(evaluator, 'recognize', return_value=(self.corpus['cases'][0]['text'], [])),
        ):
            report = evaluator.evaluate(self.corpus, self.manifest, self.root / 'v1', None, SimpleNamespace())
        self.assertEqual(report['schema_version'], 2)
        self.assertEqual(report['manifest_schema_version'], 1)
        fields = report['summaries']['all']['image_pipeline']['structured_fields']
        self.assertEqual(fields['annotation_status'], 'not_annotated')
        self.assertIsNone(fields['scores'])
        self.assertIn('scripts/evaluation_fields.py', report['source_sha256'])
        self.assertFalse(report['acceptance_established'])

    def test_v2_fields_are_scored_for_both_pipelines(self):
        self.corpus['schema_version'] = 2
        case = self.corpus['cases'][0]
        quote = 'Платная бронь 10 тенге'
        start = case['text'].index(quote)
        amount_start = case['text'].index('10 тенге')
        money = {'amount': '10.00', 'currency': 'KZT'}
        case['field_labels'] = {
            'amounts': [
                {
                    'money': money,
                    'fragment': {'start_offset': amount_start, 'end_offset': len(case['text']), 'quote': '10 тенге'},
                }
            ],
            'payment_terms': [
                {
                    'money': money,
                    'percent': None,
                    'fragment': {'start_offset': start, 'end_offset': len(case['text']), 'quote': quote},
                }
            ],
        }
        self.save()
        with (
            patch.object(evaluator, 'runtime_metadata', return_value={}),
            patch.object(evaluator, 'recognize', return_value=(case['text'], [])),
        ):
            report = evaluator.evaluate(self.corpus, self.manifest, self.root / 'v2', None, SimpleNamespace())
        for pipeline in ('text_baseline', 'image_pipeline'):
            fields = report['summaries']['ru'][pipeline]['structured_fields']
            self.assertEqual(fields['scores']['money']['tp'], 1)
            self.assertEqual(fields['scores']['payment_binding']['tp'], 1)
        self.assertEqual(report['summaries']['kz']['image_pipeline']['structured_fields']['annotated_case_count'], 0)
        case['field_labels']['payment_terms'][0]['money'] = {'amount': '11', 'currency': 'KZT'}
        self.save()
        with (
            patch.object(evaluator, 'runtime_metadata', return_value={}),
            patch.object(evaluator, 'recognize', return_value=(case['text'], [])),
        ):
            relabeled = evaluator.evaluate(self.corpus, self.manifest, self.root / 'relabeled', None, SimpleNamespace())
        self.assertEqual(
            relabeled['summaries']['all']['image_pipeline']['structured_fields']['scores']['payment_value']['tp'], 0
        )
        original_prediction = json.loads((self.root / 'v2/cases.jsonl').read_text(encoding='utf-8'))['image_pipeline']
        relabeled_prediction = json.loads((self.root / 'relabeled/cases.jsonl').read_text(encoding='utf-8'))[
            'image_pipeline'
        ]
        self.assertEqual(original_prediction, relabeled_prediction)

    def test_v2_labels_required_and_v1_cannot_silently_score_them(self):
        self.corpus['schema_version'] = 2
        with self.assertRaises(ValueError):
            self.save()
        self.corpus['schema_version'] = 1
        self.corpus['cases'][0]['field_labels'] = {'amounts': [], 'payment_terms': []}
        with self.assertRaises(ValueError):
            self.save()


if __name__ == '__main__':
    unittest.main()
