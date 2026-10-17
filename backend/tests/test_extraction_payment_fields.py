from uuid import uuid4

import pytest

from app.extraction import extract, payment_offer


@pytest.mark.parametrize(
    'unnamed_project',
    [
        'Конкретный жилой комплекс не предлагается.',
        'Жилой комплекс не указан.',
        'Жилой комплекс не назван.',
        'Нақты тұрғын үй кешені ұсынылмайды.',
        'Тұрғын үй кешені көрсетілмеген.',
        'Тұрғын үй кешені аталмаған.',
    ],
)
def test_generic_project_absence_does_not_turn_bank_information_into_an_offer(unnamed_project):
    text = 'Банк описал программу ипотечного займа. Первоначальный взнос по программе — 15%.\n' + unnamed_project

    hypotheses, _ = extract(text, uuid4(), uuid4(), [])

    assert not payment_offer(text)
    assert not any(h['field'] in {'PROPERTY_NAME', 'PAYMENT_TERM'} for h in hypotheses)


def test_kazakh_generic_project_absence_preserves_loan_amount_without_payment_term():
    text = (
        'Банк ипотекалық несие бағдарламасын таныстырды.\n'
        'Несие сомасы — 9 млн теңге.\n'
        'Бағдарлама бойынша бастапқы жарна — 20%.\n'
        'Нақты тұрғын үй кешені ұсынылмайды.'
    )

    hypotheses, _ = extract(text, uuid4(), uuid4(), [])

    assert not payment_offer(text)
    assert not any(h['field'] in {'PROPERTY_NAME', 'PAYMENT_TERM'} for h in hypotheses)
    amounts = [h['value']['money'] for h in hypotheses if h['field'] == 'AMOUNT']
    assert amounts == [{'amount': '9000000', 'currency': 'KZT'}]


@pytest.mark.parametrize(
    'offer',
    [
        'Внесите первоначальный взнос 15%.',
        'Платная бронь 250 000 тенге.',
        'Бастапқы жарна 15% енгізіңіз.',
        'Ақылы брондау 250 000 теңге.',
        'ЖК «DEMO Тестовый». Первоначальный взнос 15%.',
    ],
)
def test_generic_project_absence_does_not_hide_explicit_or_named_offer(offer):
    text = 'Банк описал программу ипотечного займа. Жилой комплекс не указан. ' + offer

    hypotheses, _ = extract(text, uuid4(), uuid4(), [])

    assert payment_offer(text)
    assert any(h['field'] == 'PAYMENT_TERM' for h in hypotheses)


@pytest.mark.parametrize(
    ('text', 'amount', 'percent'),
    [
        ('Внесите аванс 10% и депозит 250 000 тенге.', '250000', 10),
        ('Депозит 250 000 тенге и аванс 10%.', '250000', 10),
        ('Алдын ала төлем — 12% және кепілақы — 350 000 теңге.', '350000', 12),
        ('Кепілақы — 350 мың теңге және бастапқы жарна — 12%.', '350000', 12),
        ('Внесите аванс 10% и депозит 250\n000 тенге.', '250000', 10),
    ],
)
def test_composite_payment_keeps_money_percent_and_exact_source(text, amount, percent):
    source = '🏠 DEMO.\n' + text
    asset_id, extraction_id = uuid4(), uuid4()
    start = source.index(text)
    words = [{'start': start, 'end': len(source), 'x': 4, 'y': 8, 'width': 120, 'height': 28}]

    hypotheses, _ = extract(source, asset_id, extraction_id, [], words)

    terms = [h for h in hypotheses if h['field'] == 'PAYMENT_TERM']
    assert len(terms) == 1
    term = terms[0]
    assert term['value'] == {'text': text, 'money': {'amount': amount, 'currency': 'KZT'}, 'percent': percent}
    assert term['fragment'] == {
        'asset_id': str(asset_id),
        'text_version_id': str(extraction_id),
        'quote': text,
        'start_offset': start,
        'end_offset': len(source),
        'bbox': {'x': 4, 'y': 8, 'width': 120, 'height': 28},
    }
    assert term['review_status'] == 'PENDING'
    assert term['reviewed_value'] is None
    assert term['confidence'] is None


@pytest.mark.parametrize(
    ('text', 'money', 'percent'),
    [
        ('Аванс 10%, цена квартиры 30 млн тенге.', None, 10),
        ('Аванс 10% и депозит не требуется, цена квартиры 30 млн тенге.', None, 10),
        ('Платная бронь 250 000 тенге, ставка ипотеки 12%.', {'amount': '250000', 'currency': 'KZT'}, None),
        ('Депозит 250 000 тенге и скидка 10%.', {'amount': '250000', 'currency': 'KZT'}, None),
        ('Алдын ала төлем — 12%, пәтердің бағасы — 18 млн теңге.', None, 12),
    ],
)
def test_composite_payment_does_not_collect_unrelated_values(text, money, percent):
    hypotheses, _ = extract(text, uuid4(), uuid4(), [])

    terms = [h for h in hypotheses if h['field'] == 'PAYMENT_TERM']
    assert len(terms) == 1
    assert terms[0]['value']['money'] == money
    assert terms[0]['value']['percent'] == percent


def test_separate_clauses_do_not_combine_their_payment_values():
    text = 'Аванс 10%. Депозит 250 000 тенге.'

    hypotheses, _ = extract(text, uuid4(), uuid4(), [])

    terms = [h for h in hypotheses if h['field'] == 'PAYMENT_TERM']
    assert [h['value'] for h in terms] == [
        {'text': 'Аванс 10%.', 'money': None, 'percent': 10},
        {'text': 'Депозит 250 000 тенге.', 'money': {'amount': '250000', 'currency': 'KZT'}, 'percent': None},
    ]


def test_long_composite_quote_keeps_both_values_in_the_bounded_source():
    text = ('Описание ' * 260) + 'Внесите аванс 10% и депозит 250 000 тенге.'

    hypotheses, _ = extract(text, uuid4(), uuid4(), [])

    term = next(h for h in hypotheses if h['field'] == 'PAYMENT_TERM')
    quote = term['fragment']['quote']
    assert len(quote) <= 2000
    assert 'Внесите аванс 10% и депозит 250 000 тенге.' in quote
    assert text[term['fragment']['start_offset'] : term['fragment']['end_offset']] == quote
    assert term['value']['money'] == {'amount': '250000', 'currency': 'KZT'}
    assert term['value']['percent'] == 10
