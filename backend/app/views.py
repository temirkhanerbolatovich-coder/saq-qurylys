from sqlalchemy import select
from sqlalchemy.orm import Session, object_session

from app import dto
from app.legal import legal_status_at
from app.models import Evidence, LegalBasis, Property, RiskFactor, utcnow
from app.risk import WEIGHTS, calculate_risk


def factor_views(db: Session, property_id) -> list[dto.RiskFactorOut]:
    rows = db.scalars(select(RiskFactor).where(RiskFactor.property_id == property_id).order_by(RiskFactor.code))
    return [
        dto.RiskFactorOut.model_validate(
            {
                **{name: getattr(row, name) for name in dto.RiskFactorOut.model_fields if name != 'weight'},
                'weight': WEIGHTS[row.code],
            }
        )
        for row in rows
    ]


def property_view(row: Property, factors: list[dto.RiskFactorOut]) -> dto.PropertyOut:
    score, zone, confirmed = calculate_risk([(f.code, f.status) for f in factors])
    known = {f.code for f in factors if f.status in {'CONFIRMED', 'REJECTED'}}
    risk = dto.RiskSummaryOut(
        score=score,
        zone=zone,
        revision=row.revision,
        as_of=row.last_reviewed_at or utcnow(),
        confirmed_codes=confirmed,
        unknown_codes=[code for code in WEIGHTS if code not in known],
    )
    values = {
        name: getattr(row, name)
        for name in dto.PropertyOut.model_fields
        if name not in {'risk', 'developer', 'authorized_company', 'contractor'}
    }
    session = object_session(row)
    if session:
        values['legal_verification_status'] = legal_status_at(session, row)
    return dto.PropertyOut(**values, developer=dto.DeveloperOut.model_validate(row.developer), risk=risk)


def legal_views(db: Session, property_id) -> list[dto.LegalBasisOut]:
    rows = db.scalars(select(LegalBasis).where(LegalBasis.property_id == property_id))
    return [
        dto.LegalBasisOut(
            id=row.id,
            property_id=row.property_id,
            **row.details,
            evidence_ids=list(
                db.scalars(select(Evidence.id).where(Evidence.details['legal_basis_id'].as_string() == str(row.id)))
            ),
        )
        for row in rows
    ]


def unknown_information(row: Property) -> list[str]:
    result = []
    session = object_session(row)
    status = legal_status_at(session, row) if session else row.legal_verification_status
    if status in {'UNKNOWN', 'PENDING'}:
        result.append('Нет подтверждённого применимого основания на текущую дату. Это не подтверждает R1.')
    if row.progress_percent is None:
        result.append('Нет датированной проверки готовности.')
    return result
