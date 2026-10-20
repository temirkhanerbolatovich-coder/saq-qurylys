"""Bounded, whitelisted current dossier reports; no writes or historical snapshot changes."""

import json
from uuid import UUID

from fastapi.encoders import jsonable_encoder
from pydantic import ValidationError
from sqlalchemy import String, func, or_, select
from starlette.exceptions import HTTPException

from app.legal_absence import LegalMechanismCheck
from app.models import Advertisement, Asset, AuditEvent, Evidence, LegalBasis, Property, Signal, User, utcnow
from app.views import factor_views, property_view, unknown_information

SECTIONS = ('summary', 'documents', 'risk', 'publications', 'evidence', 'history', 'signals', 'sources')
DEFAULT_SECTIONS = ','.join(SECTIONS)
MAX_ROWS = 100
MAX_REPORT_BYTES = 1_048_576
EVIDENCE_FIELDS = (
    'kind',
    'description',
    'source_label',
    'source_url',
    'event_at',
    'captured_at',
    'is_demo',
    'advertisement_id',
    'extraction_id',
    'hypothesis_id',
    'legal_basis_id',
    'fragment',
    'methodology',
    'signatory_count',
    'construction_stage',
    'measurement_percent',
    'measurement_role',
    'comparison_key',
    'planned_completion_at',
    'actual_completion_at',
    'delay_status',
    'absence_as_of',
    'scope_description',
)
SOURCE_FIELDS = ('source_label', 'source_url', 'event_at', 'publisher', 'as_of', 'document_date', 'purpose')
OBSERVATION_FIELDS = (
    'record_id',
    'project',
    'city',
    'address',
    'basis',
    'document_reference',
    'list_date',
    'legal_status',
    'review_priority',
    'notes',
    'official_source',
    'location_source',
    'other_source',
    'ID',
    'ЖК',
    'Адрес',
    'Площадка',
    'Прямой URL',
    'Что рекламируется',
    'Стройстатус',
    'В реестре 15',
    'Исторические сведения',
    'Приоритет',
    'Что сверить',
    'Вывод',
)


def selected_sections(value: str) -> tuple[str, ...]:
    requested = value.split(',')
    if not requested or any(section not in SECTIONS for section in requested) or len(requested) != len(set(requested)):
        raise HTTPException(422, 'Выберите допустимые разделы отчёта без повторений.')
    return tuple(section for section in SECTIONS if section == 'summary' or section in requested)


def bounded_rows(db, statement):
    total = db.scalar(select(func.count()).select_from(statement.order_by(None).subquery()))
    return list(db.scalars(statement.limit(MAX_ROWS))), total


def fields(value, names):
    return {name: getattr(value, name) for name in names}


def public_fields(value, names):
    """Never serialize arbitrary source metadata or audit details into a report."""
    if not isinstance(value, dict):
        return {}
    return {name: value[name] for name in names if name in value}


def evidence_record(row):
    record = {'id': row.id, 'asset_id': row.asset_id, **public_fields(row.details, EVIDENCE_FIELDS)}
    if isinstance(record.get('fragment'), dict):
        fragment = public_fields(
            record['fragment'], ('asset_id', 'text_version_id', 'quote', 'start_offset', 'end_offset', 'bbox')
        )
        if isinstance(fragment.get('bbox'), dict):
            fragment['bbox'] = public_fields(fragment['bbox'], ('x', 'y', 'width', 'height'))
        record['fragment'] = fragment
    checks = row.details.get('legal_checks')
    if record.get('kind') == 'LEGAL_ABSENCE_REVIEW' and isinstance(checks, list):
        record['legal_checks'] = []
        for check in checks[:3]:
            try:
                validated = LegalMechanismCheck.model_validate(
                    public_fields(check, ('mechanism', 'result', 'reason')), strict=True
                )
            except ValidationError:
                continue  # Invalid legacy metadata must not become a reported legal finding.
            record['legal_checks'].append(validated.model_dump(mode='json'))
    return record


def dossier_report(db, property_id: UUID, sections: tuple[str, ...], language: str):
    """Read one repeatable-read snapshot prepared by the route; enforce explicit report scope."""
    prop = db.get(Property, property_id)
    if prop is None:
        raise HTTPException(404, 'Объект не найден')
    generated_at = utcnow()
    factors = factor_views(db, property_id)
    view = property_view(prop, factors)
    output = {
        'language': language,
        'generated_at': generated_at,
        'property': view.model_dump(mode='json'),
        'unknown_information': unknown_information(prop),
        'sections': [],
        'row_limit': MAX_ROWS,
    }

    def append(section, rows, total):
        output['sections'].append({'id': section, 'rows': rows, 'total': total, 'shown': len(rows)})

    advertisement_ids = select(Advertisement.id).where(Advertisement.confirmed_property_id == property_id)
    audit_filter = or_(
        AuditEvent.entity_id == property_id,
        AuditEvent.entity_id.in_(advertisement_ids),
        AuditEvent.details['advertisement_id']
        .as_string()
        .in_(select(Advertisement.id.cast(String)).where(Advertisement.confirmed_property_id == property_id)),
        AuditEvent.details['property_id'].as_string() == str(property_id),
        AuditEvent.details['before_property_id'].as_string() == str(property_id),
    )
    for section in sections:
        if section == 'summary':
            continue
        if section == 'risk':
            append(
                section,
                [factor.model_dump(mode='json', exclude={'reviewed_by_details'}) for factor in factors],
                len(factors),
            )
        elif section == 'documents':
            rows, total = bounded_rows(
                db, select(LegalBasis).where(LegalBasis.property_id == property_id).order_by(LegalBasis.id)
            )
            append(
                section,
                [
                    {
                        'id': row.id,
                        **public_fields(
                            row.details,
                            (
                                'mechanism',
                                'document_number',
                                'document_date',
                                'issuer',
                                'asset_id',
                                'source_url',
                                'applies_from',
                                'applies_until',
                                'scope_description',
                                'is_demo',
                                'captured_at',
                                'verification_status',
                                'revision',
                                'reviewed_at',
                                'reviewed_by',
                                'verification_as_of',
                            ),
                        ),
                    }
                    for row in rows
                ],
                total,
            )
        elif section == 'publications':
            rows, total = bounded_rows(
                db,
                select(Advertisement)
                .where(Advertisement.confirmed_property_id == property_id)
                .order_by(Advertisement.captured_at.desc(), Advertisement.id),
            )
            append(
                section,
                [
                    fields(
                        row,
                        (
                            'id',
                            'source_label',
                            'source_url',
                            'published_at',
                            'captured_at',
                            'original_text',
                            'is_demo',
                            'status',
                            'revision',
                            'confirmed_property_id',
                        ),
                    )
                    for row in rows
                ],
                total,
            )
        elif section == 'evidence':
            rows, total = bounded_rows(
                db, select(Evidence).where(Evidence.property_id == property_id).order_by(Evidence.id)
            )
            append(
                section,
                [evidence_record(row) for row in rows],
                total,
            )
        elif section == 'history':
            rows, total = bounded_rows(
                db, select(AuditEvent).where(audit_filter).order_by(AuditEvent.occurred_at.desc(), AuditEvent.id)
            )
            actor_names = dict(
                db.execute(select(User.id, User.display_name).where(User.id.in_({row.actor_id for row in rows}))).all()
            )
            append(
                section,
                [
                    {
                        **fields(row, ('id', 'action', 'occurred_at', 'reason', 'old_revision', 'new_revision')),
                        'author': actor_names.get(row.actor_id),
                    }
                    for row in rows
                ],
                total,
            )
        elif section == 'signals':
            rows, total = bounded_rows(
                db, select(Signal).where(Signal.property_id == property_id).order_by(Signal.version.desc(), Signal.id)
            )
            append(
                section,
                [
                    {
                        **fields(row, ('id', 'version', 'revision', 'state', 'created_at', 'pdf_state')),
                        'is_demo': row.snapshot.get('property', {}).get('is_demo'),
                        'saved_name': row.snapshot.get('property', {}).get('name'),
                        'risk_snapshot': public_fields(
                            row.snapshot.get('property', {}).get('risk', {}),
                            ('score', 'zone', 'confirmed_codes', 'unknown_codes', 'revision', 'as_of', 'rules_version'),
                        ),
                        'decisions': [
                            public_fields(decision, ('action', 'decided_at', 'reason')) for decision in row.decisions
                        ],
                    }
                    for row in rows
                ],
                total,
            )
        elif section == 'sources':
            # Imported observations remain independent of confirmed publication matching.
            observations, observation_total = bounded_rows(
                db,
                select(AuditEvent)
                .where(
                    AuditEvent.entity_id == property_id,
                    AuditEvent.action == 'SOURCE_PACKAGE_IMPORTED',
                )
                .order_by(AuditEvent.occurred_at.desc(), AuditEvent.id),
            )
            observation_ids = []
            for event in observations:
                try:
                    observation_ids.append(UUID(str(event.details.get('advertisement_id'))))
                except ValueError:
                    pass  # Invalid legacy metadata is not a confirmed identity or an asset reference.
            legal_assets = select(LegalBasis.details['asset_id'].as_string()).where(
                LegalBasis.property_id == property_id
            )
            evidence_assets = select(Evidence.asset_id).where(Evidence.property_id == property_id)
            assets, asset_total = bounded_rows(
                db,
                select(Asset)
                .where(
                    or_(
                        Asset.advertisement_id.in_(advertisement_ids),
                        Asset.advertisement_id.in_(observation_ids),
                        Asset.id.in_(evidence_assets),
                        Asset.id.cast(String).in_(legal_assets),
                    )
                )
                .order_by(Asset.captured_at.desc(), Asset.id),
            )
            ads = {
                row.id: row
                for row in db.scalars(
                    select(Advertisement).where(
                        Advertisement.id.in_({row.advertisement_id for row in assets if row.advertisement_id})
                    )
                )
            }
            source_rows = []
            for asset in assets:
                ad = ads.get(asset.advertisement_id)
                record = fields(asset, ('id', 'kind', 'mime_type', 'byte_size', 'sha256', 'captured_at', 'is_demo'))
                record.update(public_fields(asset.source_details or {}, SOURCE_FIELDS))
                if ad:
                    record.update(fields(ad, ('source_label', 'source_url', 'published_at')))
                    record['identity_confirmed'] = ad.confirmed_property_id == property_id
                if (asset.source_details or {}).get('derived_observation') is True:
                    record['derived_observation'] = True
                source_rows.append(record)
            for event in observations:
                source_rows.append(
                    {
                        'id': event.id,
                        'derived_observation': True,
                        'identity_confirmed': False,
                        'captured_at': event.occurred_at,
                        'observation': public_fields(event.details.get('source_row', {}), OBSERVATION_FIELDS),
                        'files': [
                            public_fields(item, ('name', 'sha256'))
                            for item in event.details.get('package', {}).get('files', [])[:10]
                            if isinstance(item, dict)
                        ],
                        'files_total': len(event.details.get('package', {}).get('files', [])),
                    }
                )
            append(section, source_rows[:MAX_ROWS], asset_total + observation_total)
    encoded = jsonable_encoder(output)
    if len(json.dumps(encoded, ensure_ascii=False).encode('utf-8')) > MAX_REPORT_BYTES:
        raise HTTPException(
            413, 'Отчёт превышает допустимый объём. Выберите меньше разделов; исходники доступны отдельно.'
        )
    return encoded
