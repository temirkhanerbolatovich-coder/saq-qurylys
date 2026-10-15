from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.extraction import extract, match_candidates


@pytest.mark.parametrize(
    ('alias', 'text', 'expected_name'),
    [
        ('Солнечные дворы', 'Открыты продажи: Солнечные дворы. Квартиры доступны.', 'Солнечные дворы'),
        ('Гүлді мекен', 'Гүлді мекен — жаңа пәтерлер сатылымда.', 'Гүлді мекен'),
        ('DEMO Гүлді мекен', 'Жаңа пәтерлер: гүлді мекен.', 'гүлді мекен'),
    ],
)
def test_registered_alias_without_name_prefix_produces_candidate(alias, text, expected_name):
    property_item = SimpleNamespace(id=uuid4(), name='DEMO Береговой · очередь 1', aliases=[alias])

    hypotheses, _ = extract(text, uuid4(), uuid4(), [property_item])

    names = [item for item in hypotheses if item['field'] == 'PROPERTY_NAME']
    assert [item['value']['text'] for item in names] == [expected_name]
    candidates = match_candidates(text, hypotheses, [property_item])
    assert [item['property_id'] for item in candidates] == [property_item.id]
    assert candidates[0]['similarity'] == 100
    assert names[0]['review_status'] == 'PENDING'


@pytest.mark.parametrize('aliases', [[], ['Иное название']])
def test_canonical_name_fallback_keeps_demo_and_phase_handling(aliases):
    property_item = SimpleNamespace(name='DEMO Береговой · очередь 1', aliases=aliases)
    text = 'Новые квартиры: береговой, очередь 1.'

    hypotheses, _ = extract(text, uuid4(), uuid4(), [property_item])

    names = [item for item in hypotheses if item['field'] == 'PROPERTY_NAME']
    assert [item['value']['text'] for item in names] == ['береговой']
    assert names[0]['fragment']['quote'] == 'береговой'


@pytest.mark.parametrize('text', ['МегаГүлдер', 'Гүлдерлер', '_Гүлдер', 'Гүлдер2', 'Гүлдэр'])
def test_registered_alias_requires_whole_exact_name(text):
    property_item = SimpleNamespace(name='DEMO Береговой', aliases=['Гүлдер'])

    hypotheses, _ = extract(text, uuid4(), uuid4(), [property_item])

    assert not any(item['field'] == 'PROPERTY_NAME' for item in hypotheses)


def test_duplicate_registered_names_share_one_hypothesis():
    properties = [
        SimpleNamespace(name='DEMO Гүлдер · очередь 1', aliases=['Гүлдер', 'DEMO Гүлдер', 'гүлдер']),
        SimpleNamespace(name='DEMO Береговой', aliases=['Гүлдер']),
    ]

    hypotheses, _ = extract('Продажи: Гүлдер.', uuid4(), uuid4(), properties)

    names = [item for item in hypotheses if item['field'] == 'PROPERTY_NAME']
    assert [item['value']['text'] for item in names] == ['Гүлдер']


def test_full_registered_name_takes_precedence_over_a_contained_alias():
    property_item = SimpleNamespace(name='DEMO Гүлді мекен', aliases=['мекен', 'Гүлді мекен'])

    hypotheses, _ = extract('Продажи: Гүлді мекен.', uuid4(), uuid4(), [property_item])

    names = [item for item in hypotheses if item['field'] == 'PROPERTY_NAME']
    assert [item['value']['text'] for item in names] == ['Гүлді мекен']


def test_registered_alias_preserves_original_source_offsets_and_word_box():
    property_item = SimpleNamespace(name='DEMO Береговой', aliases=['DEMO Гүлді мекен'])
    text = '🏠 Жаңа пәтерлер\n«ГҮЛДІ мекен» сатылымда.'
    quote = 'ГҮЛДІ мекен'
    start = text.index(quote)
    end = start + len(quote)
    asset_id, extraction_id = uuid4(), uuid4()
    words = [
        {'start': start, 'end': start + 5, 'x': 10, 'y': 20, 'width': 50, 'height': 15},
        {'start': start + 6, 'end': end, 'x': 70, 'y': 20, 'width': 50, 'height': 15},
    ]

    hypotheses, _ = extract(text, asset_id, extraction_id, [property_item], words)

    names = [item for item in hypotheses if item['field'] == 'PROPERTY_NAME']
    assert len(names) == 1
    assert names[0]['value']['text'] == quote
    assert names[0]['fragment'] == {
        'asset_id': str(asset_id),
        'text_version_id': str(extraction_id),
        'quote': quote,
        'start_offset': start,
        'end_offset': end,
        'bbox': {'x': 10, 'y': 20, 'width': 110, 'height': 15},
    }
    assert text[start:end] == quote


def test_registered_alias_is_literal_and_not_a_regex():
    property_item = SimpleNamespace(name='DEMO Береговой', aliases=['Север (А+)'])

    hypotheses, _ = extract('Продажи: Север (А+).', uuid4(), uuid4(), [property_item])

    names = [item for item in hypotheses if item['field'] == 'PROPERTY_NAME']
    assert [item['value']['text'] for item in names] == ['Север (А+)']


def test_explicit_name_prefix_still_takes_precedence_over_alias_fallback():
    property_item = SimpleNamespace(name='DEMO Береговой', aliases=['Гүлдер'])

    hypotheses, _ = extract('ЖК «Береговой». Рядом Гүлдер.', uuid4(), uuid4(), [property_item])

    names = [item for item in hypotheses if item['field'] == 'PROPERTY_NAME']
    assert [item['value']['text'] for item in names] == ['Береговой']
