"""Bounded CSV observations: preview without writes, immutable receipts, explicit commit.

No fetching, legal decisions, automatic entity links or analysis jobs. Source IDs
identify a publication, while content fingerprints preserve changed observations.
"""

import csv
import hashlib
import io
import json
from dataclasses import dataclass
from datetime import UTC, datetime
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from sqlalchemy import select
from starlette.exceptions import HTTPException

from app.dto import AdvertisementCreate
from app.models import Advertisement, Asset, CsvImportedMaterial, Property

MAX_BYTES = 262144
MAX_ROWS = 100
VERSION = 'csv-v1'
STANDARD_FIELDS = {
    'source_label',
    'source_url',
    'text',
    'published_at',
    'platform',
    'external_id',
    'project_name',
    'city',
}
SOCIAL_FIELDS = {
    'ID',
    'ЖК',
    'Площадка',
    'Тип материала',
    'Дата материала',
    'Наблюдаемый фрагмент',
    'Сигнал/интерпретация',
    'В списке 15',
    'Основание/стадия',
    'Следующее действие',
    'Приоритет',
    'Ссылка на доказательство',
    'Оговорка',
    'Уровень проверки',
    'Дата фиксации',
}


def digest(value):
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True).encode()).hexdigest()


def canonical_url(value):
    """Normalize tracking only; never resolve URLs or guess equivalent paths."""
    if not value:
        return ''
    try:
        parsed = urlsplit(value)
        if (
            parsed.scheme not in {'http', 'https'}
            or not parsed.hostname
            or parsed.username
            or parsed.password
            or len(value) > 2048
            or any(ord(c) < 33 for c in value)
        ):
            raise ValueError
        port = parsed.port
        host = parsed.hostname.lower().removeprefix('www.')
        host = f'[{host}]' if ':' in host else host
        netloc = host + (f':{port}' if port and port != (443 if parsed.scheme == 'https' else 80) else '')
        query = [
            (k, v)
            for k, v in parse_qsl(parsed.query, keep_blank_values=True)
            if not k.lower().startswith('utm_') and k.lower() not in {'fbclid', 'gclid'}
        ]
        return urlunsplit((parsed.scheme.lower(), netloc, parsed.path or '/', urlencode(query), ''))
    except ValueError:
        raise HTTPException(422, 'Некорректная ссылка в CSV; допустимы HTTP(S) без пароля.') from None


def social_content(rows):
    # Source row IDs are file-local; all substantive fields and caveats remain.
    return sorted(
        [{k: v for k, v in row.items() if k != 'ID'} for row in rows], key=lambda r: json.dumps(r, sort_keys=True)
    )


def existing_url(value):
    # A malformed historical URL must not make unrelated file previews fail.
    try:
        return canonical_url(value)
    except HTTPException:
        return None


@dataclass
class CsvMaterial:
    rows: list[int]
    source_label: str
    source_url: str | None
    text: str
    published_at: datetime | None
    project_name: str
    city: str
    kind: str
    identity_key: str
    fingerprint: str
    source_rows: list[dict]


def parse_csv(raw, is_demo):
    if not raw or len(raw) > MAX_BYTES:
        raise HTTPException(413, 'CSV должен содержать от 1 байта до 256 КиБ.')
    try:
        decoded = raw.decode('utf-8-sig')
        if any(ord(c) < 32 and c not in '\n\r\t' for c in decoded):
            raise ValueError
        header = decoded.splitlines()[0]
        delimiter = ';' if header.count(';') > header.count(',') else ','
        reader = csv.reader(io.StringIO(decoded, newline=''), delimiter=delimiter, strict=True)
        fields = next(reader)
        if len(fields) != len(set(fields)):
            raise ValueError
        social = set(fields) == SOCIAL_FIELDS
        if not social and (not {'source_label', 'source_url', 'text'} <= set(fields) or set(fields) - STANDARD_FIELDS):
            raise HTTPException(
                422, 'Заголовки CSV не поддерживаются. Используйте шаблон или формат социального аудита.'
            )
        rows = []
        for values in reader:
            if not values or all(not v.strip() for v in values):
                continue
            if len(values) != len(fields) or len(rows) >= MAX_ROWS or any(len(v) > 30000 for v in values):
                raise ValueError
            rows.append(dict(zip(fields, values, strict=True)))
        if not rows:
            raise ValueError
    except (UnicodeError, csv.Error, ValueError, StopIteration, IndexError):
        raise HTTPException(
            422, 'Проверьте UTF-8, кавычки и столбцы CSV: 1–100 строк, поле до 30000 символов.'
        ) from None
    groups = {}
    for index, row in enumerate(rows, 2):
        if social:
            if not row['ЖК'].strip() or not row['Наблюдаемый фрагмент'].strip():
                raise HTTPException(422, f'Строка {index}: нужны название ЖК и наблюдаемый фрагмент.')
            source = canonical_url(row['Ссылка на доказательство'].strip())
            if not source:
                raise HTTPException(422, f'Строка {index}: укажите ссылку на источник наблюдения.')
            group_key = (row['ЖК'], source)
        else:
            group_key = (index,)
        groups.setdefault(group_key, []).append((index, row))
    materials = []
    for group in groups.values():
        numbers, originals = [x[0] for x in group], [x[1] for x in group]
        row = originals[0]
        if social:
            label = f'Наблюдение из файла · {row["Площадка"]} · {row["ЖК"]}'
            url = row['Ссылка на доказательство'].strip()
            content = social_content(originals)
            text = (
                'НАБЛЮДЕНИЕ ИЗ ФАЙЛА. Пересказ автора, не полученный оригинал страницы. '
                'Даты, проверенность и выводы указаны автором; связь с ЖК и факторы не подтверждены.\n\n'
                + '\n\n'.join('\n'.join(f'{k}: {v}' for k, v in r.items()) for r in originals)
            )
            published, project, city, kind = None, row['ЖК'].strip(), '', 'RESEARCH'
            identity = [kind, canonical_url(url), project]
        else:
            label, url, text = row['source_label'].strip(), row['source_url'].strip() or None, row['text']
            published, project, city = (
                row.get('published_at') or None,
                row.get('project_name', '').strip(),
                row.get('city', '').strip(),
            )
            kind = 'TEXT' if text.strip() else 'LINK'
            canonical = canonical_url(url)
            if not text.strip() and not canonical:
                raise HTTPException(422, f'Строка {numbers[0]}: нужен текст или ссылка.')
            if kind == 'LINK':
                text = 'ССЫЛКА БЕЗ ОРИГИНАЛА. Текст интернет-страницы не получен.\n' + url
            platform, external = row.get('platform', '').strip().lower(), row.get('external_id', '').strip()
            if external and not platform:
                raise HTTPException(422, f'Строка {numbers[0]}: external_id требует platform.')
            identity = [kind, platform, external] if external else [kind, canonical or [label, text]]
            content = [row['text'], published, project, city]
        try:
            validated = AdvertisementCreate(
                text=text, source_label=label, source_url=url, published_at=published, is_demo=is_demo
            )
        except ValueError:
            raise HTTPException(
                422, f'Строка {numbers[0]}: проверьте источник, текст и дату ISO 8601 с часовым поясом.'
            ) from None
        if not social:
            content[1] = validated.published_at.astimezone(UTC).isoformat() if validated.published_at else None
        if len(project) > 300 or len(city) > 100:
            raise HTTPException(422, f'Строка {numbers[0]}: слишком длинное название ЖК или города.')
        key = digest([is_demo, identity])
        materials.append(
            CsvMaterial(
                numbers,
                label,
                url,
                text,
                validated.published_at,
                project,
                city,
                kind,
                key,
                digest([VERSION, key, content]),
                originals,
            )
        )
    return ('SOCIAL_AUDIT' if social else 'STANDARD'), len(rows), materials


def preview_entries(db, materials, is_demo):
    entries, seen = [], {}
    fingerprints = [m.fingerprint for m in materials]
    known = {
        r.fingerprint: r
        for r in db.scalars(select(CsvImportedMaterial).where(CsvImportedMaterial.fingerprint.in_(fingerprints)))
    }
    # Existing imports retain their own IDs. Read only matching source URLs; never
    # equate an indexed research summary with the original publication text.
    urls = {canonical_url(m.source_url) for m in materials if m.source_url}
    source_ids = [
        id
        for id, url in db.execute(
            select(Advertisement.id, Advertisement.source_url).where(
                Advertisement.is_demo == is_demo,
            )
        )
        if existing_url(url) in urls or (not url and any(not m.source_url for m in materials))
    ]
    existing = list(db.scalars(select(Advertisement).where(Advertisement.id.in_(source_ids))))
    research = list(
        db.scalars(select(Asset).where(Asset.advertisement_id.in_(source_ids), Asset.source_details.is_not(None)))
    )
    for material in materials:
        ad_id, previous_id = None, None
        status, duplicate_of = 'NEW', None
        if material.fingerprint in seen:
            status, duplicate_of = 'DUPLICATE_IN_FILE', seen[material.fingerprint]
        elif material.fingerprint in known:
            status, ad_id = 'DUPLICATE', known[material.fingerprint].advertisement_id
        else:
            for ad in existing:
                if existing_url(ad.source_url) != canonical_url(material.source_url):
                    continue
                if not material.source_url and ad.source_label != material.source_label:
                    continue
                if (
                    material.kind == 'TEXT'
                    and ad.original_text == material.text
                    and ad.published_at == material.published_at
                ):
                    ad_id = ad.id
                if material.kind == 'RESEARCH':
                    for asset in research:
                        if asset.advertisement_id == ad.id and isinstance(asset.source_details.get('rows'), list):
                            if social_content(asset.source_details['rows']) == social_content(material.source_rows):
                                ad_id = ad.id
                if ad_id:
                    break
            if ad_id:
                status = 'DUPLICATE'
            else:
                previous_id = db.scalar(
                    select(CsvImportedMaterial.advertisement_id)
                    .where(CsvImportedMaterial.identity_key == material.identity_key)
                    .order_by(CsvImportedMaterial.created_at.desc())
                    .limit(1)
                )
                if previous_id:
                    status = 'CHANGED'
        seen.setdefault(material.fingerprint, material.rows[0])
        candidates = []
        if material.project_name:
            term = material.project_name.replace('\\', '\\\\').replace('%', '\\%').replace('_', '\\_')
            query = select(Property).where(Property.is_demo == is_demo, Property.name.ilike(f'%{term}%', escape='\\'))
            if material.city:
                query = query.where(Property.city == material.city)
            candidates = [
                {'id': str(p.id), 'name': p.name, 'address': p.address}
                for p in db.scalars(query.order_by(Property.name, Property.id).limit(3))
            ]
        entries.append(
            {
                'rows': material.rows,
                'kind': material.kind,
                'source_label': material.source_label,
                'source_url': material.source_url,
                'text': material.text,
                'project_name': material.project_name,
                'status': status,
                'advertisement_id': str(ad_id) if ad_id else None,
                'previous_advertisement_id': str(previous_id) if previous_id else None,
                'duplicate_of': duplicate_of,
                'candidates': candidates,
            }
        )
    return entries
