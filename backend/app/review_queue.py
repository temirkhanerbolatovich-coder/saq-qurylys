"""Read-side work remaining on the latest analysis; never a legal or review verdict."""

from collections import defaultdict

from sqlalchemy import or_, select
from sqlalchemy.dialects.postgresql import distinct_on
from sqlalchemy.orm import load_only

from app.analysis_dto import AdvertisementReviewWork, PaymentReviewTarget
from app.extraction import payment_offer
from app.models import Advertisement, AuditEvent, Evidence, ExtractionResult, Property, PropertyMatch, RiskFactor

ACTIONS = ('REVIEW_HYPOTHESES', 'REVIEW_MATCH', 'CREATE_PAYMENT_EVIDENCE', 'REVIEW_R2')


def review_work(db, advertisements):
    """Batch-load current decisions for a filtered query before counting or paginating.

    NEW/running/failed analyses have separate processing queues. A missing task does
    not certify that somebody checked the source or that a legal basis is valid.
    """
    ads = dict(
        db.execute(
            advertisements.with_only_columns(Advertisement.id, Advertisement.confirmed_property_id).where(
                Advertisement.status.in_(['READY_FOR_REVIEW', 'REVIEWED'])
            )
        ).all()
    )
    if not ads:
        return {}
    extractions = list(
        db.scalars(
            select(ExtractionResult)
            .options(
                load_only(
                    ExtractionResult.id,
                    ExtractionResult.advertisement_id,
                    ExtractionResult.source_asset_id,
                    ExtractionResult.revision,
                    ExtractionResult.created_at,
                    ExtractionResult.hypotheses,
                )
            )
            .where(ExtractionResult.advertisement_id.in_(ads))
            .ext(distinct_on(ExtractionResult.advertisement_id))
            .order_by(ExtractionResult.advertisement_id, ExtractionResult.created_at.desc(), ExtractionResult.id)
        )
    )
    if not extractions:
        return {}
    matches = defaultdict(list)
    for row in db.scalars(select(PropertyMatch).where(PropertyMatch.extraction_id.in_([e.id for e in extractions]))):
        matches[row.extraction_id].append(row)
    evidence = defaultdict(list)
    property_ids = {value for value in ads.values() if value}
    for row in db.scalars(
        select(Evidence).where(
            Evidence.details['advertisement_id'].as_string().in_([str(value) for value in ads]),
            Evidence.details['kind'].as_string() == 'ADVERTISEMENT_FRAGMENT',
        )
    ):
        evidence[row.details['advertisement_id']].append(row)
        property_ids.add(row.property_id)
    factors = {
        row.property_id: row
        for row in db.scalars(
            select(RiskFactor).where(RiskFactor.property_id.in_(property_ids), RiskFactor.code == 'R2')
        )
    }
    hypothesis_changes, match_changes = {}, {}
    for event in db.scalars(
        select(AuditEvent).where(
            or_(
                (AuditEvent.action == 'HYPOTHESIS_REVIEWED') & AuditEvent.entity_id.in_([e.id for e in extractions]),
                (AuditEvent.action == 'PROPERTY_MATCH_REVIEWED') & AuditEvent.entity_id.in_(ads),
            )
        )
    ):
        if event.action == 'HYPOTHESIS_REVIEWED':
            key = (event.entity_id, event.details['after']['id'])
            hypothesis_changes[key] = max(hypothesis_changes.get(key, event.occurred_at), event.occurred_at)
        elif event.details.get('action') == 'CONFIRM' or (
            event.details.get('before_property_id') == event.details.get('property_id')
        ):
            # Rejecting an unrelated alternative does not change a confirmed binding.
            key = event.entity_id
            match_changes[key] = max(match_changes.get(key, event.occurred_at), event.occurred_at)
    work = {
        extraction.advertisement_id: remaining_work(
            extraction,
            ads[extraction.advertisement_id],
            matches[extraction.id],
            evidence[str(extraction.advertisement_id)],
            factors,
            hypothesis_changes,
            match_changes,
        )
        for extraction in extractions
    }
    target_ids = {target.property_id for item in work.values() for target in item.r2_reviews}
    if target_ids:
        # Resolve the actual historical target in one read, never the ad's current binding.
        names = dict(db.execute(select(Property.id, Property.name).where(Property.id.in_(target_ids))).all())
        for item in work.values():
            for target in item.r2_reviews:
                target.property_name = names.get(target.property_id)
    return work


def remaining_work(extraction, property_id, matches, evidence, factors, hypothesis_changes, match_changes):
    pending = [h['id'] for h in extraction.hypotheses if h['review_status'] == 'PENDING']
    accepted = [h for h in extraction.hypotheses if h['review_status'] in {'CONFIRMED', 'CORRECTED'}]
    payments = [
        h
        for h in accepted
        if h['field'] == 'PAYMENT_TERM' and payment_offer((h['reviewed_value'] or h['value']).get('text') or '')
    ]
    current_match = any(m.property_id == property_id and m.status == 'CONFIRMED' for m in matches)
    needs_match = not current_match and (
        bool(payments)
        or any(h['field'] == 'PROPERTY_NAME' for h in accepted)
        or any(m.status == 'PENDING' for m in matches)
    )
    targets = {}

    def require_r2(target_property_id, factor, ids):
        target = targets.setdefault(
            target_property_id,
            PaymentReviewTarget(
                property_id=target_property_id, factor_id=factor.id if factor else None, evidence_ids=[]
            ),
        )
        target.evidence_ids = sorted(set(target.evidence_ids).union(ids), key=str)

    # A corrected negative source can still leave its old confirmed R2 invalidated.
    for row in evidence:
        factor = factors.get(row.property_id)
        if factor and factor.status == 'PENDING' and str(row.id) in factor.evidence_ids:
            require_r2(row.property_id, factor, [row.id])

    valid_evidence = []
    has_payment_decision = False
    if current_match and payments:
        by_id = {h['id']: h for h in payments}
        factor = factors.get(property_id)
        for row in evidence:
            hypothesis = by_id.get(row.details.get('hypothesis_id'))
            if (
                not hypothesis
                or row.property_id != property_id
                or row.details.get('extraction_id') != str(extraction.id)
                or row.asset_id != extraction.source_asset_id
                or row.details.get('fragment') != hypothesis['fragment']
            ):
                continue
            valid_evidence.append(row.id)
            changed_at = max(
                extraction.created_at,
                hypothesis_changes.get((extraction.id, hypothesis['id']), extraction.created_at),
                match_changes.get(extraction.advertisement_id, extraction.created_at),
            )
            if (
                factor
                and factor.status in {'CONFIRMED', 'REJECTED'}
                and factor.reviewed_by
                and factor.reviewed_at
                and factor.reviewed_at >= changed_at
                and str(row.id) in factor.evidence_ids
            ):
                has_payment_decision = True
        # R2 is existential: one current reviewed payment source is sufficient.
        if valid_evidence and not has_payment_decision:
            require_r2(property_id, factor, valid_evidence)

    needs_evidence = bool(current_match and payments and not valid_evidence)
    actions = []
    if pending:
        actions.append('REVIEW_HYPOTHESES')
    if needs_match:
        actions.append('REVIEW_MATCH')
    if needs_evidence:
        actions.append('CREATE_PAYMENT_EVIDENCE')
    if targets:
        actions.append('REVIEW_R2')
    return AdvertisementReviewWork(
        advertisement_id=extraction.advertisement_id,
        extraction_id=extraction.id,
        extraction_revision=extraction.revision,
        actions=actions,
        pending_hypothesis_ids=pending,
        needs_property_match=needs_match,
        payment_hypothesis_ids=[h['id'] for h in payments] if needs_evidence else [],
        r2_reviews=[targets[key] for key in sorted(targets, key=str)],
    )
