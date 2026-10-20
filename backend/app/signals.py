"""Immutable signal snapshots and comparison with the currently reviewed state."""

from copy import deepcopy
from uuid import UUID

from sqlalchemy import select
from starlette.exceptions import HTTPException

from app.analysis_dto import EvidenceOut
from app.dto import AssetOut, UserOut
from app.models import Asset, Evidence, Signal, User
from app.signal_dto import SignalDetail, SignalOut, SignalSnapshot
from app.storage import read_asset
from app.views import factor_views, legal_views, property_view, unknown_information


def latest_signal(db, property_id):
    return db.scalar(select(Signal).where(Signal.property_id == property_id).order_by(Signal.version.desc()).limit(1))


def build_snapshot(db, prop, storage_root=None) -> SignalSnapshot:
    """Freeze reviewed facts plus the exact referenced provenance and content hashes.

    A storage root is supplied only for commands: reads and stale checks never read
    source files or rewrite a historical snapshot.
    """
    factors = factor_views(db, prop.id)
    bases = sorted(legal_views(db, prop.id), key=lambda item: str(item.id))
    ids = {value for factor in factors for value in factor.evidence_ids}
    ids.update(value for basis in bases for value in basis.evidence_ids)
    evidence_rows = list(db.scalars(select(Evidence).where(Evidence.id.in_(ids)).order_by(Evidence.id))) if ids else []
    if len(evidence_rows) != len(ids) or any(row.property_id != prop.id for row in evidence_rows):
        raise HTTPException(409, 'Доказательства оценки недоступны или относятся к другому объекту')
    evidence = [
        EvidenceOut(id=row.id, property_id=row.property_id, asset_id=row.asset_id, **row.details)
        for row in evidence_rows
    ]
    asset_ids = {row.asset_id for row in evidence}
    asset_ids.update(row.fragment.asset_id for row in evidence if row.fragment)
    asset_ids.update(row.asset_id for row in bases)
    assets = list(db.scalars(select(Asset).where(Asset.id.in_(asset_ids)).order_by(Asset.id))) if asset_ids else []
    if len(assets) != len(asset_ids) or any(row.is_demo != prop.is_demo for row in [*evidence, *bases, *assets]):
        raise HTTPException(409, 'Исходники оценки недоступны или смешивают DEMO и реальные материалы')
    if storage_root is not None:
        for row in assets:
            try:
                read_asset(storage_root, row.storage_key, row.sha256)
            except OSError:
                raise HTTPException(409, 'Исходник недоступен или не совпадает контрольная сумма') from None
        # Freeze available reviewer names once, at signal creation. Legacy reads
        # retain their saved ID and never resolve it through today's user profile.
        reviewer_ids = {row.reviewed_by for row in [*factors, *bases] if row.reviewed_by}
        reviewers = (
            {row.id: UserOut.model_validate(row) for row in db.scalars(select(User).where(User.id.in_(reviewer_ids)))}
            if reviewer_ids
            else {}
        )
        factors = [row.model_copy(update={'reviewed_by_details': reviewers.get(row.reviewed_by)}) for row in factors]
        bases = [row.model_copy(update={'reviewed_by_details': reviewers.get(row.reviewed_by)}) for row in bases]
    return SignalSnapshot(
        property=property_view(prop, factors),
        legal_bases=bases,
        factors=factors,
        evidence=evidence,
        assets=[AssetOut.model_validate(row) for row in assets],
        unknown_information=unknown_information(prop),
    )


def comparable_snapshot(snapshot: dict) -> dict:
    result = deepcopy(snapshot)
    # No-review properties report "now" as risk.as_of. Time passing alone is not
    # a source change; dated legal applicability remains part of the comparison.
    result['property']['risk'].pop('as_of', None)
    # Output defaults clarify legacy dates without changing stored snapshots or
    # making old signals stale merely because the DTO gained optional fields.
    for evidence in result.get('evidence', []):
        evidence.setdefault('published_at', None)
        evidence.setdefault('date_basis', 'LEGACY_UNSPECIFIED')
    # Presentation identity enrichments are not source/review changes. The ID,
    # review time, assessment date and result remain meaningful comparisons.
    for record in [*result.get('factors', []), *result.get('legal_bases', [])]:
        record.pop('reviewed_by_details', None)
    return result


def signal_is_stale(db, row, prop=None, current=None) -> bool:
    latest = latest_signal(db, row.property_id)
    if latest and latest.id != row.id:
        return True
    if prop is None:
        from app.models import Property

        prop = db.get(Property, row.property_id)
    if not prop:
        return True
    if prop.revision != row.snapshot['property']['risk']['revision']:
        return True
    try:
        current = current or build_snapshot(db, prop)
    except HTTPException:
        return True
    return comparable_snapshot(current.model_dump(mode='json')) != comparable_snapshot(row.snapshot)


def signal_view(db, row, *, prop=None, current=None) -> SignalOut:
    return SignalOut(
        id=row.id,
        property_id=row.property_id,
        version=row.version,
        revision=row.revision,
        previous_signal_id=row.previous_signal_id,
        state=row.state,
        is_stale=signal_is_stale(db, row, prop, current),
        risk_snapshot=row.snapshot['property']['risk'],
        created_at=row.created_at,
        created_by=row.created_by_details,
        is_demo=row.snapshot['property']['is_demo'],
        pdf_state=row.pdf_state,
        pdf_job_id=row.pdf_job_id,
    )


def signal_detail(db, row, **kwargs) -> SignalDetail:
    return SignalDetail(signal=signal_view(db, row, **kwargs), snapshot=row.snapshot, decisions=row.decisions)


def signal_locked(db, signal_id: UUID):
    row = db.scalar(
        select(Signal).where(Signal.id == signal_id).with_for_update().execution_options(populate_existing=True)
    )
    if not row:
        raise HTTPException(404, 'Сигнал не найден')
    return row
