import pytest

from app.risk import calculate_risk


@pytest.mark.parametrize(
    ('codes', 'score', 'zone'),
    [
        (['R2', 'R3'], 35, 'YELLOW'),
        (['R1', 'R2', 'R3'], 70, 'RED'),
        (['R3'], 10, 'GREEN'),
        (['R1', 'R3', 'R4'], 60, 'YELLOW'),
        (['R2', 'R3', 'R4', 'R5', 'R6'], 65, 'YELLOW'),
        (['R1', 'R2'], 60, 'RED'),
        (['R1', 'R2', 'R3', 'R4', 'R5', 'R6'], 100, 'RED'),
        ([], 0, 'GREEN'),
    ],
)
def test_control_scenarios(codes, score, zone):
    assert calculate_risk([(code, 'CONFIRMED') for code in codes])[:2] == (score, zone)


def test_unconfirmed_and_duplicate_factors():
    assert calculate_risk(
        [('R1', 'UNKNOWN'), ('R2', 'PENDING'), ('R4', 'REJECTED'), ('R3', 'CONFIRMED'), ('R3', 'CONFIRMED')]
    ) == (10, 'GREEN', ['R3'])


def test_rejection_recalculates_without_hidden_r1():
    assert calculate_risk([('R1', 'UNKNOWN'), ('R2', 'REJECTED'), ('R3', 'CONFIRMED')])[:2] == (10, 'GREEN')


def test_invalid_factor_fails_explicitly():
    with pytest.raises(ValueError):
        calculate_risk([('R7', 'CONFIRMED')])
