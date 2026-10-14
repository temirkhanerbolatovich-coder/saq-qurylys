from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = 'users'
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    username: Mapped[str] = mapped_column(String(100), unique=True)
    display_name: Mapped[str] = mapped_column(String(300))
    password_hash: Mapped[str] = mapped_column(Text)
    role: Mapped[str] = mapped_column(String(20), default='analyst')


class LoginSession(Base):
    __tablename__ = 'sessions'
    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[UUID] = mapped_column(ForeignKey('users.id'))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    user: Mapped[User] = relationship()


class Developer(Base):
    __tablename__ = 'developers'
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(String(300))
    bin: Mapped[str | None] = mapped_column(String(12))
    is_demo: Mapped[bool] = mapped_column(Boolean, default=True)


class Property(Base):
    __tablename__ = 'properties'
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    parent_id: Mapped[UUID | None] = mapped_column(ForeignKey('properties.id'))
    level: Mapped[str] = mapped_column(String(20), default='PHASE')
    name: Mapped[str] = mapped_column(String(300), index=True)
    aliases: Mapped[list] = mapped_column(JSON, default=list)
    city: Mapped[str] = mapped_column(String(100))
    address: Mapped[str] = mapped_column(String(300))
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    developer_id: Mapped[UUID] = mapped_column(ForeignKey('developers.id'))
    stage: Mapped[str] = mapped_column(String(30), default='UNKNOWN')
    progress_percent: Mapped[float | None] = mapped_column(Float)
    progress_as_of: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    legal_verification_status: Mapped[str] = mapped_column(String(30), default='UNKNOWN')
    last_reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    revision: Mapped[int] = mapped_column(Integer, default=1)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=True)
    developer: Mapped[Developer] = relationship()


class Advertisement(Base):
    __tablename__ = 'advertisements'
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    revision: Mapped[int] = mapped_column(Integer, default=1)
    source_label: Mapped[str] = mapped_column(String(300))
    source_url: Mapped[str | None] = mapped_column(String(2048))
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    captured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
    original_text: Mapped[str] = mapped_column(Text)
    is_demo: Mapped[bool] = mapped_column(Boolean)
    status: Mapped[str] = mapped_column(String(30), default='NEW')
    confirmed_property_id: Mapped[UUID | None] = mapped_column(ForeignKey('properties.id'))
    created_by: Mapped[UUID] = mapped_column(ForeignKey('users.id'))
    latest_job_id: Mapped[UUID | None] = mapped_column()
    assets: Mapped[list['Asset']] = relationship(order_by='Asset.id')


class Asset(Base):
    __tablename__ = 'assets'
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    advertisement_id: Mapped[UUID | None] = mapped_column(ForeignKey('advertisements.id'))
    kind: Mapped[str] = mapped_column(String(30))
    mime_type: Mapped[str] = mapped_column(String(100))
    byte_size: Mapped[int] = mapped_column(Integer)
    sha256: Mapped[str] = mapped_column(String(64))
    storage_key: Mapped[str] = mapped_column(String(100))
    captured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    is_demo: Mapped[bool] = mapped_column(Boolean)


class Evidence(Base):
    __tablename__ = 'evidence'
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    property_id: Mapped[UUID] = mapped_column(ForeignKey('properties.id'))
    asset_id: Mapped[UUID] = mapped_column(ForeignKey('assets.id'))
    # Immutable provenance snapshot, validated through EvidenceCreate before writing.
    details: Mapped[dict] = mapped_column(JSON)


class LegalBasis(Base):
    __tablename__ = 'legal_bases'
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    property_id: Mapped[UUID] = mapped_column(ForeignKey('properties.id'))
    details: Mapped[dict] = mapped_column(JSON)


class RiskFactor(Base):
    __tablename__ = 'risk_factors'
    __table_args__ = (UniqueConstraint('property_id', 'code', name='uq_property_factor'),)
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    property_id: Mapped[UUID] = mapped_column(ForeignKey('properties.id'))
    code: Mapped[str] = mapped_column(String(2))
    status: Mapped[str] = mapped_column(String(20))
    as_of: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    evidence_ids: Mapped[list] = mapped_column(JSON)
    revision: Mapped[int] = mapped_column(Integer, default=1)
    reviewed_by: Mapped[UUID | None] = mapped_column(ForeignKey('users.id'))
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    reason: Mapped[str | None] = mapped_column(Text)


class AuditEvent(Base):
    __tablename__ = 'audit_events'
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    actor_id: Mapped[UUID] = mapped_column(ForeignKey('users.id'))
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    action: Mapped[str] = mapped_column(String(100))
    entity_type: Mapped[str] = mapped_column(String(50))
    entity_id: Mapped[UUID] = mapped_column(index=True)
    old_revision: Mapped[int | None] = mapped_column(Integer)
    new_revision: Mapped[int | None] = mapped_column(Integer)
    reason: Mapped[str | None] = mapped_column(Text)
    request_id: Mapped[UUID] = mapped_column(default=uuid4)
    details: Mapped[dict] = mapped_column(JSON, default=dict, server_default='{}')


class Command(Base):
    __tablename__ = 'commands'
    __table_args__ = (UniqueConstraint('actor_id', 'operation', 'key', name='uq_actor_command'),)
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    actor_id: Mapped[UUID] = mapped_column(ForeignKey('users.id'))
    operation: Mapped[str] = mapped_column(String(100))
    key: Mapped[UUID] = mapped_column()
    body_hash: Mapped[str] = mapped_column(String(64))
    response: Mapped[dict] = mapped_column(JSON)


class AnalysisJob(Base):
    __tablename__ = 'analysis_jobs'
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    advertisement_id: Mapped[UUID] = mapped_column(ForeignKey('advertisements.id'), index=True)
    advertisement_revision: Mapped[int] = mapped_column(Integer)
    kind: Mapped[str] = mapped_column(String(30), default='ANALYZE')
    state: Mapped[str] = mapped_column(String(20), default='QUEUED', index=True)
    stage: Mapped[str] = mapped_column(String(100), default='Ожидает обработки')
    attempt: Mapped[int] = mapped_column(Integer, default=0)
    lease_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    claim_token: Mapped[UUID | None] = mapped_column()
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    created_by: Mapped[UUID] = mapped_column(ForeignKey('users.id'))
    request_id: Mapped[UUID] = mapped_column()
    result_asset_id: Mapped[UUID | None] = mapped_column(ForeignKey('assets.id'))
    error: Mapped[dict | None] = mapped_column(JSON)


class ExtractionResult(Base):
    __tablename__ = 'extraction_results'
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    job_id: Mapped[UUID | None] = mapped_column(ForeignKey('analysis_jobs.id'), unique=True)
    advertisement_id: Mapped[UUID] = mapped_column(ForeignKey('advertisements.id'), index=True)
    source_asset_id: Mapped[UUID] = mapped_column(ForeignKey('assets.id'))
    parent_extraction_id: Mapped[UUID | None] = mapped_column(ForeignKey('extraction_results.id'))
    revision: Mapped[int] = mapped_column(Integer, default=1)
    pipeline_version: Mapped[str] = mapped_column(String(100))
    original_ocr_text: Mapped[str | None] = mapped_column(Text)
    analysis_text: Mapped[str] = mapped_column(Text)
    hypotheses: Mapped[list] = mapped_column(JSON)
    warnings: Mapped[list] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class PropertyMatch(Base):
    __tablename__ = 'property_matches'
    __table_args__ = (UniqueConstraint('extraction_id', 'property_id', name='uq_extraction_property_match'),)
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    advertisement_id: Mapped[UUID] = mapped_column(ForeignKey('advertisements.id'), index=True)
    property_id: Mapped[UUID] = mapped_column(ForeignKey('properties.id'))
    extraction_id: Mapped[UUID] = mapped_column(ForeignKey('extraction_results.id'))
    similarity: Mapped[float] = mapped_column(Float)
    reasons: Mapped[list] = mapped_column(JSON)
    status: Mapped[str] = mapped_column(String(20), default='PENDING')
    revision: Mapped[int] = mapped_column(Integer, default=1)
