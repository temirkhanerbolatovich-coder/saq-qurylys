from uuid import uuid4

import pytest

from app.extraction import extract, payment_offer


@pytest.mark.parametrize(
    ('text', 'positive'),
    [
        ('Оплатите аванс в размере 320 тыс. тенге.', True),
        ('Задаток 125\n000 тенге.', True),
        ('Аванс\n240 000 KZT.', True),
        ('Первоначальный\nвзнос — 15%.', True),
        ('Алдын ала\nтөлеңіз: 9%.', True),
        ('Внесите плату за бронь 195\n000 т.', True),
        ('Внесите 210 000 тенге за резервирование квартиры.', True),
        ('Құнының 9%-ын алдын ала төлеңіз.', True),
        ('Бесплатное резервирование квартиры за 30 млн тенге.', False),
        ('Резервирование без оплаты, квартира 30 млн тенге.', False),
        ('Резервирование бесплатно, цена 30 млн тенге.', False),
        ('Не оплачивайте резервирование 100 000 тенге.', False),
        ('Алдын ала төлем талап етілмейді, бағасы 30 млн теңге.', False),
        ('Алдын ала төлем жасамаңыз: 300 000 теңге.', False),
        ('Алдын ала төлем жоқ, бағасы 30 млн теңге.', False),
        ('В макете прошлогодней акции упоминался аванс 10%.', False),
        ('Былтырғы макетте 20% алғашқы жарна туралы жазылған еді.', False),
        ('Ескі жарнама үлгісінде 60 000 теңге депозит аталған.', False),
        ('Архив объявления от 2020 года: внесите аванс 10%.', True),
        ('Для участников прошлогодней акции аванс 10%.', True),
        ('На старте продаж предлагали скидки, внесите аванс 5%.', True),
        ('Аванс, внесите 100 000 тенге.', True),
        ('Для брони, оплатите 100 000 тенге.', True),
        ('Аванс, сейчас внесите 100 000 тенге.', True),
        ('Аванс\n\nЦена квартиры 30 млн тенге.', False),
        ('Аванс\n \n250 000 тенге.', False),
        ('Аванс\r\n \r\n250 000 тенге.', False),
        ('Аванс. Цена квартиры 30 млн тенге.', False),
        ('Аванс\nЦена квартиры 30 млн тенге.', False),
        ('Аванс 0 тенге, цена квартиры 30 млн тенге.', False),
        ('Платная бронь 0 тенге.', False),
        ('Первоначальный взнос 150%.', False),
        ('Для стройки требуется 180 000 т материала.', False),
    ],
)
def test_payment_context_and_wrapping(text, positive):
    assert payment_offer(text) is positive
    hypotheses, _ = extract(text, uuid4(), uuid4(), [])
    assert any(h['field'] == 'PAYMENT_TERM' for h in hypotheses) is positive


@pytest.mark.parametrize(
    ('old', 'current', 'separator'),
    [
        ('В прошлогодней акции упоминался аванс 10%', 'Сейчас внесите депозит 5%.', '.\n'),
        ('В прошлогодней акции упоминался аванс 10%', 'теперь аванс 5%.', ', '),
        ('В прошлогодней акции упоминался аванс 10%', 'но внесите депозит 5%.', ', '),
        ('Былтырғы макетте 20% алғашқы жарна туралы жазылған еді', 'Енді бастапқы жарна 5%.', '.\n'),
    ],
)
def test_historical_offer_does_not_hide_current_offer(old, current, separator):
    hypotheses, _ = extract(old + separator + current, uuid4(), uuid4(), [])
    terms = [h for h in hypotheses if h['field'] == 'PAYMENT_TERM']
    assert len(terms) == 1
    assert terms[0]['fragment']['quote'] == current
    assert terms[0]['value']['percent'] == 5
    assert terms[0]['review_status'] == 'PENDING'


@pytest.mark.parametrize(
    ('text', 'expected'),
    [
        ('Аванс 240 тыс. тенге.', {'amount': '240000', 'currency': 'KZT'}),
        ('Задаток 125\n000 тенге.', {'amount': '125000', 'currency': 'KZT'}),
        ('Задаток 125\r\n000 тенге.', {'amount': '125000', 'currency': 'KZT'}),
        ('Задаток 125\n 000 тенге.', {'amount': '125000', 'currency': 'KZT'}),
        ('Аванс 1,5 млн KZT.', {'amount': '1500000.0', 'currency': 'KZT'}),
        ('Аванс 2\u202f500 USD.', {'amount': '2500', 'currency': 'USD'}),
        ('Кепілақы 175 мың теңге.', {'amount': '175000', 'currency': 'KZT'}),
    ],
)
def test_payment_amount_keeps_scale_currency_and_source(text, expected):
    hypotheses, _ = extract(text, uuid4(), uuid4(), [])
    term = next(h for h in hypotheses if h['field'] == 'PAYMENT_TERM')
    amount = next(h for h in hypotheses if h['field'] == 'AMOUNT')
    assert term['value']['money'] == amount['value']['money'] == expected
    for hypothesis in [term, amount]:
        fragment = hypothesis['fragment']
        assert text[fragment['start_offset'] : fragment['end_offset']] == fragment['quote']


def test_uncertain_ocr_currency_is_not_invented():
    text = 'Внесите плату за бронь 195\n000 т.'
    hypotheses, _ = extract(text, uuid4(), uuid4(), [])
    term = next(h for h in hypotheses if h['field'] == 'PAYMENT_TERM')
    assert term['value']['money'] is None
    assert term['fragment']['quote'] == text
    assert not any(h['field'] == 'AMOUNT' for h in hypotheses)


def test_wrapped_payment_fragment_preserves_bbox_and_emoji_offsets():
    text = '🏠 Новое предложение.\nАванс 125\n000 тенге.'
    start = text.index('Аванс')
    words = [
        {'start': start, 'end': start + 9, 'x': 20, 'y': 30, 'width': 120, 'height': 20},
        {'start': start + 10, 'end': len(text), 'x': 20, 'y': 60, 'width': 150, 'height': 20},
    ]
    hypotheses, _ = extract(text, uuid4(), uuid4(), [], words)
    term = next(h for h in hypotheses if h['field'] == 'PAYMENT_TERM')
    assert term['fragment']['start_offset'] == start
    assert term['fragment']['end_offset'] == len(text)
    assert term['fragment']['quote'] == 'Аванс 125\n000 тенге.'
    assert term['fragment']['bbox'] == {'x': 20, 'y': 30, 'width': 150, 'height': 50}


def test_long_payment_fragment_contains_the_actual_term_and_amount():
    text = ('Описание ' * 260) + 'Аванс 100 000 тенге.'
    hypotheses, _ = extract(text, uuid4(), uuid4(), [])
    term = next(h for h in hypotheses if h['field'] == 'PAYMENT_TERM')
    fragment = term['fragment']
    assert len(fragment['quote']) <= 2000
    assert 'Аванс 100 000 тенге.' in fragment['quote']
    assert text[fragment['start_offset'] : fragment['end_offset']] == fragment['quote'] == term['value']['text']
    assert term['value']['money'] == {'amount': '100000', 'currency': 'KZT'}
