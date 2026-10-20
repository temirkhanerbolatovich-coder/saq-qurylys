from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlalchemy import (
    JSON,
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    LargeBinary,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class MonitoringDictionaryVersion(Base):
    __tablename__ = 'monitoring_dictionary_versions'
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    dictionary_version: Mapped[str] = mapped_column(String(30))
    content_sha256: Mapped[str] = mapped_column(String(64), unique=True)
    source: Mapped[str] = mapped_column(String(200))
    raw: Mapped[bytes] = mapped_column(LargeBinary)
    original_raw: Mapped[bytes] = mapped_column(LargeBinary)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    created_by: Mapped[UUID] = mapped_column(ForeignKey('users.id'))


class MonitoringDictionaryActivation(Base):
    __tablename__ = 'monitoring_dictionary_activations'
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    revision: Mapped[int] = mapped_column(Integer, unique=True)
    dictionary_id: Mapped[UUID | None] = mapped_column(ForeignKey('monitoring_dictionary_versions.id'))
    reason: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    created_by: Mapped[UUID] = mapped_column(ForeignKey('users.id'))


class MonitoringQueryProfile(Base):
    __tablename__ = 'monitoring_query_profiles'
    dictionary_version: Mapped[str] = mapped_column(String(10), default='1.0', server_default='1.0')
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(String(100))
    revision: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    created_by: Mapped[UUID] = mapped_column(ForeignKey('users.id'))


class MonitoringQueryProfileVersion(Base):
    __tablename__ = 'monitoring_query_profile_versions'
    dictionary_id: Mapped[UUID | None] = mapped_column(ForeignKey('monitoring_dictionary_versions.id'))
    compiled_preview: Mapped[dict | None] = mapped_column(JSON(none_as_null=True))
    __table_args__ = (UniqueConstraint('profile_id', 'revision', name='uq_query_profile_revision'),)
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    profile_id: Mapped[UUID] = mapped_column(ForeignKey('monitoring_query_profiles.id'), index=True)
    revision: Mapped[int] = mapped_column(Integer)
    name: Mapped[str] = mapped_column(String(100))
    parameters: Mapped[dict] = mapped_column(JSON)
    compiled_queries: Mapped[list] = mapped_column(JSON)
    dictionary_sha256: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    created_by: Mapped[UUID] = mapped_column(ForeignKey('users.id'))


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
    source_details: Mapped[dict | None] = mapped_column(JSON)


class MonitoringRun(Base):
    __tablename__ = 'monitoring_runs'
    __table_args__ = (UniqueConstraint('created_by', 'command_key', name='uq_monitoring_run_command'),)
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    source_code: Mapped[str] = mapped_column(String(40), index=True)
    created_by: Mapped[UUID] = mapped_column(ForeignKey('users.id'))
    command_key: Mapped[UUID] = mapped_column()
    body_hash: Mapped[str] = mapped_column(String(64))
    query: Mapped[dict] = mapped_column(JSON)
    state: Mapped[str] = mapped_column(String(25), default='RUNNING')
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
    deadline_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    error_code: Mapped[str | None] = mapped_column(String(60))
    http_status: Mapped[int | None] = mapped_column(Integer)
    result: Mapped[dict | None] = mapped_column(JSON)


class MonitoringFinding(Base):
    __tablename__ = 'monitoring_findings'
    __table_args__ = (UniqueConstraint('platform', 'external_id', 'is_demo', name='uq_monitoring_finding_identity'),)
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    platform: Mapped[str] = mapped_column(String(30))
    external_id: Mapped[str] = mapped_column(String(100))
    is_demo: Mapped[bool] = mapped_column(Boolean)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class MonitoringFindingVersion(Base):
    __tablename__ = 'monitoring_finding_versions'
    __table_args__ = (UniqueConstraint('finding_id', 'version', name='uq_monitoring_finding_version'),)
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    finding_id: Mapped[UUID] = mapped_column(ForeignKey('monitoring_findings.id'), index=True)
    version: Mapped[int] = mapped_column(Integer)
    content_sha256: Mapped[str] = mapped_column(String(64))
    dictionary_id: Mapped[UUID] = mapped_column(ForeignKey('monitoring_dictionary_versions.id'))
    dictionary_sha256: Mapped[str] = mapped_column(String(64))
    rules_version: Mapped[str] = mapped_column(String(50))
    source_url: Mapped[str] = mapped_column(String(2048))
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    captured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    text: Mapped[str | None] = mapped_column(Text)
    media_type: Mapped[str] = mapped_column(String(40))
    priority: Mapped[str] = mapped_column(String(30), index=True)
    context: Mapped[dict] = mapped_column(JSON)
    created_by: Mapped[UUID] = mapped_column(ForeignKey('users.id'))


class MonitoringFindingObservation(Base):
    __tablename__ = 'monitoring_finding_observations'
    __table_args__ = (UniqueConstraint('run_id', 'finding_id', name='uq_monitoring_finding_run'),)
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    finding_id: Mapped[UUID] = mapped_column(ForeignKey('monitoring_findings.id'), index=True)
    version_id: Mapped[UUID] = mapped_column(ForeignKey('monitoring_finding_versions.id'), index=True)
    run_id: Mapped[UUID] = mapped_column(ForeignKey('monitoring_runs.id'), index=True)
    profile_version_id: Mapped[UUID] = mapped_column(ForeignKey('monitoring_query_profile_versions.id'))
    query_id: Mapped[str] = mapped_column(String(64))
    captured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    raw_response_sha256: Mapped[str] = mapped_column(String(64))
    has_more: Mapped[bool] = mapped_column(Boolean)


class MonitoringFindingImport(Base):
    __tablename__ = 'monitoring_finding_imports'
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    version_id: Mapped[UUID] = mapped_column(ForeignKey('monitoring_finding_versions.id'), unique=True)
    observation_id: Mapped[UUID] = mapped_column(ForeignKey('monitoring_finding_observations.id'))
    advertisement_id: Mapped[UUID] = mapped_column(ForeignKey('advertisements.id'), unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    created_by: Mapped[UUID] = mapped_column(ForeignKey('users.id'))
    reason: Mapped[str] = mapped_column(Text)


class CsvImportBatch(Base):
    __tablename__ = 'csv_import_batches'
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    batch_key: Mapped[str] = mapped_column(String(64), unique=True)
    filename: Mapped[str] = mapped_column(String(200))
    file_sha256: Mapped[str] = mapped_column(String(64))
    format: Mapped[str] = mapped_column(String(30))
    is_demo: Mapped[bool] = mapped_column(Boolean)
    original_asset_id: Mapped[UUID] = mapped_column(ForeignKey('assets.id'))
    created_by: Mapped[UUID] = mapped_column(ForeignKey('users.id'))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
    row_count: Mapped[int] = mapped_column(Integer)
    created_count: Mapped[int] = mapped_column(Integer)
    duplicate_count: Mapped[int] = mapped_column(Integer)
    entries: Mapped[list] = mapped_column(JSON)


class CsvImportedMaterial(Base):
    __tablename__ = 'csv_imported_materials'
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    fingerprint: Mapped[str] = mapped_column(String(64), unique=True)
    identity_key: Mapped[str] = mapped_column(String(64), index=True)
    advertisement_id: Mapped[UUID] = mapped_column(ForeignKey('advertisements.id'))
    batch_id: Mapped[UUID] = mapped_column(ForeignKey('csv_import_batches.id'))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


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

    @property
    def revision(self) -> int:
        return self.details['revision']


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


class TelegramNotification(Base):
    __tablename__ = 'telegram_notifications'
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    deduplication_key: Mapped[str] = mapped_column(String(150), unique=True)
    property_id: Mapped[UUID] = mapped_column(ForeignKey('properties.id'), index=True)
    factor_id: Mapped[UUID] = mapped_column(ForeignKey('risk_factors.id'))
    factor_revision: Mapped[int] = mapped_column(Integer)
    bot_id: Mapped[str] = mapped_column(String(20))
    chat_id: Mapped[str] = mapped_column(String(20))
    text: Mapped[str] = mapped_column(Text)
    state: Mapped[str] = mapped_column(String(20), default='QUEUED', index=True)
    attempt: Mapped[int] = mapped_column(Integer, default=0)
    next_attempt_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    lease_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    claim_token: Mapped[UUID | None] = mapped_column()
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    message_id: Mapped[int | None] = mapped_column(BigInteger)
    error_code: Mapped[str | None] = mapped_column(String(60))


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
    advertisement_id: Mapped[UUID | None] = mapped_column(ForeignKey('advertisements.id'), index=True)
    advertisement_revision: Mapped[int | None] = mapped_column(Integer)
    signal_id: Mapped[UUID | None] = mapped_column(ForeignKey('signals.id'), index=True)
    target_revision: Mapped[int | None] = mapped_column(Integer)
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
    input_payload: Mapped[dict | None] = mapped_column(JSON)


class UrlSchedule(Base):
    __tablename__ = 'url_schedules'
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    url: Mapped[str] = mapped_column(String(2048), unique=True)
    source_id: Mapped[str] = mapped_column(String(100))
    name: Mapped[str] = mapped_column(String(100))
    interval_minutes: Mapped[int] = mapped_column(Integer)
    enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    revision: Mapped[int] = mapped_column(Integer, default=1)
    next_run_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    failure_count: Mapped[int] = mapped_column(Integer, default=0)
    pause_reason: Mapped[str | None] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    created_by: Mapped[UUID] = mapped_column(ForeignKey('users.id'))
    updated_by: Mapped[UUID] = mapped_column(ForeignKey('users.id'))


class UrlScheduleRun(Base):
    __tablename__ = 'url_schedule_runs'
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    schedule_id: Mapped[UUID] = mapped_column(ForeignKey('url_schedules.id'), index=True)
    configuration: Mapped[dict] = mapped_column(JSON)
    due_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    state: Mapped[str] = mapped_column(String(20), index=True)
    reason: Mapped[str | None] = mapped_column(String(100))
    job_id: Mapped[UUID | None] = mapped_column(ForeignKey('analysis_jobs.id'))
    reused_job: Mapped[bool] = mapped_column(Boolean, default=False)


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


class Signal(Base):
    __tablename__ = 'signals'
    __table_args__ = (
        UniqueConstraint('property_id', 'version', name='uq_property_signal_version'),
        UniqueConstraint('previous_signal_id', name='uq_signal_previous'),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    property_id: Mapped[UUID] = mapped_column(ForeignKey('properties.id'), index=True)
    previous_signal_id: Mapped[UUID | None] = mapped_column(ForeignKey('signals.id'))
    version: Mapped[int] = mapped_column(Integer, default=1)
    revision: Mapped[int] = mapped_column(Integer, default=1)
    state: Mapped[str] = mapped_column(String(20), default='DRAFT')
    # Snapshots are assigned once. Decisions append through a separate JSON column.
    snapshot: Mapped[dict] = mapped_column(JSON)
    decisions: Mapped[list] = mapped_column(JSON, default=list)
    created_by: Mapped[UUID] = mapped_column(ForeignKey('users.id'))
    created_by_details: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    pdf_state: Mapped[str] = mapped_column(String(20), default='NOT_REQUESTED')
    pdf_asset_id: Mapped[UUID | None] = mapped_column(ForeignKey('assets.id'))
    pdf_job_id: Mapped[UUID | None] = mapped_column()


class MonitoringCandidate(Base):
    __tablename__ = 'monitoring_candidates'
    __table_args__ = (
        CheckConstraint(
            '(property_id IS NULL AND property_link_kind IS NULL) OR '
            "(property_id IS NOT NULL AND property_link_kind IS NOT NULL AND property_link_kind IN ('CREATED', 'LINKED'))",
            name='ck_candidate_property_link',
        ),
        Index(
            'uq_candidate_property_created',
            'property_id',
            unique=True,
            postgresql_where=text("property_link_kind = 'CREATED'"),
        ),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    identity_key: Mapped[str] = mapped_column(String(64), unique=True)
    property_id: Mapped[UUID | None] = mapped_column(ForeignKey('properties.id'), index=True)
    property_link_kind: Mapped[str | None] = mapped_column(String(20))
    name: Mapped[str] = mapped_column(String(300))
    city: Mapped[str] = mapped_column(String(100))
    address: Mapped[str | None] = mapped_column(String(300))
    phase: Mapped[str | None] = mapped_column(String(100))
    is_demo: Mapped[bool] = mapped_column(Boolean)
    revision: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
    created_by: Mapped[UUID] = mapped_column(ForeignKey('users.id'))


class MonitoringObservation(Base):
    __tablename__ = 'monitoring_observations'
    __table_args__ = (UniqueConstraint('candidate_id', 'advertisement_id', name='uq_monitoring_observation'),)
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    candidate_id: Mapped[UUID] = mapped_column(ForeignKey('monitoring_candidates.id'), index=True)
    advertisement_id: Mapped[UUID] = mapped_column(ForeignKey('advertisements.id'))
    advertisement_revision: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    created_by: Mapped[UUID] = mapped_column(ForeignKey('users.id'))
    reason: Mapped[str] = mapped_column(Text)


class MonitoringRegistrySnapshot(Base):
    __tablename__ = 'monitoring_registry_snapshots'
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    label: Mapped[str] = mapped_column(String(300))
    city: Mapped[str] = mapped_column(String(100))
    is_demo: Mapped[bool] = mapped_column(Boolean)
    coverage_from: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    coverage_until: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    complete: Mapped[bool] = mapped_column(Boolean)
    entries: Mapped[list] = mapped_column(JSON)
    sha256: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
    created_by: Mapped[UUID] = mapped_column(ForeignKey('users.id'))

    @property
    def revision(self) -> int:
        return 1


class MonitoringComparison(Base):
    __tablename__ = 'monitoring_comparisons'
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    deduplication_key: Mapped[str] = mapped_column(String(64), unique=True)
    candidate_id: Mapped[UUID] = mapped_column(ForeignKey('monitoring_candidates.id'), index=True)
    advertisement_id: Mapped[UUID] = mapped_column(ForeignKey('advertisements.id'))
    candidate_revision: Mapped[int] = mapped_column(Integer)
    advertisement_revision: Mapped[int] = mapped_column(Integer)
    snapshot_id: Mapped[UUID | None] = mapped_column(ForeignKey('monitoring_registry_snapshots.id'))
    result: Mapped[str] = mapped_column(String(60))
    explanation: Mapped[str] = mapped_column(Text)
    matched_entries: Mapped[list] = mapped_column(JSON)
    identity_snapshot: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
    created_by: Mapped[UUID] = mapped_column(ForeignKey('users.id'))
    algorithm_version: Mapped[str] = mapped_column(String(100))

    @property
    def revision(self) -> int:
        return 1


class MonitoringIncident(Base):
    __tablename__ = 'monitoring_incidents'
    __table_args__ = (
        Index(
            'uq_monitoring_active_incident',
            'candidate_id',
            'rule_code',
            unique=True,
            postgresql_where=text("state <> 'CLOSED'"),
        ),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    candidate_id: Mapped[UUID] = mapped_column(ForeignKey('monitoring_candidates.id'), index=True)
    candidate_name: Mapped[str] = mapped_column(String(300))
    is_demo: Mapped[bool] = mapped_column(Boolean)
    rule_code: Mapped[str] = mapped_column(String(60))
    state: Mapped[str] = mapped_column(String(20), default='OPEN')
    revision: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    close_reason: Mapped[str | None] = mapped_column(String(30))
    latest_comparison_id: Mapped[UUID] = mapped_column(ForeignKey('monitoring_comparisons.id'))
    history: Mapped[list] = mapped_column(JSON)


class MonitoringIncidentComparison(Base):
    __tablename__ = 'monitoring_incident_comparisons'
    __table_args__ = (UniqueConstraint('comparison_id', name='uq_monitoring_incident_comparison'),)
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    incident_id: Mapped[UUID] = mapped_column(ForeignKey('monitoring_incidents.id'), index=True)
    comparison_id: Mapped[UUID] = mapped_column(ForeignKey('monitoring_comparisons.id'))
