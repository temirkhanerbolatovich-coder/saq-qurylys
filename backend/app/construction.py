"""Dated, manually supplied construction facts. No facts are inferred from registry gaps."""

from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import AwareDatetime, Field, model_validator
from sqlalchemy import select
from starlette.exceptions import HTTPException

from app.dto import DTO
from app.legal import document_calendar_date
from app.models import Advertisement, Asset, Evidence, ExtractionResult, PropertyMatch, utcnow
from app.storage import read_asset

DocumentPurpose = Literal[
    'COLLECTIVE_APPEAL', 'LEGAL_BASIS', 'CONSTRUCTION_STAGE', 'PROGRESS_MEASUREMENT', 'DELAY_DOCUMENT'
]
CONSTRUCTION_KINDS = {'CONSTRUCTION_STAGE', 'PROGRESS_MEASUREMENT', 'DELAY_DOCUMENT'}
FACT_FIELDS = (
    'construction_stage',
    'measurement_percent',
    'measurement_role',
    'comparison_key',
    'planned_completion_at',
    'actual_completion_at',
    'delay_status',
)


class DocumentFacts(DTO):
    purpose: DocumentPurpose
    event_at: AwareDatetime
    construction_stage: Literal['UNDER_CONSTRUCTION', 'COMPLETED'] | None = None
    measurement_percent: float | None = Field(default=None, ge=0, le=100)
    measurement_role: Literal['DECLARED', 'VERIFIED'] | None = None
    comparison_key: str | None = Field(default=None, min_length=1, max_length=300)
    planned_completion_at: AwareDatetime | None = None
    actual_completion_at: AwareDatetime | None = None
    delay_status: Literal['NOT_COMPLETED', 'COMPLETED_LATE'] | None = None

    @model_validator(mode='after')
    def consistent_facts(self):
        allowed = {
            'CONSTRUCTION_STAGE': {'construction_stage'},
            'PROGRESS_MEASUREMENT': {'measurement_percent', 'measurement_role', 'comparison_key'},
            'DELAY_DOCUMENT': {'planned_completion_at', 'actual_completion_at', 'delay_status'},
        }.get(self.purpose, set())
        if any(getattr(self, field) is not None for field in FACT_FIELDS if field not in allowed):
            raise ValueError('Поля документа не соответствуют выбранному назначению')
        if self.purpose == 'CONSTRUCTION_STAGE' and self.construction_stage is None:
            raise ValueError('Укажите стадию из датированного источника')
        if self.purpose == 'PROGRESS_MEASUREMENT' and (
            self.measurement_percent is None
            or not self.measurement_role
            or not self.comparison_key
            or not self.comparison_key.strip()
        ):
            raise ValueError('Укажите процент, роль измерения и область/ключ сравнения')
        if self.purpose == 'DELAY_DOCUMENT':
            planned, actual = self.planned_completion_at, self.actual_completion_at
            if not planned or not self.delay_status:
                raise ValueError('Укажите плановую дату и документально проверенный статус сдачи')
            if document_calendar_date(self.event_at) <= document_calendar_date(planned):
                raise ValueError('Документ должен подтверждать задержку после плановой календарной даты')
            if self.delay_status == 'NOT_COMPLETED' and actual is not None:
                raise ValueError('Для несданного объекта фактическая дата должна отсутствовать')
            if self.delay_status == 'COMPLETED_LATE' and (
                not actual
                or document_calendar_date(actual) <= document_calendar_date(planned)
                or actual > self.event_at
            ):
                raise ValueError('Фактическая сдача должна быть позже плановой даты и не позже проверки')
        return self


def intact_asset(root, asset):
    if not asset:
        raise HTTPException(422, 'Источник не найден')
    try:
        read_asset(root, asset.storage_key, asset.sha256)
    except OSError:
        raise HTTPException(409, 'Оригинал недоступен или нарушена контрольная сумма') from None


def document_source(db, prop, asset_id, kind, root):
    asset = db.get(Asset, asset_id)
    source = asset.source_details if asset else None
    if (
        not asset
        or asset.kind != 'DOCUMENT'
        or asset.advertisement_id
        or not source
        or source.get('property_id') != str(prop.id)
        or source.get('purpose') != kind
    ):
        raise HTTPException(422, 'Нужен самостоятельный документ этого ЖК с соответствующим назначением')
    if asset.is_demo != prop.is_demo:
        raise HTTPException(422, 'Нельзя смешивать DEMO и реальные документы')
    if not source.get('methodology') or not source['methodology'].strip():
        raise HTTPException(422, 'Укажите основание ручной проверки')
    try:
        facts = DocumentFacts.model_validate(
            {'purpose': kind, 'event_at': source['event_at'], **{field: source.get(field) for field in FACT_FIELDS}}
        )
    except (ValueError, KeyError):
        raise HTTPException(422, 'Документ не содержит согласованных датированных фактов') from None
    if facts.event_at > utcnow():
        raise HTTPException(422, 'Дата источника не может быть в будущем')
    intact_asset(root, asset)
    return asset, source, facts


def publication_source(db, prop, evidence, root):
    details = evidence.details
    ad = db.get(Advertisement, UUID(details['advertisement_id'])) if details.get('advertisement_id') else None
    extraction = db.get(ExtractionResult, UUID(details['extraction_id'])) if details.get('extraction_id') else None
    if (
        not ad
        or ad.confirmed_property_id != prop.id
        or ad.is_demo != prop.is_demo
        or not extraction
        or extraction.advertisement_id != ad.id
        or extraction.source_asset_id != evidence.asset_id
    ):
        raise HTTPException(422, 'Публикации нужна подтверждённая привязка этой версии к тому же ЖК')
    if not ad.published_at or ad.published_at > utcnow():
        raise HTTPException(422, 'Для R3 нужна известная дата рекламной публикации не в будущем')
    match = db.scalar(
        select(PropertyMatch.id).where(
            PropertyMatch.advertisement_id == ad.id,
            PropertyMatch.extraction_id == extraction.id,
            PropertyMatch.property_id == prop.id,
            PropertyMatch.status == 'CONFIRMED',
        )
    )
    if not match:
        raise HTTPException(422, 'Подтвердите привязку именно этой версии публикации')
    correction = db.scalar(
        select(ExtractionResult.created_at)
        .where(ExtractionResult.advertisement_id == ad.id, ExtractionResult.parent_extraction_id.is_not(None))
        .order_by(ExtractionResult.created_at.desc())
        .limit(1)
    )
    if correction and extraction.created_at < correction:
        raise HTTPException(422, 'Расшифровка исправлена: проверьте новую версию публикации')
    intact_asset(root, db.get(Asset, evidence.asset_id))
    return ad


def validate_construction_factor(db, prop, ids, as_of, code, root):
    expected = {
        'R3': {'CONSTRUCTION_STAGE', 'ADVERTISEMENT_PUBLICATION'},
        'R5': {'PROGRESS_MEASUREMENT'},
        'R6': {'DELAY_DOCUMENT'},
    }[code]
    needed = 1 if code == 'R6' else 2
    if len(ids) != needed or len(set(ids)) != needed:
        raise HTTPException(422, f'{code}: нужны {needed} различных доказательств')
    documents, ads = [], []
    for id in ids:
        evidence = db.get(Evidence, id)
        if (
            not evidence
            or evidence.property_id != prop.id
            or evidence.details.get('kind') not in expected
            or evidence.details.get('is_demo') != prop.is_demo
        ):
            raise HTTPException(422, f'{code}: неподходящее доказательство или другая область ЖК')
        kind = evidence.details['kind']
        if kind == 'ADVERTISEMENT_PUBLICATION':
            ad = publication_source(db, prop, evidence, root)
            if ad.published_at > as_of:
                raise HTTPException(422, 'Дата оценки не может предшествовать рекламе')
            ads.append((ad, db.get(Asset, evidence.asset_id)))
            continue
        asset, source, facts = document_source(db, prop, evidence.asset_id, kind, root)
        if facts.event_at > as_of or any(
            evidence.details.get(field) != source.get(field) for field in (*FACT_FIELDS, 'event_at', 'methodology')
        ):
            raise HTTPException(
                422, 'Дата оценки предшествует источнику или снимок не совпадает с оригинальными фактами'
            )
        documents.append((asset, source, facts))
    if code == 'R3':
        if len(documents) != 1 or len(ads) != 1 or documents[0][2].construction_stage != 'UNDER_CONSTRUCTION':
            raise HTTPException(422, 'R3 требует рекламу и независимое подтверждение стройки до ввода')
        ad, original = ads[0]
        if documents[0][0].sha256 == original.sha256:
            raise HTTPException(422, 'Документ о стадии должен отличаться от оригинала рекламы')
        if document_calendar_date(documents[0][2].event_at) != document_calendar_date(ad.published_at):
            raise HTTPException(422, 'В текущем MVP стадия и реклама должны подтверждаться на один календарный день')
    if code == 'R5':
        first, second = documents
        facts1, facts2 = first[2], second[2]
        if {facts1.measurement_role, facts2.measurement_role} != {'DECLARED', 'VERIFIED'}:
            raise HTTPException(422, 'R5 требует заявленную и проверенную готовность')
        if first[0].sha256 == second[0].sha256 or document_calendar_date(facts1.event_at) != document_calendar_date(
            facts2.event_at
        ):
            raise HTTPException(422, 'R5 требует разные источники за один календарный день')
        if (
            facts1.comparison_key.strip().casefold() != facts2.comparison_key.strip().casefold()
            or first[1]['methodology'].strip().casefold() != second[1]['methodology'].strip().casefold()
        ):
            raise HTTPException(422, 'R5 требует одинаковую область и методику сравнения')
        if abs(Decimal(str(facts1.measurement_percent)) - Decimal(str(facts2.measurement_percent))) < Decimal('20'):
            raise HTTPException(422, 'Расхождение готовности меньше 20 процентных пунктов')
