import re
import unicodedata
from decimal import Decimal
from uuid import uuid4

from rapidfuzz import fuzz

PAYMENT = re.compile(
    r'\b(?:платн\w*\s+брон\w*|брон\w*|депозит\w*|задат\w*|аванс\w*|'
    r'(?:первоначальн\w*|перв\w*)\s+взнос\w*|внесите\s+(?:взнос|деньги)|'
    r'а[қк]ылы\s+брондау|брондау|кеп[іи]ла[қк]ы|(?:бастап[қк]ы|ал[ғг]аш[қк]ы)\s+жарна|алдын\s+ала\s+т[өо]лем)',
    re.I,
)
NUMBER = r'(?:\d{1,3}(?:[ \u00a0\u202f]\d{3})+|\d+)(?:[.,]\d{1,2})?'
MONEY = re.compile(
    rf'(?P<amount>{NUMBER})\s*(?P<scale>млн|миллион\w*|мың|тыс\.?)?\s*(?P<currency>₸|тенге|теңге|тг\b|KZT\b|USD\b|\$|EUR\b|€)',
    re.I,
)
PERCENT = re.compile(rf'(?P<amount>{NUMBER})\s*%')
WARNING = re.compile(r'предупрежд|опасайтесь|не\s+(?:вносите|переводите|платите)|сақ\s+бол|алаяқ', re.I)
FREE = r'бесплатн\w*|тегін|ақысыз|без\s+оплат\w*'
UNDER = re.compile(r'строящ\w*|строит\w*|строится|до\s+сдачи|салынып\s+жатыр|құрылыс\s+кезең', re.I)
COMPLETED = re.compile(r'(?:дом\s+)?(?:введ[её]н|готовые\s+квартиры)|пайдалануға\s+берілген', re.I)
NAME_PREFIX = re.compile(r'(?:\bЖК\b|\bТК\b|жилой\s+комплекс|тұрғын\s+үй\s+кешені)\s*[«"“]?([^\n;,.!?»"”]{2,70})', re.I)


def normalized(value: str) -> str:
    value = unicodedata.normalize('NFKC', value).casefold()
    value = re.sub(r'\b(?:demo|жк|тк|жилой комплекс|тұрғын үй кешені)\b', ' ', value)
    return re.sub(r'[^\w]+', ' ', value).strip()


def payment_is_positive(sentence: str, match: re.Match) -> bool:
    if WARNING.search(sentence):
        return False
    before, term, after = (
        sentence[max(0, match.start() - 40) : match.start()],
        match.group(),
        sentence[match.end() : match.end() + 45],
    )
    if re.search(r'(?:\bбез|\bне|\bнет)\s+(?:\w+\s+){0,2}$', before, re.I):
        return False
    if re.match(r'\s*(?:не\s+(?:нуж\w*|треб\w*)|алынбайды|жоқ|қабылданбайды|ұсынылмайды)', after, re.I):
        return False
    if 'брон' in term.casefold():
        if re.search(rf'(?:{FREE})\s*$', before, re.I) or re.match(rf'\s*(?:[-—:=]\s*)?(?:{FREE})', after, re.I):
            return False
    return True


def payment_offer(text: str) -> bool:
    for match in PAYMENT.finditer(text):
        if not payment_is_positive(text, match):
            continue
        close = [
            value
            for value in [*MONEY.finditer(text), *PERCENT.finditer(text)]
            if min(abs(value.start() - match.end()), abs(match.start() - value.end())) <= 65
        ]
        if close and any(
            Decimal(re.sub(r'[ \u00a0\u202f]', '', item['amount']).replace(',', '.')) > 0 for item in close
        ):
            return True
        if re.search(r'платн|а[қк]ылы|внесите', match.group(), re.I):
            return True
    return False


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
        for item in properties:
            base = re.sub(r'^DEMO\s+', '', item.name, flags=re.I).split('·')[0].strip()
            if base:
                found = re.search(r'(?<!\w)' + re.escape(base) + r'(?!\w)', text, re.I)
                if found:
                    add('PROPERTY_NAME', found.start(), found.end(), {'text': found.group()})
    for clause in re.finditer(r'[^\n]+', text):
        for sentence in re.finditer(r'.+?(?:[.!?;](?=\s)|$)', clause.group()):
            content = sentence.group().strip()
            if not content:
                continue
            start = clause.start() + sentence.start() + len(sentence.group()) - len(sentence.group().lstrip())
            if payment_offer(content) and not WARNING.search(text):
                value = {'text': content[:2000]}
                terms = [m for m in PAYMENT.finditer(content) if payment_is_positive(content, m)]

                def distance(amount):
                    return min(min(abs(amount.start() - m.end()), abs(m.start() - amount.end())) for m in terms)

                amounts = sorted([*MONEY.finditer(content), *PERCENT.finditer(content)], key=distance)
                nearest = amounts[0] if amounts and distance(amounts[0]) <= 65 else None
                money = nearest if nearest and 'currency' in nearest.re.groupindex else None
                percent = nearest if nearest and 'currency' not in nearest.re.groupindex else None
                if money:
                    amount = Decimal(re.sub(r'[ \u00a0\u202f]', '', money['amount']).replace(',', '.'))
                    scale = (money['scale'] or '').casefold()
                    amount *= 1_000_000 if scale.startswith(('млн', 'миллион')) else 1000 if scale else 1
                    currency = money['currency'].upper()
                    value['money'] = {
                        'amount': format(amount, 'f'),
                        'currency': 'USD' if currency in {'USD', '$'} else 'EUR' if currency in {'EUR', '€'} else 'KZT',
                    }
                elif percent and Decimal(percent['amount'].replace(',', '.').replace(' ', '')) <= 100:
                    value['percent'] = float(Decimal(percent['amount'].replace(',', '.').replace(' ', '')))
                add('PAYMENT_TERM', start, start + min(len(content), 2000), value)
            for amount in MONEY.finditer(content):
                value = Decimal(re.sub(r'[ \u00a0\u202f]', '', amount['amount']).replace(',', '.'))
                scale = (amount['scale'] or '').casefold()
                value *= 1_000_000 if scale.startswith(('млн', 'миллион')) else 1000 if scale else 1
                currency = amount['currency'].upper()
                add(
                    'AMOUNT',
                    start + amount.start(),
                    start + amount.end(),
                    {
                        'money': {
                            'amount': format(value, 'f'),
                            'currency': 'USD'
                            if currency in {'USD', '$'}
                            else 'EUR'
                            if currency in {'EUR', '€'}
                            else 'KZT',
                        }
                    },
                )
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
