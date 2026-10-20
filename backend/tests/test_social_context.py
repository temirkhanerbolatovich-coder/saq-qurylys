"""Context rules use synthetic examples, never imply measured real-world precision."""

import json
import subprocess
import sys
from pathlib import Path

import pytest

from app.social_context import analyze_context
from app.social_dictionary import load_dictionary

ROOT = Path(__file__).resolve().parents[2]
V1 = (ROOT / 'docs/saq_oskemen_search_dictionary_2026-10-19.json').read_bytes()
V2 = (ROOT / 'docs/saq_oskemen_search_dictionary_v2.json').read_bytes()
DICTIONARY = load_dictionary(V2, source='supplied-v2', original_raw=V1)
EXAMPLES = json.loads(V2)['v2_additions']['review_examples']


@pytest.mark.parametrize('example', EXAMPLES, ids=[f'supplied-{i + 1}' for i in range(len(EXAMPLES))])
def test_supplied_review_examples(example):
    result = analyze_context(example['text'], DICTIONARY)
    assert result['priority'] == example['expected']
    assert result['registry_status'] == 'WAITING_REGISTRY'
    assert result['geography_confirmed'] is False
    assert not {'score', 'risk', 'evidence_id', 'property_id'} & result.keys()


@pytest.mark.parametrize(
    'text,expected',
    [
        ('Ука сегодня прекрасная погода', 'NEEDS_CONTEXT'),
        ('УК открыл новый офис', 'NEEDS_CONTEXT'),
        ('#uka #пәтерсату', 'NEEDS_CONTEXT'),
        ('#өскемен пәтер сату', 'P3'),
        ('Diamond предлагает платную бронь', 'NEEDS_CONTEXT'),
        ('Престиж, старт продаж', 'NEEDS_CONTEXT'),
        ('Усть-Каменогорск ЖК Престиж: старт продаж', 'P2'),
        ('Өскемен ЖК: цена 10 000 000 ₸', 'P3'),
        ('Өскемен ЖК: цена 10 000 000 ₸ до сдачи', 'P3'),
        ('Өскемен ЖК: 0% рассрочка', 'P2'),
        ('Өскемен ЖК строится. Без предоплаты', 'P2'),
        ('Өскемен ЖК строится. Предоплата не требуется', 'P2'),
        ('Өскемен тұрғын үй кешені салынып жатыр. Брондау тегін', 'P2'),
        ('Өскемен тұрғын үй кешені салынып жатыр. Алдын ала төлемсіз', 'P2'),
        ('Өскемен ЖК строится. 50% предоплата', 'P1'),
        ('Өскемен ЖК строится. Алдын ала төлем 100 000 теңге', 'P1'),
        ('Өскемен ЖК строится. Бронь бесплатная, но внесите депозит 100 000 ₸ до сдачи', 'P1'),
        ('Өскемен ЖК: 20% предоплата до сдачи, 80% после сдачи', 'P1'),
        ('Өскемен ЖК: ипотека банка, первоначальный взнос 20%', 'NEEDS_CONTEXT'),
        ('Өскемен ЖК: после получения разрешения внесите 100 000 ₸', 'NEEDS_CONTEXT'),
        ('Предупреждение: Өскемен ЖК, оплатите бронь 100 000 ₸', 'NEEDS_CONTEXT'),
        ('Усть-Каменогорск и Москва: ЖК строится, платная бронь', 'NEEDS_CONTEXT'),
        ('Усть-Каменогорск: ремонт квартир. ЖК строится, платная бронь', 'P1'),
        ('Өскемен: квартира от застройщика. Дом сдан. Предоплата 50%', 'NEEDS_CONTEXT'),
    ],
)
def test_context_and_hard_negatives(text, expected):
    assert analyze_context(text, DICTIONARY)['priority'] == expected


def test_payment_spans_amounts_timing_and_negations_are_local():
    text = 'Өскемен ЖК строится. Бронь бесплатная; оплатите бронь 100\u00a0000 ₸ до сдачи. 50 % после сдачи.'
    result = analyze_context(text, DICTIONARY)
    assert result['priority'] == 'P1'
    assert any(p['timing'] == 'NEGATED' and not p['upfront_offer_hypothesis'] for p in result['payments'])
    assert any(
        p['timing'] == 'BEFORE_COMMISSIONING' and p['amount'] == {'amount': '100000', 'currency': 'KZT'}
        for p in result['payments']
    )
    assert any(p['timing'] == 'AFTER_COMMISSIONING' and not p['upfront_offer_hypothesis'] for p in result['payments'])
    spans = result['matched_spans'] + [
        item for p in result['payments'] for item in [p['span'], p['context'], p['amount_span']] if item
    ]
    for value in spans:
        assert text[value['start'] : value['end']] == value['text']


@pytest.mark.parametrize('text', ['Өскемен ЖК, сдача в 2029', 'Өскемен тұрғын үй кешені 2029 жылы тапсырылады'])
def test_future_completion_year_is_not_limited_to_dictionary_examples(text):
    result = analyze_context(text, DICTIONARY)
    assert result['priority'] == 'P2'
    assert result['completion_years'][0]['year'] == 2029
    value = result['completion_years'][0]['span']
    assert text[value['start'] : value['end']] == value['text']


def test_project_phases_are_separate_and_never_inherit_documents():
    result = analyze_context('Өскемен ЖК Altyn Uia 2 и Altyn Uia III, платная бронь.', DICTIONARY)
    assert [(p['family'], p['phase']) for p in result['projects']] == [('Altyn Uia', '2'), ('Altyn Uia', 'III')]
    assert all(not p['document_inheritance_allowed'] and not p['identity_confirmed'] for p in result['projects'])
    assert all(p['status'] == 'CANDIDATE' for p in result['projects'])


def test_unknown_project_remains_a_hypothesis_without_creation():
    result = analyze_context('Өскемен ЖК «Новый берег», старт продаж', DICTIONARY)
    project = result['projects'][0]
    assert project['family'] == 'Новый берег' and project['status'] == 'NEEDS_RESOLUTION'
    assert 'property_id' not in project and 'candidate_object_id' not in project


@pytest.mark.parametrize('text', ['', '   ', 'x' * 20001, None], ids=['empty', 'blank', 'oversize', 'wrong-type'])
def test_invalid_input_is_rejected(text):
    with pytest.raises(ValueError):
        analyze_context(text, DICTIONARY)


def test_v1_rejected_and_analysis_repeatable_without_dictionary_mutation():
    with pytest.raises(ValueError):
        analyze_context('Өскемен ЖК', load_dictionary(V1, source='v1'))
    text = 'Өскемен ЖК, платная бронь'
    assert analyze_context(text, DICTIONARY) == analyze_context(text, DICTIONARY)
    assert DICTIONARY.raw == V2


@pytest.mark.parametrize(
    'text',
    [
        'Өскемен ЖК строится. Оплатите бронь 0 ₸',
        'Өскемен ЖК строится. Оплатите бронь 0%',
        'Өскемен ЖК строится. Без предоплаты, взносов и депозита',
        'Өскемен ЖК строится. Брондау үшін төлем талап етілмейді',
        'Өскемен ЖК строится. 50% үй тапсырылғаннан кейін төлеу',
    ],
)
def test_zero_and_negated_payments_never_become_upfront_offers(text):
    result = analyze_context(text, DICTIONARY)
    assert result['priority'] == 'P2'
    assert not any(payment['upfront_offer_hypothesis'] for payment in result['payments'])


def test_quoted_family_and_unknown_project_retain_explicit_phase():
    result = analyze_context('Өскемен ЖК «Altyn Uia» очередь 2. ЖК «Новый берег» корпус 3.', DICTIONARY)
    assert [(p['family'], p['phase']) for p in result['projects']] == [('Altyn Uia', '2'), ('Новый берег', '3')]


def test_local_cli_reports_hypotheses_and_preserves_source(tmp_path):
    path = tmp_path / 'material.txt'
    text = 'Өскемен ЖК строится. Оплатите бронь 100 000 ₸ до сдачи.'
    path.write_text(text, encoding='utf-8')
    before = path.read_bytes()
    result = subprocess.run(
        [sys.executable, str(ROOT / 'scripts/analyze_social_text.py'), str(path)], capture_output=True, check=True
    )
    report = json.loads(result.stdout)
    assert report['priority'] == 'P1'
    assert report['mode'] == 'OFFLINE_HYPOTHESES'
    assert report['registry_status'] == 'WAITING_REGISTRY'
    assert path.read_bytes() == before


def test_local_cli_rejects_invalid_file_without_echo(tmp_path):
    path = tmp_path / 'material.txt'
    path.write_bytes(b'\xffprivate-invalid-content')
    result = subprocess.run(
        [sys.executable, str(ROOT / 'scripts/analyze_social_text.py'), str(path)], capture_output=True
    )
    assert result.returncode == 2 and not result.stdout
    assert b'private-invalid-content' not in result.stderr


@pytest.mark.parametrize(
    'text',
    [
        'Өскемен ЖК: после получения разрешения, внесите 100 000 ₸',
        'Өскемен ЖК: ипотека банка, внесите первоначальный взнос 20%',
    ],
)
def test_sentence_context_survives_split_before_payment_instruction(text):
    result = analyze_context(text, DICTIONARY)
    assert result['priority'] != 'P1'
    assert not any(p['upfront_offer_hypothesis'] for p in result['payments'])
    assert any(p['conditional'] or p['recipient'] == 'BANK_CONTEXT' for p in result['payments'])
