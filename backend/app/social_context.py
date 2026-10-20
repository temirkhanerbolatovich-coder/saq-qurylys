"""Offline contextual hypotheses. Never creates entities, evidence, or legal risk."""

import hashlib
import re

from app.extraction import MONEY, PERCENT, clauses, money_value, number_value, payment_is_positive
from app.social_dictionary import DictionarySnapshot

RULES_VERSION = 'social-context-0.1'
MAX_TEXT_LENGTH = 20000
NEGATED_LIST = re.compile(
    r'\bбез\s+(?:(?:предоплат\w*|взнос\w*|депозит\w*|оплат\w*|аванс\w*|задат\w*)\s*(?:,\s*|и\s*)?)*$', re.I
)
COMPLETED = re.compile(r'\b(?:дом\s+(?:сдан|введ[её]н)|үй\s+пайдалануға\s+берілді|готовая\s+квартира)\b', re.I)
ESTATE = re.compile(
    r'\b(?:жк|тк|түк|новостро\w*|квартир\w*|пәтер\w*|жилой\s+комплекс|тұрғын\s+үй|строящийся\s+дом)\b', re.I
)
CONSTRUCTION = re.compile(r'\b(?:строится|строящ\w*|котлован\w*|салынып\s+жатыр|құрылысы\s+салынуда)\b', re.I)
MARKETING = re.compile(r'\b(?:старт\s+продаж|продаж[аи]\s+от\s+застройщика|сатылым\s+басталды)\b', re.I)
EXCLUSION = re.compile(
    r'\b(?:аренд\w*|сдам|сниму|ремонт\w*|ваканси\w*|вторич\w*|перепродаж\w*|жалға|жөндеу|қайталама)\b', re.I
)
CAUTION = re.compile(r'\b(?:новост[ьи]\w*|предупрежд\w*|мошеннич\w*|ескерту|жаңалық|алаяқ\w*)\b', re.I)
BANK = re.compile(r'\b(?:банк\w*|ипотек\w*|несие\w*)\b', re.I)
LEGAL = re.compile(r'\b(?:разрешени\w*|гаранти\w*|дду|рұқсат\w*|кепілдік\w*)\b', re.I)
OUTSIDE = re.compile(r'\b(?:в\s+Москве|Москва|в\s+Алматы|Алматыда|в\s+Астане|Астанада)\b', re.I)
PAYMENT = re.compile(
    r'\b(?:предоплат\w*|брон\w*|депозит\w*|аванс\w*|задат\w*|взнос\w*|жарна\w*|кепілақы|төлем\w*|оплат\w*|плат[её]ж\w*|төлеу|төлеңіз|внесите|перечислите|аударыңыз)\b',
    re.I,
)
DEMAND = re.compile(
    r'\b(?:оплатите|внесите|перечислите|переведите|төлеңіз|аударыңыз|ақылы|платн\w*|предоплат\w*|алдын\s+ала\s+төлем)\b',
    re.I,
)
BEFORE = re.compile(
    r'\b(?:до\s+(?:сдачи|ввода|завершения\s+строительства)|(?:тапсырылғанға|берілгенге|аяқталғанға)\s+дейін)\b', re.I
)
AFTER = re.compile(
    r'\b(?:после\s+(?:сдачи|ввода|передачи\s+ключей)|(?:тапсырылғаннан|берілгеннен|аяқталғаннан)\s+кейін)\b', re.I
)
CONDITIONAL = re.compile(r'\b(?:после\s+получения\s+разрешения|если\s+получим|рұқсат\s+алғаннан\s+кейін)\b', re.I)
COMPLETION_YEAR = re.compile(
    r'\b(?:(?:сдача|ввод|завершение)\s*(?:в\s*)?(?P<ru>20\d{2})|(?P<kk>20\d{2})\s*жылы\s*тапсырылады)\b', re.I
)
PHASE = re.compile(
    r'^[»”"]?\s*(?:[-–—,:]\s*)?(?:(?:очередь|корпус|кезек|блок)\s*)?(?P<phase>\d{1,2}|[IVX]{1,6})(?!\w)', re.I
)
QUOTED_PROJECT = re.compile(r'\b(?:жк|тк|түк)\s*[«"“]([^»"”\n]{2,80})[»"”]', re.I)


def span(text, start, end, kind):
    return {'kind': kind, 'start': start, 'end': end, 'text': text[start:end]}


def term_matches(text, terms):
    """Escaped literal terms only; dictionary strings are never executable regex."""
    matches = []
    for term in dict.fromkeys(terms):
        pattern = r'(?<!\w)' + r'\s+'.join(re.escape(word) for word in term.split()) + r'(?!\w)'
        matches.extend(re.finditer(pattern, text, re.I))
    return sorted(matches, key=lambda m: (m.start(), -m.end()))


def _segments(text):
    # Commas separate payment schedules and contrast; decimal commas have no trailing space.
    for start, end in clauses(text):
        cursor = start
        for boundary in re.finditer(
            r',\s+(?=(?:но\b|а\b|бірақ\b|оплатите\b|внесите\b|\d+\s*%))|\s+[—;]\s+', text[start:end]
        ):
            right = start + boundary.start()
            if right > cursor:
                yield cursor, right, start, end
            cursor = start + boundary.end()
        if cursor < end:
            yield cursor, end, start, end


def _projects(text, document, regional_context):
    found, occupied = [], []
    aliases = [(name, alias) for name, values in document.project_aliases.items() for alias in values]
    candidates = [(name, alias, match) for name, alias in aliases for match in term_matches(text, [alias])]
    candidates.sort(key=lambda row: (row[2].start(), -len(row[2].group())))
    weak = {
        name.casefold()
        for name in document.v2_additions.phase_and_alias_policy.weak_project_names_require_extra_context
    }
    for family, alias, match in candidates:
        if any(left <= match.start() and match.end() <= right for left, right in occupied):
            continue
        end = match.end()
        suffix = re.search(r'\s+(\d{1,2}|[IVX]{1,6})$', alias, re.I)
        phase = suffix[1].upper() if suffix else None
        continuation = PHASE.match(text[end : end + 40])
        if phase is None and continuation:
            phase = continuation['phase'].upper()
            end += continuation.end()
        occupied.append((match.start(), end))
        found.append(
            {
                'family': family,
                'phase': phase,
                'alias': alias,
                'span': span(text, match.start(), end, 'PROJECT_ALIAS'),
                'status': 'CANDIDATE' if regional_context else 'NEEDS_CONTEXT',
                'ambiguous_name': family.casefold() in weak or alias.casefold() in weak,
                'identity_confirmed': False,
                'document_inheritance_allowed': False,
            }
        )
    for match in QUOTED_PROJECT.finditer(text):
        if any(left < match.end() and match.start() < right for left, right in occupied):
            continue
        found.append(
            {
                'family': match[1],
                'phase': (
                    phase['phase'].upper() if (phase := PHASE.match(text[match.end() : match.end() + 40])) else None
                ),
                'alias': None,
                'span': span(text, match.start(), match.end(), 'UNKNOWN_PROJECT'),
                'status': 'NEEDS_RESOLUTION',
                'ambiguous_name': True,
                'identity_confirmed': False,
                'document_inheritance_allowed': False,
            }
        )
    return found


def _payments(text, start, end, document, sentence_start, sentence_end):
    content = text[start:end]
    timing_terms = document.v2_additions.negation_and_timing
    negations = term_matches(
        content, timing_terms.get('negated_payment_ru', []) + timing_terms.get('negated_payment_kk', [])
    )
    amounts = [*MONEY.finditer(content), *PERCENT.finditer(content)]
    terms = list(PAYMENT.finditer(content))
    # A percentage explicitly tied to completion also needs a timing hypothesis.
    if not terms and list(PERCENT.finditer(content)) and AFTER.search(content):
        terms = list(PERCENT.finditer(content))[:1]
    result = []
    for match in terms:
        negated = (
            bool(NEGATED_LIST.search(content[: match.start()]))
            or not payment_is_positive(content, match)
            or any(n.start() <= match.start() < n.end() for n in negations)
        )
        before, after = bool(BEFORE.search(content)), bool(AFTER.search(content))
        timing = (
            'NEGATED'
            if negated
            else (
                'BEFORE_COMMISSIONING'
                if before and not after
                else 'AFTER_COMMISSIONING'
                if after and not before
                else 'UNKNOWN'
            )
        )
        conditional = bool(CONDITIONAL.search(text[sentence_start:sentence_end]))
        bank = bool(BANK.search(text[sentence_start:sentence_end]))
        nearest = (
            min(amounts, key=lambda a: max(0, a.start() - match.end(), match.start() - a.end())) if amounts else None
        )
        if nearest and max(0, nearest.start() - match.end(), match.start() - nearest.end()) > 65:
            nearest = None
        value = None
        if nearest:
            value = (
                money_value(nearest)
                if 'currency' in nearest.re.groupindex
                else {'percent': format(number_value(nearest['amount']), 'f')}
            )
        positive_amount = (
            value is not None
            and 0 < number_value(value.get('amount', value.get('percent')))
            and ('percent' not in value or number_value(value['percent']) <= 100)
        )
        affirmative = (
            not negated
            and not conditional
            and not bank
            and (value is None or positive_amount)
            and bool(DEMAND.search(content) or positive_amount)
        )
        result.append(
            {
                'span': span(text, start + match.start(), start + match.end(), 'PAYMENT_MENTION'),
                'context': span(text, start, end, 'PAYMENT_CONTEXT'),
                'sentence_context': span(text, sentence_start, sentence_end, 'SENTENCE_CONTEXT'),
                'amount': value,
                'amount_span': span(text, start + nearest.start(), start + nearest.end(), 'AMOUNT')
                if nearest
                else None,
                'timing': timing,
                'timing_conflict': before and after,
                'conditional': conditional,
                'recipient': 'BANK_CONTEXT' if bank else 'UNKNOWN',
                'affirmative_offer_hypothesis': affirmative,
                'upfront_offer_hypothesis': affirmative and timing != 'AFTER_COMMISSIONING' and not (before and after),
            }
        )
    return result


def analyze_context(text: str, snapshot: DictionarySnapshot) -> dict:
    """Analyze bounded original text; offsets are Python Unicode code-point indices.

    Priority is a review suggestion. Registry is unavailable here, so identity,
    legality and R1–R6 are deliberately not inferred, regardless of dictionary matches.
    """
    if not isinstance(text, str) or not text.strip() or len(text) > MAX_TEXT_LENGTH:
        raise ValueError('Expected nonempty text up to 20000 characters')
    document = snapshot.document
    additions = document.v2_additions
    if additions is None:
        raise ValueError('Context rules require a v2 dictionary')
    strong = term_matches(text, additions.geo_alias_policy.strong_city_aliases)
    weak = term_matches(text, additions.geo_alias_policy.weak_or_broad_aliases)
    outside = list(OUTSIDE.finditer(text))
    estate = list(ESTATE.finditer(text))
    regional = bool(strong and estate and not outside)
    projects = _projects(text, document, regional)
    matches = [
        span(text, m.start(), m.end(), kind)
        for kind, values in (('STRONG_GEO', strong), ('WEAK_GEO', weak), ('OUTSIDE_GEO', outside), ('ESTATE', estate))
        for m in values
    ]
    payments, years, segment_priorities = [], [], []
    has_exclusion = has_caution = has_bank = has_legal = False
    for start, end, sentence_start, sentence_end in _segments(text):
        content = text[start:end]
        excluded, caution, bank, legal = (
            bool(EXCLUSION.search(content)),
            bool(CAUTION.search(content)),
            bool(BANK.search(content)),
            bool(LEGAL.search(content)),
        )
        has_exclusion |= excluded
        has_caution |= caution
        has_bank |= bank
        has_legal |= legal
        for kind, regex in [
            ('EXCLUDED_CONTEXT', EXCLUSION),
            ('CAUTION_CONTEXT', CAUTION),
            ('BANK_CONTEXT', BANK),
            ('LEGAL_CLAIM', LEGAL),
        ]:
            matches.extend(span(text, start + m.start(), start + m.end(), kind) for m in regex.finditer(content))
        current = _payments(text, start, end, document, sentence_start, sentence_end)
        payments.extend(current)
        construction = list(CONSTRUCTION.finditer(content)) + term_matches(
            content,
            document.under_construction_ru
            + document.under_construction_kk
            + additions.extended_terms.get('construction_ru', [])
            + additions.extended_terms.get('construction_kk', []),
        )
        marketing = list(MARKETING.finditer(content)) + term_matches(
            content,
            document.marketing_ru
            + document.marketing_kk
            + additions.extended_terms.get('marketing_ru', [])
            + additions.extended_terms.get('marketing_kk', []),
        )
        completion = list(COMPLETION_YEAR.finditer(content))
        for m in completion:
            years.append(
                {
                    'year': int(m['ru'] or m['kk']),
                    'span': span(text, start + m.start(), start + m.end(), 'COMPLETION_YEAR'),
                }
            )
        matches.extend(
            span(text, start + m.start(), start + m.end(), kind)
            for kind, values in [('CONSTRUCTION', construction), ('MARKETING', marketing)]
            for m in values
        )
        if excluded or caution or bank or CONDITIONAL.search(text[sentence_start:sentence_end]):
            continue
        if any(p['upfront_offer_hypothesis'] for p in current):
            segment_priorities.append('P1')
        elif construction or marketing or completion:
            segment_priorities.append('P2')
        elif ESTATE.search(content):
            segment_priorities.append('P3')
    if outside and not strong:
        priority, reason = 'NOT_RELEVANT', 'EXPLICIT_OTHER_CITY'
    elif COMPLETED.search(text):
        priority, reason = 'NEEDS_CONTEXT', 'COMPLETED_STAGE_REQUIRES_REVIEW'
    elif outside or has_caution:
        priority, reason = 'NEEDS_CONTEXT', 'CONFLICT_OR_QUOTED_WARNING'
    elif has_exclusion and not regional:
        priority, reason = 'NOT_RELEVANT', 'UNRELATED_CONTEXT_WITHOUT_REGIONAL_AD'
    elif not regional:
        priority, reason = 'NEEDS_CONTEXT', 'REGIONAL_ESTATE_CONTEXT_NOT_ESTABLISHED'
    elif segment_priorities and (not has_exclusion or any(p in {'P1', 'P2'} for p in segment_priorities)):
        priority = min(segment_priorities)
        reason = {
            'P1': 'AFFIRMATIVE_PAYMENT_REQUIRES_REVIEW',
            'P2': 'MARKETING_OR_CONSTRUCTION_WITHOUT_UPFRONT_PROOF',
            'P3': 'REGIONAL_ESTATE_OFFER',
        }[priority]
    else:
        priority, reason = (
            'NEEDS_CONTEXT',
            'EXCLUDED_BANK_OR_LEGAL_CONTEXT' if (has_exclusion or has_bank or has_legal) else 'INSUFFICIENT_CONTEXT',
        )
    return {
        'rules_version': RULES_VERSION,
        'dictionary_version': snapshot.dictionary_version,
        'dictionary_sha256': snapshot.content_sha256,
        'text_sha256': hashlib.sha256(text.encode()).hexdigest(),
        'priority': priority,
        'priority_reason': reason,
        'geography': 'CANDIDATE' if regional else 'NEEDS_CONTEXT',
        'geography_confirmed': False,
        'registry_status': 'WAITING_REGISTRY',
        'projects': projects,
        'payments': payments,
        'completion_years': years,
        'matched_spans': matches,
        'unknown_attributes': ['verified_location', 'resolved_property_and_phase', 'applicable_legal_basis'],
        'mode': 'OFFLINE_HYPOTHESES',
    }
