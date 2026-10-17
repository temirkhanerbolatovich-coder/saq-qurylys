import re
import unicodedata
from decimal import Decimal
from uuid import uuid4

from rapidfuzz import fuzz

PAYMENT = re.compile(
    r'\b(?:платн\w*\s+брон\w*|плат[ауы]\s+за\s+брон\w*|брон\w*|резервирован\w*|депозит\w*|задат\w*|аванс\w*|'
    r'(?:первоначальн\w*|перв\w*)\s+взнос\w*|внесите\s+(?:взнос|деньги)|'
    r'а[қк]ылы\s+брондау|брондау|кеп[іи]ла[қк]ы|(?:бастап[қк]ы|ал[ғг]аш[қк]ы)\s+жарна|'
    r'алдын\s+ала\s+т[өо]л(?:ем|еңіз))',
    re.I,
)
TRANSFER_PAYMENT = re.compile(r'\b(?:перечислите|переведите|аударыңыз)\b', re.I)
APARTMENT_ALLOCATION = re.compile(
    r'\b(?:(?:для\s+закрепления|за\s+закрепление)\s+квартиры|'
    r'пәтерді\s+(?:өз\s+атыңызға\s+)?бекіту\s+үшін)\b',
    re.I,
)
NUMBER_GAP = r'(?:[ \t\u00a0\u202f]+|[ \t\u00a0\u202f]*\r?\n[ \t\u00a0\u202f]*)'
NUMBER = rf'(?:\d{{1,3}}(?:{NUMBER_GAP}\d{{3}})+|\d+)(?:[.,]\d{{1,2}})?'
MONEY = re.compile(
    rf'(?P<amount>{NUMBER})\s*(?P<scale>млн|миллион\w*|мың|тыс\.?)?\s*(?P<currency>₸|тенге|теңге|тг\b|KZT\b|USD\b|\$|EUR\b|€)',
    re.I,
)
PERCENT = re.compile(rf'(?P<amount>{NUMBER})\s*%')
WARNING = re.compile(r'предупрежд|опасайтесь|не\s+(?:вносите|переводите|платите)|сақ\s+бол|алаяқ', re.I)
FREE = r'бесплатн\w*|тегін|ақысыз|без\s+оплат\w*'
UNDER = re.compile(r'строящ\w*|строит\w*|строится|до\s+сдачи|салынып\s+жатыр|құрылыс\s+кезең', re.I)
PROJECT_CONSTRUCTION = re.compile(
    r'строящ\w*|строится|\bстроим\b|\bстроят\b|\bстроит\b|до\s+сдачи|салынып\s+жатыр|құрылыс\s+кезең|'
    r'строительств\w*\s+(?:(?:нашего|нового|этого|данного)\s+)?дом(?:а|е)\b',
    re.I,
)
COMPLETED = re.compile(r'(?:дом\s+)?(?:введ[её]н|готовые\s+квартиры)|пайдалануға\s+берілген', re.I)
NAME_PREFIX = re.compile(r'(?:\bЖК\b|\bТК\b|жилой\s+комплекс|тұрғын\s+үй\s+кешені)\s*[«"“]?([^\n;,.!?»"”]{2,70})', re.I)
CLAUSE_BOUNDARY = re.compile(
    r'[.!?;](?=\s|$)|\n+|,[ \t]*(?=(?:(?:а\s+|но\s+)?(?:сейчас|теперь|сегодня|енді|қазір)|'
    r'(?:но\s+)?(?:внесите|оплатите|перечислите|переведите))\b)',
    re.I,
)
HISTORICAL_CONTEXT = re.compile(
    r'(?:прошлогодн\w*|стар(?:ый|ая|ое|ые|ой|ого|ому|ым|ыми|ых|ую|ом)\b|архивн\w*)'
    r'.{0,80}(?:упоминал\w*|действовал\w*|предлагал\w*)|'
    r'(?:былтыр\w*|бұрынғы|ескі).{0,100}(?:жазылған\s+еді|аталған)',
    re.I | re.S,
)
KAZAKH_OCR_LETTERS = {'ә': 'әа', 'ғ': 'ғг', 'қ': 'қк', 'ң': 'ңн', 'ө': 'өо', 'ұ': 'ұу', 'ү': 'үу', 'і': 'іи'}


def normalized(value: str) -> str:
    value = unicodedata.normalize('NFKC', value).casefold()
    value = re.sub(r'\b(?:demo|жк|тк|жилой комплекс|тұрғын үй кешені)\b', ' ', value)
    return re.sub(r'[^\w]+', ' ', value).strip()


def payment_is_positive(sentence: str, match: re.Match) -> bool:
    if WARNING.search(sentence) or HISTORICAL_CONTEXT.search(sentence):
        return False
    before, term, after = (
        sentence[max(0, match.start() - 40) : match.start()],
        match.group(),
        sentence[match.end() : match.end() + 45],
    )
    if re.search(r'(?:\bбез|\bне|\bнет)\s+(?:\w+\s+){0,2}$', before, re.I):
        return False
    if re.match(
        r'\s*(?:(?:деньги|оплата|плат[её]ж\w*|ақша|төлем)\s+)?'
        r'(?:не\s+(?:нуж\w*|треб\w*)|отсутств\w*|алынбайды|жоқ|қабылданбайды|ұсынылмайды|'
        r'талап\s+етілмейді|жасамаңыз|(?:қажет|керек)\s+емес)',
        after,
        re.I,
    ):
        return False
    if re.search(r'брон|резерв', term, re.I):
        if re.search(rf'(?:{FREE})\s*$', before, re.I) or re.match(rf'\s*(?:[-—:=]\s*)?(?:{FREE})', after, re.I):
            return False
    return True


def clauses(text: str):
    """Keep source spans; only join a wrapped amount or an unfinished payment phrase."""
    start = 0
    for boundary in CLAUSE_BOUNDARY.finditer(text):
        before, after = text[start : boundary.start()], text[boundary.end() : boundary.end() + 100]
        if boundary.group().startswith(',') and not HISTORICAL_CONTEXT.search(before):
            continue
        if boundary.group() == '.' and re.search(r'\bтыс$', before, re.I):
            continue
        if boundary.group() == '\n':
            amount_continues = re.search(r'\d\s*$', before) and re.match(
                r'[ \t]*(?:\d{3}\b|тыс\b|млн\b|мың\b|тенге\b|теңге\b|KZT\b|USD\b|EUR\b|[₸$€])', after, re.I
            )
            payment_continues = (PAYMENT.search(before) or TRANSFER_PAYMENT.search(before)) and re.match(
                r'[ \t]*(?:\d|в[ \t]+размере\b|размере\b|тенге\b|теңге\b|[₸$€])', after, re.I
            )
            term_continues = re.search(r'(?:алдын\s+ала|первоначальн\w*|платн\w*)\s*$', before, re.I) and re.match(
                r'[ \t]*(?:т[өо]л|взнос|брон)', after, re.I
            )
            allocation_continues = any(amount.end() == len(before.rstrip()) for amount in MONEY.finditer(before)) and (
                (TRANSFER_PAYMENT.search(before) and APARTMENT_ALLOCATION.match(after.lstrip()))
                or (APARTMENT_ALLOCATION.search(before) and TRANSFER_PAYMENT.match(after.lstrip()))
            )
            if amount_continues or payment_continues or term_continues or allocation_continues:
                continue
        end = boundary.end()
        left, right = start, end
        while left < right and text[left].isspace():
            left += 1
        while right > left and text[right - 1].isspace():
            right -= 1
        if right > left:
            yield left, right
        start = end
    if text[start:].strip():
        yield start + len(text[start:]) - len(text[start:].lstrip()), len(text.rstrip())


def number_value(amount: str) -> Decimal:
    return Decimal(re.sub(r'\s', '', amount).replace(',', '.'))


def mortgage_information(text: str) -> bool:
    """Bank-loan information without a named project is not a developer's demand.

    Only down-payment descriptions are affected; explicit payment instructions
    and separate paid reservations must still be surfaced for human review.
    """
    return bool(
        re.search(r'\bбанк\w*', text, re.I)
        and re.search(r'ипотек\w*|\bза[её]м\w*|\bзайм\w*|\bнесие\w*|\bкредит\w*', text, re.I)
        and re.search(r'\bпрограмм\w*|\bбағдарлама\w*', text, re.I)
        and not NAME_PREFIX.search(text)
        # Sector statistics ("строительство") alone do not identify a marketed project.
        and not PROJECT_CONSTRUCTION.search(text)
    )


def payment_terms(text: str, *, mortgage_context: bool = False) -> list:
    terms = []
    amounts = [*MONEY.finditer(text), *PERCENT.finditer(text)]
    matches = list(PAYMENT.finditer(text))
    for transfer in TRANSFER_PAYMENT.finditer(text):
        # A generic transfer is not a housing offer; require a nearby explicit allocation purpose.
        context = text[max(0, transfer.start() - 120) : transfer.end() + 120]
        if any(payment_is_positive(context, allocation) for allocation in APARTMENT_ALLOCATION.finditer(context)):
            matches.append(transfer)
    for match in sorted(matches, key=lambda item: item.start()):
        if not payment_is_positive(text, match):
            continue
        if (
            mortgage_context
            and re.search(r'взнос|жарна', match.group(), re.I)
            and not re.search(
                r'\b(?:внесите|оплатите|перечислите|переведите|төлеңіз|аударыңыз|енгізіңіз)\b', text, re.I
            )
        ):
            continue

        def distance(amount):
            return max(0, amount.start() - match.end(), match.start() - amount.end())

        nearest = min(amounts, key=distance) if amounts else None
        if nearest and distance(nearest) <= 65:
            value = number_value(nearest['amount'])
            if value > 0 and ('currency' in nearest.re.groupindex or value <= 100):
                terms.append((match, nearest))
        elif re.search(r'платн|плат[ауы]\s+за|а[қк]ылы|внесите|төлеңіз', match.group(), re.I):
            terms.append((match, None))
    return terms


def payment_offer(text: str) -> bool:
    mortgage_context = mortgage_information(text)
    return not WARNING.search(text) and any(
        payment_terms(text[start:end], mortgage_context=mortgage_context) for start, end in clauses(text)
    )


def money_value(money: re.Match) -> dict:
    amount = number_value(money['amount'])
    scale = (money['scale'] or '').casefold()
    amount *= 1_000_000 if scale.startswith(('млн', 'миллион')) else 1000 if scale else 1
    currency = money['currency'].upper()
    return {
        'amount': format(amount, 'f'),
        'currency': 'USD' if currency in {'USD', '$'} else 'EUR' if currency in {'EUR', '€'} else 'KZT',
    }


def fragment(text: str, start: int, end: int, asset_id, extraction_id, words: list[dict]) -> dict:
    selected = [word for word in words if word['start'] < end and word['end'] > start]
    bbox = None
    if selected:
        x, y = min(w['x'] for w in selected), min(w['y'] for w in selected)
        bbox = {
            'x': x,
            'y': y,
            'width': max(w['x'] + w['width'] for w in selected) - x,
            'height': max(w['y'] + w['height'] for w in selected) - y,
        }
    return {
        'asset_id': str(asset_id),
        'text_version_id': str(extraction_id),
        'quote': text[start:end],
        'start_offset': start,
        'end_offset': end,
        'bbox': bbox,
    }


def extract(
    text: str, asset_id, extraction_id, properties: list, words: list[dict] | None = None
) -> tuple[list, list[str]]:
    words = words or []
    hypotheses, warnings, seen = [], [], set()

    def add(field, start, end, value):
        if end <= start or (field, start, end) in seen or len(hypotheses) >= 250:
            return
        seen.add((field, start, end))
        hypotheses.append(
            {
                'id': str(uuid4()),
                'field': field,
                'value': {'text': None, 'money': None, 'percent': None, **value},
                'fragment': fragment(text, start, end, asset_id, extraction_id, words),
                'confidence': None,
                'review_status': 'PENDING',
                'reviewed_value': None,
            }
        )

    names = list(NAME_PREFIX.finditer(text))
    for name in names:
        content = re.split(r'\s+(?:платн|брон|депозит|квартир|старт|сатылым|бастапқы)', name[1], flags=re.I)[0].strip()
        if content:
            start = name.start(1)
            add('PROPERTY_NAME', start, start + len(content), {'text': content})
    if not names:
        registered_names = set()
        for item in properties:
            for variant in [item.name, *getattr(item, 'aliases', [])]:
                base = re.sub(r'^DEMO\s+', '', variant, flags=re.I).split('·')[0].strip()
                if base:
                    registered_names.add(base)
        matched_spans = []
        # Prefer the complete registered name when an alias is contained within it.
        for base in sorted(registered_names, key=lambda value: (-len(value), value.casefold())):
            found = re.search(r'(?<!\w)' + re.escape(base) + r'(?!\w)', text, re.I)
            if found and not any(start < found.end() and end > found.start() for start, end in matched_spans):
                matched_spans.append(found.span())
                add('PROPERTY_NAME', found.start(), found.end(), {'text': found.group()})
        if not matched_spans:
            # Restrict OCR fallback to known Kazakh letter confusions, never arbitrary typos.
            for base in sorted(registered_names, key=lambda value: (-len(value), value.casefold())):
                if sum(char.isalpha() for char in base) < 6 or not any(
                    c in KAZAKH_OCR_LETTERS for c in base.casefold()
                ):
                    continue
                pattern = ''.join(
                    f'[{KAZAKH_OCR_LETTERS[c]}]' if c in KAZAKH_OCR_LETTERS else re.escape(c) for c in base.casefold()
                )
                found = re.search(r'(?<!\w)' + pattern + r'(?!\w)', text, re.I)
                if not found or any(start < found.end() and end > found.start() for start, end in matched_spans):
                    continue
                matched_spans.append(found.span())
                add('PROPERTY_NAME', found.start(), found.end(), {'text': found.group()})
            if matched_spans:
                warnings.append(
                    'Название найдено с возможной потерей казахской диакритики. Сверьте объект по оригиналу.'
                )
    mortgage_context = mortgage_information(text) and not any(item['field'] == 'PROPERTY_NAME' for item in hypotheses)
    for start, end in clauses(text):
        content = text[start:end]
        terms = payment_terms(content, mortgage_context=mortgage_context) if not WARNING.search(text) else []
        if terms:
            term, nearest = terms[0]
            required_start = min(term.start(), nearest.start()) if nearest is not None else term.start()
            required_end = max(term.end(), nearest.end()) if nearest is not None else term.end()
            quote_start = max(0, required_start - 120) if len(content) > 2000 else 0
            quote_end = min(len(content), quote_start + 2000)
            value = {'text': content[quote_start:quote_end]}
            if nearest is not None:
                if 'currency' in nearest.re.groupindex:
                    value['money'] = money_value(nearest)
                else:
                    value['percent'] = float(number_value(nearest['amount']))
            if required_end <= quote_end:
                add('PAYMENT_TERM', start + quote_start, start + quote_end, value)
            else:
                warnings.append('Условие оплаты слишком длинное для фрагмента. Проверьте его вручную по оригиналу.')
        for amount in MONEY.finditer(content):
            add('AMOUNT', start + amount.start(), start + amount.end(), {'money': money_value(amount)})
    completed = COMPLETED.search(text)
    under = UNDER.search(text)
    selected = completed or under
    if selected:
        add('STAGE', selected.start(), selected.end(), {'text': 'COMPLETED' if completed else 'UNDER_CONSTRUCTION'})
    if completed and under:
        warnings.append(
            'В тексте есть разные стадии: проверьте конкретную очередь и дату. R3 автоматически не начисляется.'
        )
    if WARNING.search(text):
        warnings.append(
            'Обнаружен контекст предупреждения: условия оплаты автоматически не выделяются. Проверьте смысл по оригиналу.'
        )
    if re.search(r'бастапкы|алгашкы|акылы|кепилакы|ала\s+толем', text, re.I):
        warnings.append('Есть возможная потеря казахской диакритики при OCR. Гипотезы требуют сверки с изображением.')
    if not text.strip():
        warnings.append('OCR не выделил текст. Добавьте ручную расшифровку по оригиналу или более чёткое изображение.')
    if not any(h['field'] == 'PAYMENT_TERM' for h in hypotheses):
        warnings.append(
            'Прямое предложение платежа правилами не выделено. Это не подтверждает отсутствие условий оплаты.'
        )
    return hypotheses, warnings


def match_candidates(text: str, hypotheses: list, properties: list) -> list[dict]:
    names = [h['value']['text'] for h in hypotheses if h['field'] == 'PROPERTY_NAME' and h['value']['text']]
    if not names:
        return []
    candidates = []
    advertised_phase = re.search(r'(?:очеред[ьи]|кезек)\s*(\d+)', text, re.I)
    for item in properties:
        variants = [item.name, *item.aliases, re.sub(r'^DEMO\s+', '', item.name, flags=re.I).split('·')[0]]
        score = max(
            fuzz.WRatio(normalized(name), normalized(variant))
            for name in names
            for variant in variants
            if normalized(variant)
        )
        reasons = ['Строковое сходство названия; это не вероятность совпадения.']
        phase = re.search(r'(?:очеред[ьи]|кезек)\s*(\d+)', item.name, re.I)
        if advertised_phase and phase:
            if phase[1] != advertised_phase[1]:
                score = max(0, score - 35)
                reasons.append('Очередь в рекламе отличается: нужна ручная проверка.')
            else:
                reasons.append('Номер очереди совпадает.')
        if score >= 45:
            candidates.append({'property_id': item.id, 'similarity': round(score, 2), 'reasons': reasons})
    return sorted(candidates, key=lambda c: (-c['similarity'], str(c['property_id'])))[:3]
