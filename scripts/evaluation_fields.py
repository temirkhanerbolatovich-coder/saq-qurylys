"""Versioned, offline field scoring shared by the image and publication evaluators."""

import re
from collections import Counter
from decimal import Decimal

from rapidfuzz.distance import Levenshtein

MAX_REFERENCE = 100_000
MAX_LABELS = 250
METRICS = (
    'amount',
    'currency',
    'money',
    'percent',
    'payment_value',
    'payment_fragment',
    'payment_binding',
    'amount_binding',
)


def number(value):
    """Canonical finite non-negative decimal; labels use strings to retain precision."""
    if not isinstance(value, str) or not re.fullmatch(r'\d{1,24}(?:\.\d{1,12})?', value):
        raise ValueError('Expected a bounded non-negative decimal string')
    return Decimal(value)


def money_key(value):
    if not isinstance(value, dict) or set(value) != {'amount', 'currency'}:
        raise ValueError('Money requires amount and currency')
    if value['currency'] not in ('KZT', 'USD', 'EUR'):
        raise ValueError('Unsupported currency')
    return number(value['amount']), value['currency']


def valid_fragment(text, value):
    if not isinstance(value, dict):
        return False
    start, end = value.get('start_offset'), value.get('end_offset')
    return (
        type(start) is int
        and type(end) is int
        and 0 <= start < end <= len(text)
        and isinstance(value.get('quote'), str)
        and bool(value['quote'].strip())
        and text[start:end] == value['quote']
    )


def validate_labels(labels, reference, payment_offer, *, readable=True):
    """Validate complete v2 annotations without consulting production predictions."""
    if not readable:
        if labels is not None:
            raise ValueError('Unreadable cases require null field_labels')
        return
    if type(payment_offer) is not bool:
        raise ValueError('Payment label must be a Boolean')
    if not isinstance(reference, str) or not 1 <= len(reference) <= MAX_REFERENCE:
        raise ValueError('Field labels require bounded reference text')
    if not isinstance(labels, dict) or set(labels) != {'amounts', 'payment_terms'}:
        raise ValueError('field_labels requires amounts and payment_terms')
    for field in ('amounts', 'payment_terms'):
        entries = labels[field]
        if not isinstance(entries, list) or len(entries) > MAX_LABELS:
            raise ValueError('Expected at most 250 annotations per field')
        spans = set()
        for item in entries:
            required = {'money', 'fragment'} if field == 'amounts' else {'money', 'percent', 'fragment'}
            if not isinstance(item, dict) or set(item) != required:
                raise ValueError(f'Invalid {field} annotation keys')
            if not valid_fragment(reference, item['fragment']):
                raise ValueError('Annotation must quote its exact reference span')
            span = item['fragment']['start_offset'], item['fragment']['end_offset']
            if span in spans:
                raise ValueError('Duplicate annotation span')
            spans.add(span)
            if item['money'] is not None:
                money_key(item['money'])
            elif field == 'amounts':
                raise ValueError('Amount annotation requires money')
            if field == 'payment_terms' and item['percent'] is not None:
                if number(item['percent']) > 100:
                    raise ValueError('Percent must be within 0..100')
    if bool(labels['payment_terms']) != payment_offer:
        raise ValueError('Payment label contradicts payment_terms')


def normalized_source(text):
    """Collapse whitespace only, retaining raw character positions for every token."""
    positions, parts, length = {}, [], 0
    for token in re.finditer(r'\S+', text):
        if parts:
            length += 1
        parts.append(token.group())
        for index in range(token.start(), token.end()):
            positions[index] = length + index - token.start()
        length += len(token.group())
    return ' '.join(parts), positions


def normalized_span(text, fragment, positions):
    if not valid_fragment(text, fragment):
        return None
    start, end = fragment['start_offset'], fragment['end_offset']
    while text[start].isspace():
        start += 1
    while text[end - 1].isspace():
        end -= 1
    return positions[start], positions[end - 1] + 1


def prediction_money(value):
    try:
        return money_key(value)
    except (ValueError, TypeError):
        return ('INVALID_MONEY',)


def payment_value(item, *, prediction=False):
    money = item.get('money')
    money = (prediction_money(money) if prediction else money_key(money)) if money is not None else None
    percent = item.get('percent')
    if percent is not None:
        try:
            percent = number(str(percent))
            if percent > 100:
                raise ValueError('Percent exceeds 100')
        except (ValueError, TypeError):
            percent = 'INVALID_PERCENT'
    return money, percent


def field_tokens(labels, fragment_key, *, prediction=False):
    tokens = {name: [] for name in METRICS}
    for item in labels['amounts']:
        money = prediction_money(item.get('money')) if prediction else money_key(item['money'])
        tokens['money'].append(money)
        tokens['amount'].append(money[0])
        tokens['currency'].append(money[1] if len(money) == 2 else 'INVALID_CURRENCY')
        tokens['amount_binding'].append((money, fragment_key(item['fragment'])))
    for item in labels['payment_terms']:
        value = payment_value(item, prediction=prediction)
        span = fragment_key(item['fragment'])
        if value[1] is not None:
            tokens['percent'].append(value[1])
        tokens['payment_value'].append(value)
        tokens['payment_fragment'].append(span)
        tokens['payment_binding'].append((value, span))
    return tokens


def structured_metrics(records):
    """Score all annotated cases, including inference failures in recall denominators.

    Each row has reference_text, field_labels (None means unannotated) and prediction
    with raw text/hypotheses. Grounding uses unchanged, aligned whitespace-normalized
    source intervals; substitutions inside a quote deliberately fail this strict test.
    """
    annotated = [row for row in records if row['field_labels'] is not None]
    result = {
        'annotation_status': 'not_annotated'
        if not annotated
        else 'annotated'
        if len(annotated) == len(records)
        else 'partial',
        'eligible_case_count': len(records),
        'annotated_case_count': len(annotated),
        'evaluated_case_count': sum(row['prediction'] is not None for row in annotated),
        'coverage': None,
        'raw_fragment_count': 0,
        'raw_fragment_valid': 0,
        'scores': None,
    }
    if not annotated:
        return result
    result['coverage'] = result['evaluated_case_count'] / len(annotated)
    totals = {name: Counter() for name in METRICS}
    for row in annotated:
        reference = row['reference_text']
        ref_normalized, ref_positions = normalized_source(reference)
        expected = field_tokens(row['field_labels'], lambda frag: normalized_span(reference, frag, ref_positions))
        predicted = {name: [] for name in METRICS}
        prediction = row['prediction']
        if prediction is not None:
            observed = prediction['text']
            if len(observed) > MAX_REFERENCE:
                # Bound alignment work; value metrics remain available, strict binding fails.
                observed_normalized, positions, equal = '', {}, []
            else:
                observed_normalized, positions = normalized_source(observed)
                equal = [op for op in Levenshtein.opcodes(ref_normalized, observed_normalized) if op.tag == 'equal']

            def mapped_fragment(frag):
                result['raw_fragment_count'] += 1
                result['raw_fragment_valid'] += valid_fragment(observed, frag)
                if not positions:
                    return None
                span = normalized_span(observed, frag, positions)
                if span is not None:
                    for op in equal:
                        if op.dest_start <= span[0] and span[1] <= op.dest_end:
                            return op.src_start + span[0] - op.dest_start, op.src_start + span[1] - op.dest_start
                return None

            hypotheses = prediction.get('hypotheses', [])
            labels = {
                field: [{**h['value'], 'fragment': h['fragment']} for h in hypotheses if h['field'] == name]
                for field, name in [('amounts', 'AMOUNT'), ('payment_terms', 'PAYMENT_TERM')]
            }
            predicted = field_tokens(labels, mapped_fragment, prediction=True)
        for name in METRICS:
            gold, actual = Counter(expected[name]), Counter(predicted[name])
            hits = sum((gold & actual).values())
            totals[name].update(tp=hits, fp=sum(actual.values()) - hits, fn=sum(gold.values()) - hits)
    result['scores'] = {}
    for name, counts in totals.items():
        tp, fp, fn = counts['tp'], counts['fp'], counts['fn']
        result['scores'][name] = {
            'tp': tp,
            'fp': fp,
            'fn': fn,
            'expected': tp + fn,
            'predicted': tp + fp,
            'precision': tp / (tp + fp) if tp + fp else None,
            'recall_end_to_end': tp / (tp + fn) if tp + fn else None,
        }
    return result
