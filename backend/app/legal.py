"""Dated applicability of explicitly reviewed documents; missing data never proves absence."""

from datetime import datetime
from zoneinfo import ZoneInfo

from sqlalchemy import select

from app.models import LegalBasis, utcnow

BUSINESS_TIMEZONE = ZoneInfo('Asia/Qyzylorda')


def document_calendar_date(at: datetime):
    return at.astimezone(BUSINESS_TIMEZONE).date()


def applies_at(details: dict, at: datetime) -> bool:
    start, end = details.get('applies_from'), details.get('applies_until')
    return (start is None or datetime.fromisoformat(start) <= at) and (end is None or at <= datetime.fromisoformat(end))


def legal_status_at(db, prop, at=None):
    at = at or utcnow()
    bases = list(db.scalars(select(LegalBasis).where(LegalBasis.property_id == prop.id)))
    if not bases:
        return (
            prop.legal_verification_status
            if prop.legal_verification_status in {'UNKNOWN', 'PENDING', 'VERIFIED_ABSENT'}
            else 'UNKNOWN'
        )
    if any(b.details['verification_status'] == 'VERIFIED_VALID' and applies_at(b.details, at) for b in bases):
        return 'VERIFIED_VALID'
    # Legacy explicit absence in DEMO is retained; new absence decisions are not implemented yet.
    if prop.legal_verification_status == 'VERIFIED_ABSENT':
        return 'VERIFIED_ABSENT'
    if any(b.details['verification_status'] == 'PENDING' for b in bases):
        return 'PENDING'
    return 'UNKNOWN'
