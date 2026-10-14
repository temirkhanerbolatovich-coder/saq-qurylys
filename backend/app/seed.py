"""Idempotent, additive synthetic fixtures. Never resets user-created records."""

import json
import secrets
from datetime import datetime, timezone
from uuid import NAMESPACE_URL, uuid5

from sqlalchemy import create_engine, select, text
from sqlalchemy.orm import Session

from app.config import ROOT, Settings
from app.models import Advertisement, Asset, AuditEvent, Developer, Evidence, LegalBasis, Property, RiskFactor, User
from app.security import hash_password
from app.storage import save_text

DEMO_DATE = datetime(2026, 10, 14, 12, tzinfo=timezone.utc)


def demo_id(key: str):
    return uuid5(NAMESPACE_URL, f'saq-qurylys/demo/v1/{key}')


def seed(db: Session, settings: Settings):
    fixtures = json.loads((ROOT / 'data/seed/fixtures.json').read_text(encoding='utf-8'))
    db.execute(text('SELECT pg_advisory_xact_lock(7310142026)'))
    user = db.scalar(select(User).where(User.username == settings.bootstrap_analyst_username))
    if not user:
        user = User(
            username=settings.bootstrap_analyst_username,
            display_name='Аналитик',
            password_hash=hash_password(settings.bootstrap_analyst_password),
            role='analyst',
        )
        db.add(user)
        db.flush()
    author_id = demo_id('reviewer')
    if not db.get(User, author_id):
        db.add(
            User(
                id=author_id,
                username='demo-fixture-reviewer',
                display_name='DEMO проверяющий (синтетический)',
                password_hash=hash_password(secrets.token_urlsafe(32)),
                role='viewer',
            )
        )
        db.flush()
    added = 0
    for index, item in enumerate(fixtures['properties'], start=1):
        property_id = demo_id(item['key'])
        if db.get(Property, property_id):
            continue
        developer = Developer(
            id=demo_id(f'developer-{index}'), name=f'DEMO компания {index:02}', bin=None, is_demo=True
        )
        db.add(developer)
        db.flush()
        db.add(
            Property(
                id=property_id,
                developer_id=developer.id,
                name=item['name'],
                aliases=[item['key']],
                city='Усть-Каменогорск',
                address=item['address'],
                latitude=item['latitude'],
                longitude=item['longitude'],
                stage='COMPLETED' if item.get('completed') else 'UNDER_CONSTRUCTION',
                progress_percent=item['progress'],
                progress_as_of=DEMO_DATE if item['progress'] is not None else None,
                legal_verification_status=item['legal'],
                last_reviewed_at=DEMO_DATE if item['factors'] else None,
                is_demo=True,
            )
        )
        db.flush()
        for code in item['factors']:
            source_text = next((ad['text'] for ad in fixtures['advertisements'] if ad['property'] == item['key']), '')
            if code == 'R1':
                source_text = f'DEMO заключение: для {item["name"]} на 14.10.2026 проверены применимые механизмы; отсутствие основания установлено. Синтетический учебный документ, юридической силы не имеет.'
            elif code == 'R3':
                source_text += (
                    '\nDEMO проверка: реклама относится к объекту до ввода; стадия подтверждена учебными данными.'
                )
            storage_key, digest, size = save_text(settings.storage_root, source_text)
            asset_id = demo_id(f'{item["key"]}-{code}-asset')
            db.add(
                Asset(
                    id=asset_id,
                    kind='DOCUMENT' if code == 'R1' else 'TEXT',
                    mime_type='text/plain',
                    byte_size=size,
                    sha256=digest,
                    storage_key=storage_key,
                    captured_at=DEMO_DATE,
                    is_demo=True,
                )
            )
            db.flush()
            evidence_id = demo_id(f'{item["key"]}-{code}-evidence')
            db.add(
                Evidence(
                    id=evidence_id,
                    property_id=property_id,
                    asset_id=asset_id,
                    details={
                        'kind': 'LEGAL_ABSENCE_REVIEW' if code == 'R1' else 'ADVERTISEMENT_FRAGMENT',
                        'description': source_text,
                        'source_label': 'DEMO синтетические материалы',
                        'source_url': None,
                        'event_at': DEMO_DATE.isoformat(),
                        'is_demo': True,
                        'captured_at': DEMO_DATE.isoformat(),
                        'created_by': str(author_id),
                    },
                )
            )
            db.add(
                RiskFactor(
                    id=demo_id(f'{item["key"]}-{code}'),
                    property_id=property_id,
                    code=code,
                    status='CONFIRMED',
                    as_of=DEMO_DATE,
                    evidence_ids=[str(evidence_id)],
                    reviewed_by=author_id,
                    reviewed_at=DEMO_DATE,
                    reason='DEMO: синтетическое подтверждение для контрольного сценария, не реальная проверка.',
                )
            )
        if item['legal'] == 'VERIFIED_VALID':
            content = (
                f'DEMO гарантия КЖК №DEMO-003 на {item["name"]}. Синтетический документ, юридической силы не имеет.'
            )
            storage_key, digest, size = save_text(settings.storage_root, content)
            asset_id = demo_id(f'{item["key"]}-guarantee-asset')
            db.add(
                Asset(
                    id=asset_id,
                    kind='DOCUMENT',
                    mime_type='text/plain',
                    byte_size=size,
                    sha256=digest,
                    storage_key=storage_key,
                    captured_at=DEMO_DATE,
                    is_demo=True,
                )
            )
            db.flush()
            db.add(
                LegalBasis(
                    id=demo_id(f'{item["key"]}-guarantee'),
                    property_id=property_id,
                    details={
                        'mechanism': 'KZHK_GUARANTEE',
                        'document_number': 'DEMO-003',
                        'document_date': '2026-10-01',
                        'issuer': 'DEMO синтетический пример гарантии КЖК',
                        'asset_id': str(asset_id),
                        'scope_description': item['name'],
                        'is_demo': True,
                        'captured_at': DEMO_DATE.isoformat(),
                        'verification_status': 'VERIFIED_VALID',
                        'revision': 1,
                        'reviewed_by': str(author_id),
                        'reviewed_at': DEMO_DATE.isoformat(),
                    },
                )
            )
        db.add(
            AuditEvent(
                id=demo_id(f'{item["key"]}-seed-audit'),
                actor_id=author_id,
                occurred_at=DEMO_DATE,
                action='DEMO_SEEDED',
                entity_type='property',
                entity_id=property_id,
                new_revision=1,
                reason='Синтетический набор v1, не реальная проверка человеком.',
            )
        )
        added += 1
    db.flush()
    for index, item in enumerate(fixtures['advertisements'], start=1):
        ad_id = demo_id(f'ad-{index}')
        if db.get(Advertisement, ad_id):
            continue
        key, digest, size = save_text(settings.storage_root, item['text'])
        db.add(
            Advertisement(
                id=ad_id,
                source_label='DEMO учебная публикация',
                source_url=None,
                published_at=DEMO_DATE,
                captured_at=DEMO_DATE,
                original_text=item['text'],
                is_demo=True,
                status='REVIEWED',
                confirmed_property_id=demo_id(item['property']),
                created_by=author_id,
            )
        )
        db.flush()
        db.add(
            Asset(
                id=demo_id(f'ad-{index}-asset'),
                advertisement_id=ad_id,
                kind='TEXT',
                mime_type='text/plain',
                byte_size=size,
                sha256=digest,
                storage_key=key,
                captured_at=DEMO_DATE,
                is_demo=True,
            )
        )
    db.commit()
    return added


if __name__ == '__main__':
    config = Settings()
    engine = create_engine(config.database_url)
    with Session(engine) as session:
        added = seed(session, config)
    engine.dispose()
    print(f'DEMO seed complete; added {added} properties. Existing records preserved.')
