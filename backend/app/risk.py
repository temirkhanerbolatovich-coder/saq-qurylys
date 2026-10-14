WEIGHTS = {'R1': 35, 'R2': 25, 'R3': 10, 'R4': 15, 'R5': 10, 'R6': 5}


def calculate_risk(factors: list[tuple[str, str]]) -> tuple[int, str, list[str]]:
    """Calculate priority from unique, human-confirmed factor codes only."""
    for code, status in factors:
        if code not in WEIGHTS or status not in {'UNKNOWN', 'PENDING', 'CONFIRMED', 'REJECTED'}:
            raise ValueError('Unknown risk code or review status')
    confirmed = sorted({code for code, status in factors if status == 'CONFIRMED'})
    score = min(100, sum(WEIGHTS[code] for code in confirmed))
    zone = 'GREEN' if score < 25 else 'YELLOW'
    if score >= 60 and {'R1', 'R2'}.issubset(confirmed):
        zone = 'RED'
    return score, zone, confirmed
