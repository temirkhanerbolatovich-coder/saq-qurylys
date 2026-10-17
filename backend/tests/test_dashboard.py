from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest
from sqlalchemy import select

from app.dependencies import get_db
from app.models import Advertisement, Asset, ExtractionResult, Property, RiskFactor, User


@pytest.fixture
def dashboard_rows(signed):
    start = datetime(2099, 1, 1, tzinfo=timezone.utc)
    end = start + timedelta(days=1)
    label = f'DEMO dashboard {uuid4()}'
    with signed.app.state.sessions() as db:
        developer_id = db.scalar(select(Property.developer_id).limit(1))
        actor_id = db.scalar(select(User.id).limit(1))

        def property_row(suffix, city, legal_status='UNKNOWN', is_demo=True):
            row = Property(
                name=f'{label} {suffix}',
                city=city,
                address='DEMO synthetic address',
                developer_id=developer_id,
                legal_verification_status=legal_status,
                is_demo=is_demo,
            )
            db.add(row)
            db.flush()
            return row

        target = property_row('target', label)
        yellow = property_row('yellow', label, 'PENDING')
        other = property_row('other', f'{label} elsewhere', is_demo=False)
        db.add(RiskFactor(property_id=yellow.id, code='R2', status='CONFIRMED', as_of=start, evidence_ids=[]))

        def advertisement(status, prop, captured_at=start, is_demo=True):
            row = Advertisement(
                source_label=label,
                original_text='DEMO synthetic dashboard material',
                created_by=actor_id,
                status=status,
                confirmed_property_id=prop.id if prop else None,
                captured_at=captured_at,
                is_demo=is_demo,
            )
            db.add(row)
            db.flush()
            return row

        advertisement('NEW', target)
        advertisement('ANALYZING', target)
        ready = advertisement('READY_FOR_REVIEW', target)
        advertisement('REVIEWED', target)
        advertisement('FAILED', target)
        advertisement('NEW', target, start - timedelta(microseconds=1))
        advertisement('NEW', target, end)
        advertisement('NEW', target, is_demo=False)
        advertisement('NEW', yellow)
        advertisement('NEW', other, is_demo=False)
        advertisement('NEW', None)
        source = Asset(
            advertisement_id=ready.id,
            kind='TEXT',
            mime_type='text/plain',
            byte_size=1,
            sha256='0' * 64,
            storage_key=str(uuid4()),
            is_demo=True,
        )
        db.add(source)
        db.flush()
        for offset, hypotheses in enumerate(
            [[{'review_status': 'PENDING'}] * 3, [{'review_status': 'PENDING'}, {'review_status': 'REJECTED'}]]
        ):
            db.add(
                ExtractionResult(
                    advertisement_id=ready.id,
                    source_asset_id=source.id,
                    pipeline_version='dashboard-test',
                    analysis_text='DEMO synthetic extraction',
                    hypotheses=hypotheses,
                    warnings=[],
                    created_at=start + timedelta(minutes=offset),
                )
            )
        db.flush()

        def test_db():
            yield db

        # Requests see only this rollback transaction in the existing random test schema.
        signed.app.dependency_overrides[get_db] = test_db
        try:
            yield {'from': start.isoformat(), 'to': end.isoformat(), 'q': target.name, 'city': label}
        finally:
            signed.app.dependency_overrides.pop(get_db)
            db.rollback()


def test_dashboard_counts_only_new_but_keeps_latest_pending_from_other_statuses(signed, dashboard_rows):
    params = {key: dashboard_rows[key] for key in ('from', 'to')}
    response = signed.get('/api/v1/dashboard/summary', params=params)
    assert response.status_code == 200, response.text
    summary = response.json()
    assert summary['new_advertisements'] == 5
    assert summary['pending_hypotheses'] == 1


@pytest.mark.parametrize(
    ('filters', 'expected_new', 'expected_pending'),
    [
        ({'q': '$q'}, 2, 1),
        ({'city': '$city'}, 3, 1),
        ({'zone': 'YELLOW'}, 1, 0),
        ({'legal_status': 'PENDING'}, 1, 0),
        ({'is_demo': 'true'}, 3, 1),
        ({'is_demo': 'false'}, 2, 0),
        ({'q': '$q', 'city': '$city', 'zone': 'GREEN', 'legal_status': 'UNKNOWN', 'is_demo': 'true'}, 1, 1),
        ({'q': 'DEMO absent property'}, 0, 0),
    ],
)
def test_dashboard_new_counter_preserves_filters(signed, dashboard_rows, filters, expected_new, expected_pending):
    params = {key: dashboard_rows[key] for key in ('from', 'to')}
    params.update(
        {key: dashboard_rows[value[1:]] if value.startswith('$') else value for key, value in filters.items()}
    )
    response = signed.get('/api/v1/dashboard/summary', params=params)
    assert response.status_code == 200, response.text
    summary = response.json()
    assert summary['new_advertisements'] == expected_new
    assert summary['pending_hypotheses'] == expected_pending
