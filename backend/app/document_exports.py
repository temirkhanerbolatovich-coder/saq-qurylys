"""Read-only exports of accessible saved records, distinct from evidence and signal snapshots."""

import base64
from html.parser import HTMLParser
from uuid import UUID

from fastapi.encoders import jsonable_encoder
from starlette.exceptions import HTTPException

from app import analysis_dto, dto, monitoring_dto
from app.api.signal_pdf import saved_pdf
from app.models import (
    Advertisement,
    Asset,
    AuditEvent,
    Evidence,
    ExtractionResult,
    LegalBasis,
    MonitoringCandidate,
    MonitoringComparison,
    MonitoringIncident,
    MonitoringRegistrySnapshot,
    Property,
    RiskFactor,
    Signal,
    User,
    utcnow,
)
from app.monitoring import candidate_view
from app.open_registry import OpenRegistryDocument
from app.publication_comparison import compare_publications
from app.signal_pdf import pdf_payload
from app.storage import read_asset
from app.uploads import validate_image
from app.views import factor_views, legal_views, property_view

TITLES = {
    'assets': 'Копия исходного материала',
    'evidence': 'Доказательство и источник',
    'legal-bases': 'Проверка документа основания',
    'risk-factors': 'Решение по фактору риска',
    'advertisements': 'Сохранённая публикация',
    'extractions': 'Результаты анализа публикации',
    'properties': 'Рабочее досье объекта',
    'signals': 'Историческая сигнальная карточка',
    'comparisons': 'Результат сверки источников',
    'registry-snapshots': 'Учебная версия реестра',
    'open-registry': 'Исходный документ КЖК',
    'audit': 'Запись истории решения',
    'incidents': 'Предварительный инцидент',
    'candidates': 'Карточка кандидата',
    'publication-comparison': 'Сравнение сохранённых публикаций',
}


def require(db, model, id):
    row = db.get(model, UUID(str(id)))
    if row is None:
        raise HTTPException(404, 'Материал не найден')
    return row


def source_bytes(row, settings):
    try:
        return read_asset(settings.storage_root, row.storage_key, row.sha256, settings.max_upload_bytes)
    except OSError:
        raise HTTPException(409, 'Исходный файл недоступен или изменён. PDF-копия не создана.') from None


class PlainHTML(HTMLParser):
    """Extract readable text without rendering untrusted HTML or requesting its resources."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ignored = 0
        self.parts = []

    def handle_starttag(self, tag, attrs):
        if tag in {'script', 'style', 'noscript'}:
            self.ignored += 1
        if tag in {'p', 'div', 'br', 'li', 'h1', 'h2', 'h3', 'tr'}:
            self.parts.append('\n')

    def handle_endtag(self, tag):
        if tag in {'script', 'style', 'noscript'} and self.ignored:
            self.ignored -= 1

    def handle_data(self, value):
        if not self.ignored:
            self.parts.append(value)


def append_source(payload, asset, settings, *, include_content=True):
    content = source_bytes(asset, settings)
    payload['sources'].append(
        {
            'id': str(asset.id),
            'mime_type': asset.mime_type,
            'captured_at': asset.captured_at,
            'sha256': asset.sha256,
            'source': asset.source_details or {},
        }
    )
    if not include_content:
        return
    if asset.mime_type in {'image/png', 'image/jpeg'}:
        validate_image(content, asset.mime_type, settings.max_image_pixels)
        payload['images'].append(f'data:{asset.mime_type};base64,{base64.b64encode(content).decode()}')
    elif asset.mime_type in {'text/plain', 'text/html'}:
        try:
            value = content.decode('utf-8-sig')
        except UnicodeDecodeError:
            raise HTTPException(415, 'Исходный текст не является UTF-8. Оригинал доступен отдельно.') from None
        if asset.mime_type == 'text/html':
            parser = PlainHTML()
            parser.feed(value)
            value = ''.join(parser.parts)
        payload['texts'].append(value)
    elif asset.mime_type != 'application/pdf':
        raise HTTPException(415, 'Для этого формата PDF-копия не поддерживается. Скачайте оригинал.')


def export_payload(db, kind, id, settings, *, right_id=None, left_extraction_id=None, right_extraction_id=None):
    """Return a captured record or the exact existing PDF; never write an export as evidence."""
    payload = {
        'title': TITLES[kind],
        'exported_at': utcnow(),
        'is_demo': False,
        'record': {},
        'sources': [],
        'texts': [],
        'images': [],
    }
    prop = None
    if kind in {'assets', 'open-registry'}:
        asset = (
            require(db, Asset, id)
            if kind == 'assets'
            else require(db, Asset, require(db, OpenRegistryDocument, id).asset_id)
        )
        if asset.mime_type == 'application/pdf':
            content = source_bytes(asset, settings)
            if not content.startswith(b'%PDF-'):
                raise HTTPException(409, 'Сохранённый файл не является PDF')
            return content, f'saq-source-{asset.id}.pdf'
        payload['is_demo'] = asset.is_demo
        payload['record'] = {'kind': asset.kind, 'captured_at': asset.captured_at}
        if asset.advertisement_id:
            ad = require(db, Advertisement, asset.advertisement_id)
            payload['record'].update(
                {'source_label': ad.source_label, 'source_url': ad.source_url, 'published_at': ad.published_at}
            )
            prop = db.get(Property, ad.confirmed_property_id) if ad.confirmed_property_id else None
        elif (asset.source_details or {}).get('property_id'):
            try:
                prop = db.get(Property, UUID(str(asset.source_details['property_id'])))
            except ValueError:
                pass  # Older source metadata may contain a human reference rather than a UUID.
        append_source(payload, asset, settings)
    elif kind == 'signals':
        signal = require(db, Signal, id)
        if signal.pdf_state == 'READY':
            try:
                return saved_pdf(db, signal, settings), f'saq-signal-{id}-v{signal.version}-r{signal.revision}.pdf'
            except OSError:
                raise HTTPException(409, 'Сохранённый PDF недоступен. Исторический снимок не изменён.') from None
        # Same frozen source as the existing durable renderer; no current-property recalculation.
        return {
            'signal_payload': pdf_payload(signal),
            'exported_at': utcnow().isoformat(),
        }, f'saq-signal-{id}-v{signal.version}-r{signal.revision}.pdf'
    elif kind in {'evidence', 'legal-bases', 'risk-factors'}:
        model = {'evidence': Evidence, 'legal-bases': LegalBasis, 'risk-factors': RiskFactor}[kind]
        row = require(db, model, id)
        prop = require(db, Property, row.property_id)
        payload['is_demo'] = prop.is_demo
        if kind == 'evidence':
            payload['record'] = {'id': row.id, **row.details}
            append_source(payload, require(db, Asset, row.asset_id), settings)
        elif kind == 'legal-bases':
            payload['record'] = next(value for value in legal_views(db, prop.id) if value.id == id).model_dump(
                mode='json'
            )
            append_source(payload, require(db, Asset, row.details['asset_id']), settings)
        else:
            payload['record'] = next(value for value in factor_views(db, prop.id) if value.id == id).model_dump(
                mode='json'
            )
            for value in row.evidence_ids:
                evidence = require(db, Evidence, UUID(str(value)))
                append_source(payload, require(db, Asset, evidence.asset_id), settings, include_content=False)
    elif kind == 'advertisements':
        row = require(db, Advertisement, id)
        payload['record'] = dto.AdvertisementOut.model_validate(row).model_dump(mode='json')
        payload['is_demo'] = row.is_demo
        prop = db.get(Property, row.confirmed_property_id) if row.confirmed_property_id else None
        for asset in row.assets:
            append_source(payload, asset, settings, include_content=asset.kind == 'IMAGE')
    elif kind == 'extractions':
        row = require(db, ExtractionResult, id)
        ad = require(db, Advertisement, row.advertisement_id)
        payload['record'] = analysis_dto.ExtractionOut.model_validate(row).model_dump(mode='json')
        payload['record'].update(
            {'source_label': ad.source_label, 'source_url': ad.source_url, 'published_at': ad.published_at}
        )
        payload['is_demo'] = ad.is_demo
        append_source(payload, require(db, Asset, row.source_asset_id), settings, include_content=False)
    elif kind == 'properties':
        prop = require(db, Property, id)
        factors = factor_views(db, id)
        payload['record'] = {
            'property': property_view(prop, factors).model_dump(mode='json'),
            'factors': [value.model_dump(mode='json') for value in factors],
            'legal_bases': [value.model_dump(mode='json') for value in legal_views(db, id)],
        }
        payload['is_demo'] = prop.is_demo
        evidence_ids = {UUID(str(value)) for factor in factors for value in factor.evidence_ids}
        bases = legal_views(db, id)
        evidence_ids.update(UUID(str(value)) for basis in bases for value in basis.evidence_ids)
        assets = {require(db, Evidence, value).asset_id for value in evidence_ids}
        assets.update(basis.asset_id for basis in bases)
        for value in sorted(assets, key=str):
            append_source(payload, require(db, Asset, value), settings, include_content=False)
    elif kind in {'registry-snapshots', 'comparisons', 'incidents', 'candidates'}:
        model, schema = {
            'registry-snapshots': (MonitoringRegistrySnapshot, monitoring_dto.RegistrySnapshotOut),
            'comparisons': (MonitoringComparison, monitoring_dto.ComparisonOut),
            'incidents': (MonitoringIncident, monitoring_dto.IncidentOut),
            'candidates': (MonitoringCandidate, monitoring_dto.CandidateOut),
        }[kind]
        row = require(db, model, id)
        payload['record'] = schema.model_validate(row).model_dump(mode='json')
        if kind == 'candidates':
            payload['record'] = candidate_view(db, row).model_dump(mode='json')
        payload['is_demo'] = (
            row.is_demo if hasattr(row, 'is_demo') else require(db, MonitoringCandidate, row.candidate_id).is_demo
        )
        payload['record']['limitation'] = (
            'Предварительная сверка, не правовой вывод. Не подтверждает R1 и не меняет баллы.'
        )
    elif kind == 'audit':
        row = require(db, AuditEvent, id)
        actor = require(db, User, row.actor_id)
        payload['record'] = {
            name: getattr(row, name)
            for name in [
                'action',
                'occurred_at',
                'reason',
                'old_revision',
                'new_revision',
                'entity_type',
                'entity_id',
                'details',
            ]
        }
        payload['record']['actor'] = actor.display_name
        prop = db.get(Property, row.entity_id) if row.entity_type in {'property', 'properties'} else None
        # Audit entries can refer to a factor/signal rather than the property itself.
        if prop is None and row.entity_type == 'risk_factors':
            factor = db.get(RiskFactor, row.entity_id)
            prop = db.get(Property, factor.property_id) if factor else None
        if prop is None and row.entity_type in {'legal_bases', 'evidence', 'signals'}:
            model = {'legal_bases': LegalBasis, 'evidence': Evidence, 'signals': Signal}[row.entity_type]
            entity = db.get(model, row.entity_id)
            prop = db.get(Property, entity.property_id) if entity else None
        if prop is None and row.entity_type == 'advertisements':
            ad = db.get(Advertisement, row.entity_id)
            prop = db.get(Property, ad.confirmed_property_id) if ad and ad.confirmed_property_id else None
        payload['is_demo'] = None if prop is None else prop.is_demo
    elif kind == 'publication-comparison':
        if right_id is None:
            raise HTTPException(422, 'Выберите две сохранённые публикации')
        result = compare_publications(db, id, right_id, left_extraction_id, right_extraction_id)
        payload['record'] = result.model_dump(mode='json')
        payload['is_demo'] = result.left.is_demo or result.right.is_demo
        for value in [id, right_id]:
            for asset in require(db, Advertisement, value).assets:
                append_source(payload, asset, settings, include_content=False)
    if prop is not None:
        payload['object'] = {'name': prop.name, 'city': prop.city, 'address': prop.address}
    return jsonable_encoder(payload), f'saq-{kind}-{id}.pdf'
