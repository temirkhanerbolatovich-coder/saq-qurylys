import copy
import unittest

import evaluation_fields as fields


def fragment(text, quote, occurrence=0):
    start = -1
    for _ in range(occurrence + 1):
        start = text.index(quote, start + 1)
    return {'start_offset': start, 'end_offset': start + len(quote), 'quote': quote}


def money(amount='100', currency='KZT'):
    return {'amount': amount, 'currency': currency}


def annotations(text='Бронь 100 ₸.', *, amount='100', currency='KZT', percent=None):
    value = money(amount, currency)
    return {
        'amounts': [{'money': value, 'fragment': fragment(text, '100 ₸')}],
        'payment_terms': [{'money': value, 'percent': percent, 'fragment': fragment(text, text)}],
    }


def hypotheses(labels):
    return [
        {
            'field': name,
            'value': copy.deepcopy({key: value for key, value in item.items() if key != 'fragment'}),
            'fragment': copy.deepcopy(item['fragment']),
        }
        for key, name in [('amounts', 'AMOUNT'), ('payment_terms', 'PAYMENT_TERM')]
        for item in labels[key]
    ]


def record(text, labels, *, observed=None, predicted=None, failed=False):
    return {
        'reference_text': text,
        'field_labels': labels,
        'prediction': None
        if failed
        else {
            'text': text if observed is None else observed,
            'hypotheses': hypotheses(labels) if predicted is None and labels is not None else predicted or [],
        },
    }


class FieldAnnotationValidationTests(unittest.TestCase):
    def setUp(self):
        self.text = 'Бронь 100 ₸.'
        self.labels = annotations(self.text)

    def assert_invalid(self, labels, *, text=None, payment_offer=True):
        with self.assertRaises(ValueError):
            fields.validate_labels(labels, self.text if text is None else text, payment_offer)

    def test_accepts_separately_annotated_amount_and_payment_on_the_same_span(self):
        self.labels['amounts'][0]['fragment'] = fragment(self.text, self.text)
        fields.validate_labels(self.labels, self.text, True)

    def test_offsets_must_be_real_integers_inside_the_reference(self):
        for start, end in [(True, 9), (0, False), (-1, 9), (0, len(self.text) + 1), (4, 4), (9, 4), (0.0, 9)]:
            with self.subTest(start=start, end=end):
                labels = copy.deepcopy(self.labels)
                labels['payment_terms'][0]['fragment'].update(start_offset=start, end_offset=end)
                self.assert_invalid(labels)

    def test_quote_must_match_its_exact_offsets(self):
        for quote in ['Бронь 100 $.', '', '  ', None]:
            with self.subTest(quote=quote):
                labels = copy.deepcopy(self.labels)
                labels['payment_terms'][0]['fragment']['quote'] = quote
                self.assert_invalid(labels)

    def test_money_requires_a_bounded_decimal_string_and_supported_currency(self):
        for amount in [True, 100, 1.5, 'NaN', 'Infinity', '-1', '1e3', '1,50', '1' * 25, '0.' + '1' * 13]:
            with self.subTest(amount=amount):
                labels = copy.deepcopy(self.labels)
                labels['amounts'][0]['money'] = money(amount)
                self.assert_invalid(labels)
        for currency in ['AUD', 'kzt', '', None, True]:
            with self.subTest(currency=currency):
                labels = copy.deepcopy(self.labels)
                labels['amounts'][0]['money'] = money(currency=currency)
                self.assert_invalid(labels)

    def test_money_requires_both_fields_without_extra_or_missing_values(self):
        for value in [None, {}, {'amount': '100'}, {'currency': 'KZT'}, {**money(), 'scale': 1000}]:
            with self.subTest(value=value):
                labels = copy.deepcopy(self.labels)
                labels['amounts'][0]['money'] = value
                self.assert_invalid(labels)

    def test_percent_is_a_finite_decimal_string_between_zero_and_one_hundred(self):
        for percent in [False, 25, 'NaN', 'Infinity', '-0.1', '100.0001', '1e1']:
            with self.subTest(percent=percent):
                labels = copy.deepcopy(self.labels)
                labels['payment_terms'][0]['percent'] = percent
                self.assert_invalid(labels)
        for percent in ['0', '25.50', '100.000']:
            with self.subTest(valid_percent=percent):
                labels = copy.deepcopy(self.labels)
                labels['payment_terms'][0]['percent'] = percent
                fields.validate_labels(labels, self.text, True)

    def test_duplicate_spans_within_each_field_are_rejected(self):
        for field in ['amounts', 'payment_terms']:
            with self.subTest(field=field):
                labels = copy.deepcopy(self.labels)
                labels[field].append(copy.deepcopy(labels[field][0]))
                self.assert_invalid(labels)

    def test_reference_and_annotation_counts_are_bounded(self):
        self.assert_invalid(self.labels, text='x' * (fields.MAX_REFERENCE + 1))
        for field in ['amounts', 'payment_terms']:
            with self.subTest(field=field):
                labels = copy.deepcopy(self.labels)
                labels[field] = [copy.deepcopy(labels[field][0]) for _ in range(fields.MAX_LABELS + 1)]
                self.assert_invalid(labels)

    def test_unknown_annotation_keys_are_rejected(self):
        for mutation in ['root', 'amount', 'payment']:
            with self.subTest(mutation=mutation):
                labels = copy.deepcopy(self.labels)
                if mutation == 'root':
                    labels['other'] = []
                else:
                    labels['amounts' if mutation == 'amount' else 'payment_terms'][0]['other'] = None
                self.assert_invalid(labels)

    def test_payment_offer_must_agree_with_the_presence_of_payment_terms(self):
        self.assert_invalid(self.labels, payment_offer=False)
        self.assert_invalid({'amounts': [], 'payment_terms': []}, payment_offer=True)
        fields.validate_labels({'amounts': [], 'payment_terms': []}, self.text, False)

    def test_payment_offer_requires_a_boolean_instead_of_numeric_equivalents(self):
        for payment_offer in [1, 'true', None]:
            with self.subTest(payment_offer=payment_offer):
                self.assert_invalid(self.labels, payment_offer=payment_offer)
        self.assert_invalid({'amounts': [], 'payment_terms': []}, payment_offer=0)

    def test_unreadable_cases_allow_only_null_field_labels(self):
        fields.validate_labels(None, self.text, None, readable=False)
        with self.assertRaises(ValueError):
            fields.validate_labels(self.labels, self.text, None, readable=False)
        self.assert_invalid(None)


class StructuredFieldMetricsTests(unittest.TestCase):
    def setUp(self):
        self.text = 'Бронь 100 ₸.'
        self.labels = annotations(self.text)

    def score(self, rows, name):
        return fields.structured_metrics(rows)['scores'][name]

    def assert_counts(self, value, *, tp, fp, fn):
        self.assertEqual((value['tp'], value['fp'], value['fn']), (tp, fp, fn))
        self.assertEqual(value['expected'], tp + fn)
        self.assertEqual(value['predicted'], tp + fp)

    def test_decimal_formatting_is_canonical_and_payment_percent_accepts_numeric_predictions(self):
        text = 'Бронь 100 ₸, взнос 25%.'
        labels = annotations(text, amount='100.00', percent='25.00')
        predicted = hypotheses(labels)
        predicted[0]['value']['money']['amount'] = '100.000'
        predicted[1]['value']['money']['amount'] = '100.0000'
        predicted[1]['value']['percent'] = 25.0
        value = fields.structured_metrics([record(text, labels, predicted=predicted)])
        self.assertEqual(labels['amounts'][0]['money']['amount'], '100.00')
        for name in fields.METRICS:
            with self.subTest(metric=name):
                self.assert_counts(value['scores'][name], tp=1, fp=0, fn=0)
        self.assertEqual(value['raw_fragment_valid'], 2)
        self.assertEqual(value['raw_fragment_count'], 2)

    def test_wrong_currency_does_not_receive_credit_for_joint_money(self):
        predicted = hypotheses(self.labels)
        for item in predicted:
            item['value']['money'] = money(currency='USD')
        rows = [record(self.text, self.labels, predicted=predicted)]
        self.assert_counts(self.score(rows, 'amount'), tp=1, fp=0, fn=0)
        for name in ['currency', 'money', 'amount_binding', 'payment_value', 'payment_binding']:
            with self.subTest(metric=name):
                self.assert_counts(self.score(rows, name), tp=0, fp=1, fn=1)
        self.assert_counts(self.score(rows, 'payment_fragment'), tp=1, fp=0, fn=0)

    def test_a_percent_cannot_replace_an_equal_numeric_money_amount(self):
        predicted = hypotheses(self.labels)
        predicted[1]['value'].update(money=None, percent=100)
        rows = [record(self.text, self.labels, predicted=predicted)]
        self.assert_counts(self.score(rows, 'amount'), tp=1, fp=0, fn=0)
        self.assert_counts(self.score(rows, 'percent'), tp=0, fp=1, fn=0)
        self.assert_counts(self.score(rows, 'payment_value'), tp=0, fp=1, fn=1)
        self.assert_counts(self.score(rows, 'payment_binding'), tp=0, fp=1, fn=1)

    def test_same_values_attached_to_another_clause_fail_binding(self):
        text = 'Бронь 100 ₸. Комиссия 100 ₸.'
        labels = {
            'amounts': [{'money': money(), 'fragment': fragment(text, '100 ₸')}],
            'payment_terms': [{'money': money(), 'percent': None, 'fragment': fragment(text, 'Бронь 100 ₸.')}],
        }
        predicted = hypotheses(labels)
        predicted[0]['fragment'] = fragment(text, '100 ₸', occurrence=1)
        predicted[1]['fragment'] = fragment(text, 'Комиссия 100 ₸.')
        rows = [record(text, labels, predicted=predicted)]
        self.assert_counts(self.score(rows, 'money'), tp=1, fp=0, fn=0)
        self.assert_counts(self.score(rows, 'payment_value'), tp=1, fp=0, fn=0)
        for name in ['amount_binding', 'payment_fragment', 'payment_binding']:
            with self.subTest(metric=name):
                self.assert_counts(self.score(rows, name), tp=0, fp=1, fn=1)

    def test_duplicate_predictions_match_each_reference_occurrence_only_once(self):
        predicted = hypotheses(self.labels)
        predicted += copy.deepcopy(predicted)
        rows = [record(self.text, self.labels, predicted=predicted)]
        for name in ['money', 'amount_binding', 'payment_value', 'payment_fragment', 'payment_binding']:
            with self.subTest(metric=name):
                self.assert_counts(self.score(rows, name), tp=1, fp=1, fn=0)

    def test_repeated_values_do_not_hide_a_missing_second_source_occurrence(self):
        text = 'Бронь 100 ₸. Взнос 100 ₸.'
        labels = {
            'amounts': [
                {'money': money(), 'fragment': fragment(text, '100 ₸', occurrence=index)} for index in range(2)
            ],
            'payment_terms': [],
        }
        predicted = hypotheses(labels)
        predicted[1]['fragment'] = copy.deepcopy(predicted[0]['fragment'])
        rows = [record(text, labels, predicted=predicted)]
        self.assert_counts(self.score(rows, 'money'), tp=2, fp=0, fn=0)
        self.assert_counts(self.score(rows, 'amount_binding'), tp=1, fp=1, fn=1)

    def test_inference_failures_remain_false_negatives_in_end_to_end_recall(self):
        rows = [record(self.text, self.labels), record(self.text, self.labels, failed=True)]
        result = fields.structured_metrics(rows)
        self.assertEqual(result['annotation_status'], 'annotated')
        self.assertEqual(result['evaluated_case_count'], 1)
        self.assertEqual(result['coverage'], 0.5)
        for name in ['money', 'amount_binding', 'payment_value', 'payment_fragment', 'payment_binding']:
            with self.subTest(metric=name):
                score = result['scores'][name]
                self.assert_counts(score, tp=1, fp=0, fn=1)
                self.assertEqual(score['precision'], 1)
                self.assertEqual(score['recall_end_to_end'], 0.5)

    def test_legacy_unannotated_rows_have_no_structured_scores(self):
        result = fields.structured_metrics([record(self.text, None)])
        self.assertEqual(result['annotation_status'], 'not_annotated')
        self.assertEqual(result['eligible_case_count'], 1)
        self.assertEqual(result['annotated_case_count'], 0)
        self.assertIsNone(result['coverage'])
        self.assertIsNone(result['scores'])

    def test_mixed_annotation_coverage_does_not_treat_unannotated_rows_as_negatives(self):
        rows = [
            record(self.text, self.labels),
            record(self.text, self.labels, failed=True),
            record(self.text, None, predicted=hypotheses(self.labels)),
        ]
        result = fields.structured_metrics(rows)
        self.assertEqual(result['annotation_status'], 'partial')
        self.assertEqual(result['eligible_case_count'], 3)
        self.assertEqual(result['annotated_case_count'], 2)
        self.assertEqual(result['coverage'], 0.5)
        self.assert_counts(result['scores']['money'], tp=1, fp=0, fn=1)

    def test_negative_empty_labels_keep_zero_denominators_null(self):
        empty = {'amounts': [], 'payment_terms': []}
        result = fields.structured_metrics([record(self.text, empty)])
        self.assertEqual(result['annotation_status'], 'annotated')
        self.assertEqual(result['coverage'], 1)
        for name, score in result['scores'].items():
            with self.subTest(metric=name):
                self.assert_counts(score, tp=0, fp=0, fn=0)
                self.assertIsNone(score['precision'])
                self.assertIsNone(score['recall_end_to_end'])

    def test_hallucinations_on_negative_cases_count_as_false_positives(self):
        empty = {'amounts': [], 'payment_terms': []}
        rows = [record(self.text, empty, predicted=hypotheses(self.labels))]
        for name in ['amount', 'currency', 'money', 'amount_binding', 'payment_binding']:
            with self.subTest(metric=name):
                score = self.score(rows, name)
                self.assert_counts(score, tp=0, fp=1, fn=0)
                self.assertEqual(score['precision'], 0)
                self.assertIsNone(score['recall_end_to_end'])

    def test_prefix_insertion_and_whitespace_changes_preserve_aligned_grounding(self):
        observed = 'DEMO\n\nБронь\t  100   ₸.'
        predicted = hypotheses(self.labels)
        predicted[0]['fragment'] = fragment(observed, '100   ₸')
        predicted[1]['fragment'] = fragment(observed, 'Бронь\t  100   ₸.')
        rows = [record(self.text, self.labels, observed=observed, predicted=predicted)]
        for name in ['amount_binding', 'payment_fragment', 'payment_binding']:
            with self.subTest(metric=name):
                self.assert_counts(self.score(rows, name), tp=1, fp=0, fn=0)

    def test_ocr_substitution_inside_a_quote_fails_strict_grounding(self):
        observed = 'Бронь 1OO ₸.'
        predicted = hypotheses(self.labels)
        predicted[0]['fragment'] = fragment(observed, '1OO ₸')
        predicted[1]['fragment'] = fragment(observed, observed)
        rows = [record(self.text, self.labels, observed=observed, predicted=predicted)]
        result = fields.structured_metrics(rows)
        self.assertEqual(result['raw_fragment_valid'], 2)
        self.assert_counts(result['scores']['money'], tp=1, fp=0, fn=0)
        for name in ['amount_binding', 'payment_fragment', 'payment_binding']:
            with self.subTest(metric=name):
                self.assert_counts(result['scores'][name], tp=0, fp=1, fn=1)

    def test_invalid_raw_quotes_never_receive_grounding_credit(self):
        predicted = hypotheses(self.labels)
        for item in predicted:
            item['fragment']['quote'] = 'выдуманный текст'
        result = fields.structured_metrics([record(self.text, self.labels, predicted=predicted)])
        self.assertEqual(result['raw_fragment_count'], 2)
        self.assertEqual(result['raw_fragment_valid'], 0)
        self.assert_counts(result['scores']['money'], tp=1, fp=0, fn=0)
        for name in ['amount_binding', 'payment_fragment', 'payment_binding']:
            with self.subTest(metric=name):
                self.assert_counts(result['scores'][name], tp=0, fp=1, fn=1)

    def test_empty_or_oversized_observed_text_cannot_gain_grounding_credit(self):
        for observed in ['', 'x' * (fields.MAX_REFERENCE + 1)]:
            with self.subTest(length=len(observed)):
                rows = [record(self.text, self.labels, observed=observed, predicted=hypotheses(self.labels))]
                self.assert_counts(self.score(rows, 'money'), tp=1, fp=0, fn=0)
                self.assert_counts(self.score(rows, 'amount_binding'), tp=0, fp=1, fn=1)

    def test_invalid_predicted_money_and_percent_count_as_errors_instead_of_crashing(self):
        predicted = hypotheses(self.labels)
        predicted[0]['value']['money'] = money('NaN')
        predicted[1]['value'].update(money=money(currency='AUD'), percent=float('nan'))
        rows = [record(self.text, self.labels, predicted=predicted)]
        self.assert_counts(self.score(rows, 'money'), tp=0, fp=1, fn=1)
        self.assert_counts(self.score(rows, 'payment_value'), tp=0, fp=1, fn=1)
        self.assert_counts(self.score(rows, 'percent'), tp=0, fp=1, fn=0)


if __name__ == '__main__':
    unittest.main()
