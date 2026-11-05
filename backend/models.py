import uuid

from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, JSON
from datetime import datetime, timezone
from backend.database import Base


def _utc_now():
    return datetime.now(timezone.utc)


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    reference_code = Column(String(32), unique=True, index=True, nullable=False)
    retreat_id = Column(String(64), index=True, nullable=False)
    retreat_title = Column(String(255), nullable=True)
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), index=True, nullable=False)
    phone = Column(String(64), nullable=False)
    room_preference = Column(String(64), nullable=False)
    movement_experience = Column(String(64), nullable=False)
    passport_valid = Column(String(64), nullable=False, default="yes-valid-6mo")
    health_notes = Column(Text, nullable=True)
    intentions = Column(Text, nullable=True)
    status = Column(String(32), default="pending_review", nullable=False)
    created_at = Column(DateTime, default=_utc_now, nullable=False)
    updated_at = Column(DateTime, default=_utc_now, onupdate=_utc_now, nullable=False)


class NewsletterSubscriber(Base):
    __tablename__ = "newsletter_subscribers"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    source = Column(String(64), default="footer", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=_utc_now, nullable=False)


class FlightConciergeRequest(Base):
    __tablename__ = "flight_concierge_requests"

    id = Column(Integer, primary_key=True, index=True)
    booking_reference = Column(String(32), index=True, nullable=True)
    guest_name = Column(String(255), nullable=False)
    email = Column(String(255), index=True, nullable=False)
    phone = Column(String(64), nullable=False)
    retreat_id = Column(String(64), nullable=True)
    departure_airport = Column(String(64), nullable=False)
    cabin_class = Column(String(64), default="economy", nullable=False)
    preferred_airline = Column(String(128), nullable=True)
    travel_dates_flexible = Column(Boolean, default=True, nullable=False)
    special_requests = Column(Text, nullable=True)
    status = Column(String(32), default="inquiry_received", nullable=False)
    created_at = Column(DateTime, default=_utc_now, nullable=False)


class CustomGroupInquiry(Base):
    __tablename__ = "custom_group_inquiries"

    id = Column(Integer, primary_key=True, index=True)
    organizer_name = Column(String(255), nullable=False)
    email = Column(String(255), index=True, nullable=False)
    phone = Column(String(64), nullable=False)
    group_size = Column(Integer, nullable=False)
    target_destination = Column(String(128), nullable=False)
    target_dates = Column(String(128), nullable=True)
    somatic_goals = Column(Text, nullable=True)
    status = Column(String(32), default="inquiry_received", nullable=False)
    created_at = Column(DateTime, default=_utc_now, nullable=False)

class ActionDraft(Base):
    __tablename__ = 'action_drafts'

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String(64), nullable=False)  # e.g. whatsapp_concierge, packing_dossier
    guest_name = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    status = Column(String(32), default='pending_review', index=True, nullable=False)
    scheduled_for = Column(DateTime, nullable=True)
    recipient_email = Column(String(128), nullable=True)
    recipient_phone = Column(String(32), nullable=True)
    provider_message_id = Column(String(128), nullable=True)
    dispatched_at = Column(DateTime, nullable=True)
    dispatched_by = Column(String(64), nullable=True)
    dispatch_error = Column(Text, nullable=True)
    target_entity_type = Column(String(64), nullable=True)
    target_entity_id = Column(String(64), nullable=True)
    target_entity_version_hash = Column(String(64), nullable=True)
    staged_patch_json = Column(Text, nullable=True)
    reviewed_by_operator_id = Column(String(36), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=_utc_now, nullable=False)


class SanctuaryCohort(Base):
    """
    Database-backed cohort inventory and dynamic spot availability.
    Replaces static duplicated catalog in code.
    """
    __tablename__ = "sanctuary_cohorts"

    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String(64), unique=True, index=True, nullable=False)
    title = Column(String(255), nullable=False)
    destination = Column(String(128), nullable=False)
    country = Column(String(64), nullable=False)
    dates = Column(String(128), nullable=False)
    year = Column(Integer, default=2027, nullable=False)
    season = Column(String(32), default="Winter", nullable=False)
    duration = Column(String(64), default="7 Days / 6 Nights", nullable=False)
    capacity_limit = Column(Integer, default=14, nullable=False)
    spots_remaining = Column(Integer, default=4, nullable=False)
    investment_starting = Column(String(32), default="$3,850", nullable=False)
    tagline = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    hero_image = Column(String(512), nullable=True)
    status = Column(String(32), default="OPEN", index=True, nullable=False)
    created_at = Column(DateTime, default=_utc_now, nullable=False)
    updated_at = Column(DateTime, default=_utc_now, onupdate=_utc_now, nullable=False)


class ClinicalAuditLog(Base):
    """
    Immutable HIPAA/GDPR clinical data access and modification audit trail.
    Tracks every access, export, or edit of guest clinical intake profiles.
    """
    __tablename__ = "clinical_audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    operator_name = Column(String(128), nullable=False)
    guest_name = Column(String(128), nullable=False)
    intake_id = Column(String(64), nullable=True, index=True)
    action_type = Column(String(64), nullable=False)  # VIEW_DOSSIER, EDIT_CLINICAL_FLAGS, EXPORT_WAIVER, COMMIT_CRM
    details = Column(Text, nullable=True)
    ip_address = Column(String(64), nullable=True)
    accessed_at = Column(DateTime, default=_utc_now, nullable=False)


def _uuid_str():
    return str(uuid.uuid4())


class OperatorUser(Base):
    """Portal operator. Every operator has full administrator access."""
    __tablename__ = "operator_users"

    id = Column(String(36), primary_key=True, default=_uuid_str)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(32), default="ADMIN", nullable=False)
    token_version = Column(Integer, default=1, nullable=False)  # bump to end all of an operator's sessions
    is_active = Column(Boolean, default=True, nullable=False)
    failed_login_count = Column(Integer, default=0, nullable=False)
    locked_until = Column(DateTime, nullable=True)
    last_login_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=_utc_now, nullable=False)


class PasswordResetToken(Base):
    """Single-use link for setting a staff password. Stores only the token digest."""
    __tablename__ = "password_reset_tokens"

    id = Column(String(36), primary_key=True, default=_uuid_str)
    user_id = Column(String(36), index=True, nullable=False)
    token_sha256 = Column(String(64), unique=True, index=True, nullable=False)
    purpose = Column(String(16), default="reset", nullable=False)  # "reset" or "invite"
    expires_at = Column(DateTime, nullable=False)
    used_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=_utc_now, nullable=False)


class PortalSession(Base):
    """Revocable operator session; one row is one refresh-token family. Stores only token digests."""
    __tablename__ = "portal_sessions"

    session_id = Column(String(36), primary_key=True, default=_uuid_str)
    user_id = Column(String(36), index=True, nullable=False)
    role = Column(String(32), default="ADMIN", nullable=False)
    token_version = Column(Integer, nullable=False)
    refresh_token_sha256 = Column(String(64), unique=True, index=True, nullable=False)
    ip_address = Column(String(64), nullable=True)
    user_agent = Column(String(255), nullable=True)
    expires_at = Column(DateTime, nullable=False)
    revoked_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=_utc_now, nullable=False)


class PortalRefreshRotation(Base):
    """Digests of refresh tokens already exchanged; seeing one again is proof of token theft."""
    __tablename__ = "portal_refresh_rotations"

    token_sha256 = Column(String(64), primary_key=True)
    session_id = Column(String(36), index=True, nullable=False)
    rotated_at = Column(DateTime, default=_utc_now, nullable=False)


class AuthAttempt(Base):
    """Failed or rate-limited auth attempts, kept in the database so limits hold across serverless instances."""
    __tablename__ = "auth_attempts"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(320), index=True, nullable=False)
    created_at = Column(DateTime, default=_utc_now, index=True, nullable=False)


class GuestOtpChallenge(Base):
    """One-time guest access code, stored only as a keyed digest."""
    __tablename__ = "guest_otp_challenges"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), index=True, nullable=False)
    booking_reference = Column(String(64), index=True, nullable=False)
    otp_digest = Column(String(64), nullable=False)
    attempts = Column(Integer, default=0, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    consumed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=_utc_now, nullable=False)


class AuditEvent(Base):
    """Who did what: authenticated operator attribution for approvals, rejections and clinical overrides."""
    __tablename__ = "audit_events"

    id = Column(Integer, primary_key=True, index=True)
    operator_id = Column(String(36), index=True, nullable=False)
    operator_email = Column(String(255), nullable=False)
    action = Column(String(64), index=True, nullable=False)
    entity_type = Column(String(64), nullable=False)
    entity_id = Column(String(64), index=True, nullable=False)
    details = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime, default=_utc_now, nullable=False)
