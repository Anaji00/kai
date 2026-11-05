"""
First-party authentication primitives: Argon2id password hashing, short-lived signed JWTs backed by
revocable server-side sessions, rotating refresh tokens with replay detection, signed double-submit
CSRF tokens, guest one-time codes, attempt throttling and the audit trail.

Raw refresh tokens and one-time codes are never stored; only their digests are.
"""
import hashlib
import hmac
import logging
import secrets
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.config import settings
from backend.models import (
    AuditEvent,
    AuthAttempt,
    GuestOtpChallenge,
    OperatorUser,
    PortalRefreshRotation,
    PortalSession,
)

logger = logging.getLogger("kai_auth")

ROLE_ADMIN = "ADMIN"
ROLE_GUEST = "SANCTUARY_GUEST"

ACCESS_COOKIE = "kai_access_token"
REFRESH_COOKIE = "kai_refresh_token"
CSRF_COOKIE = "kai_csrf_token"
# Separate from the operator cookie: one browser can hold both sessions, and each token is bound to its own.
GUEST_CSRF_COOKIE = "kai_guest_csrf_token"
GUEST_COOKIE = "kai_guest_session"
CSRF_HEADER = "X-KAI-CSRF-Token"

ADMIN_PERMISSIONS = ["*"]

MAX_FAILED_LOGINS = 5
ACCOUNT_LOCK_MINUTES = 15
MAX_LOGINS_PER_IP = 20
ATTEMPT_WINDOW_MINUTES = 15
MAX_OTP_ATTEMPTS = 5

_hasher = PasswordHasher()  # Argon2id with the library's current recommended parameters
_dummy_hash: Optional[str] = None


class AuthError(Exception):
    """Invalid, expired or revoked credentials."""


class RefreshReplayError(AuthError):
    """A rotated refresh token was presented again; the whole session family has been revoked."""


@dataclass
class IssuedTokens:
    session: PortalSession
    access_token: str
    refresh_token: str
    csrf_token: str


@dataclass
class AdminPrincipal:
    id: str
    email: str
    full_name: str
    role: str = ROLE_ADMIN
    session_id: Optional[str] = None
    permissions: List[str] = field(default_factory=lambda: list(ADMIN_PERMISSIONS))


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def as_utc(value: datetime) -> datetime:
    """SQLite returns naive datetimes; every timestamp here is written in UTC."""
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


def normalize_email(email: str) -> str:
    return (email or "").strip().lower()


def sha256_hex(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


# ---------------------------------------------------------------- passwords

def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return _hasher.verify(password_hash, password)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


def password_needs_rehash(password_hash: str) -> bool:
    return _hasher.check_needs_rehash(password_hash)


def burn_password_check(password: str) -> None:
    """Spends the same time as a real check, so unknown emails aren't distinguishable by timing."""
    global _dummy_hash
    if _dummy_hash is None:
        _dummy_hash = _hasher.hash(secrets.token_urlsafe(16))
    verify_password(password, _dummy_hash)


# ---------------------------------------------------------------- tokens

def _encode(claims: Dict[str, Any]) -> str:
    return jwt.encode(claims, settings.AUTH_SECRET_KEY, algorithm=settings.AUTH_ALGORITHM)


def decode_token(token: str, expected_type: str) -> Dict[str, Any]:
    """Validates signature and expiry and requires the standard claims. Raises AuthError."""
    try:
        claims = jwt.decode(
            token,
            settings.AUTH_SECRET_KEY,
            algorithms=[settings.AUTH_ALGORITHM],
            options={"require": ["exp", "iat", "jti", "sub"]},
        )
    except jwt.PyJWTError as exc:
        raise AuthError("Invalid or expired token.") from exc
    if claims.get("typ") != expected_type:
        raise AuthError("Wrong token type.")
    return claims


def create_access_token(user: OperatorUser, session: PortalSession) -> str:
    now = utc_now()
    expires = min(now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES), as_utc(session.expires_at))
    return _encode({
        "typ": "access",
        "jti": uuid.uuid4().hex,
        "sub": user.id,
        "sid": session.session_id,
        "ver": session.token_version,
        "role": session.role,
        "scp": ["*"],
        "iat": now,
        "exp": expires,
    })


def create_guest_token(
    guest_id: str, email: str, session_id: str, cohort_ids: List[str], expires_at: datetime
) -> str:
    return _encode({
        "typ": "guest",
        "jti": uuid.uuid4().hex,
        "sub": guest_id,
        "sid": session_id,
        "email": email,
        "role": ROLE_GUEST,
        "scp": cohort_ids,
        "iat": utc_now(),
        "exp": as_utc(expires_at),
    })


# ---------------------------------------------------------------- CSRF (signed double-submit)

def _csrf_signature(nonce: str, session_id: str) -> str:
    message = f"csrf:{session_id}:{nonce}".encode("utf-8")
    return hmac.new(settings.AUTH_SECRET_KEY.encode("utf-8"), message, hashlib.sha256).hexdigest()


def generate_csrf_token(session_id: str) -> str:
    """Bound to the session by HMAC, so a cookie planted from a sibling origin can't be used."""
    nonce = secrets.token_urlsafe(24)
    return f"{nonce}.{_csrf_signature(nonce, session_id)}"


def csrf_tokens_valid(header_value: Optional[str], cookie_value: Optional[str], session_id: str) -> bool:
    if not header_value or not cookie_value or not hmac.compare_digest(header_value, cookie_value):
        return False
    nonce, _, signature = cookie_value.partition(".")
    return bool(signature) and hmac.compare_digest(signature, _csrf_signature(nonce, session_id))


# ---------------------------------------------------------------- operator sessions

def create_operator_session(
    db: Session, user: OperatorUser, ip_address: Optional[str], user_agent: Optional[str]
) -> IssuedTokens:
    refresh_token = secrets.token_urlsafe(48)
    session = PortalSession(
        session_id=str(uuid.uuid4()),
        user_id=user.id,
        role=ROLE_ADMIN,
        token_version=user.token_version,
        refresh_token_sha256=sha256_hex(refresh_token),
        ip_address=ip_address,
        user_agent=(user_agent or "")[:255],
        expires_at=utc_now() + timedelta(days=settings.REFRESH_SESSION_EXPIRE_DAYS),
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return IssuedTokens(
        session=session,
        access_token=create_access_token(user, session),
        refresh_token=refresh_token,
        csrf_token=generate_csrf_token(session.session_id),
    )


def find_session_by_refresh_token(db: Session, refresh_token: str) -> Optional[PortalSession]:
    return db.query(PortalSession).filter(PortalSession.refresh_token_sha256 == sha256_hex(refresh_token)).first()


def session_is_active(session: Optional[PortalSession]) -> bool:
    return bool(session) and session.revoked_at is None and as_utc(session.expires_at) > utc_now()


def revoke_session(db: Session, session: PortalSession) -> None:
    if session.revoked_at is None:
        session.revoked_at = utc_now()
        db.commit()


def rotate_refresh_token(
    db: Session, refresh_token: str, ip_address: Optional[str], user_agent: Optional[str]
) -> IssuedTokens:
    """
    Exchanges a refresh token for a new one in the same session family. Presenting a token that was
    already rotated means two parties hold it, so the family is revoked and everyone must sign in again.
    """
    digest = sha256_hex(refresh_token)
    rotated = db.query(PortalRefreshRotation).filter(PortalRefreshRotation.token_sha256 == digest).first()
    if rotated:
        session = db.query(PortalSession).filter(PortalSession.session_id == rotated.session_id).first()
        if session:
            revoke_session(db, session)
        logger.warning(f"Refresh token replay detected; revoked session {rotated.session_id}")
        raise RefreshReplayError("Refresh token reuse detected. Please sign in again.")

    session = db.query(PortalSession).filter(PortalSession.refresh_token_sha256 == digest).first()
    if not session_is_active(session):
        raise AuthError("Session expired. Please sign in again.")

    user = db.query(OperatorUser).filter(OperatorUser.id == session.user_id).first()
    if not user or not user.is_active or user.token_version != session.token_version:
        revoke_session(db, session)
        raise AuthError("Session is no longer valid. Please sign in again.")

    new_refresh_token = secrets.token_urlsafe(48)
    db.add(PortalRefreshRotation(token_sha256=digest, session_id=session.session_id))
    session.refresh_token_sha256 = sha256_hex(new_refresh_token)
    session.ip_address = ip_address
    session.user_agent = (user_agent or "")[:255]
    try:
        db.commit()
    except IntegrityError:
        # Another request rotated this same token at the same moment: two holders, same as a replay.
        db.rollback()
        revoke_session(db, session)
        raise RefreshReplayError("Refresh token reuse detected. Please sign in again.")
    db.refresh(session)
    return IssuedTokens(
        session=session,
        access_token=create_access_token(user, session),
        refresh_token=new_refresh_token,
        csrf_token=generate_csrf_token(session.session_id),
    )


def principal_for(user: OperatorUser, session_id: Optional[str] = None) -> AdminPrincipal:
    return AdminPrincipal(id=user.id, email=user.email, full_name=user.full_name, session_id=session_id)


# ---------------------------------------------------------------- operators

def create_operator(db: Session, email: str, password: str, full_name: str) -> OperatorUser:
    user = OperatorUser(
        email=normalize_email(email),
        full_name=full_name,
        password_hash=hash_password(password),
        role=ROLE_ADMIN,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def ensure_bootstrap_operator(db: Session) -> Optional[OperatorUser]:
    """Creates the first admin from ADMIN_EMAIL / ADMIN_PASSWORD when no operator exists yet."""
    if db.query(OperatorUser).first() or not settings.ADMIN_PASSWORD:
        return None
    logger.info(f"Creating bootstrap operator {settings.ADMIN_EMAIL}")
    return create_operator(db, settings.ADMIN_EMAIL, settings.ADMIN_PASSWORD, settings.ADMIN_FULL_NAME)


# ---------------------------------------------------------------- throttling

def attempts_exceeded(db: Session, key: str, limit: int, window_minutes: int = ATTEMPT_WINDOW_MINUTES) -> bool:
    cutoff = utc_now() - timedelta(minutes=window_minutes)
    return db.query(AuthAttempt).filter(AuthAttempt.key == key, AuthAttempt.created_at >= cutoff).count() >= limit


def record_attempt(db: Session, key: str) -> None:
    # Old rows have no further use, so the table stays small however long an attack runs.
    db.query(AuthAttempt).filter(AuthAttempt.created_at < utc_now() - timedelta(days=1)).delete(synchronize_session=False)
    db.add(AuthAttempt(key=key))
    db.commit()


def clear_attempts(db: Session, key: str) -> None:
    db.query(AuthAttempt).filter(AuthAttempt.key == key).delete()
    db.commit()


def account_is_locked(user: OperatorUser) -> bool:
    return bool(user.locked_until) and as_utc(user.locked_until) > utc_now()


def register_failed_login(db: Session, user: OperatorUser) -> None:
    user.failed_login_count = (user.failed_login_count or 0) + 1
    if user.failed_login_count >= MAX_FAILED_LOGINS:
        user.locked_until = utc_now() + timedelta(minutes=ACCOUNT_LOCK_MINUTES)
        user.failed_login_count = 0
        logger.warning(f"Operator account locked after repeated failures: {user.email}")
    db.commit()


def register_successful_login(db: Session, user: OperatorUser, password: Optional[str] = None) -> None:
    user.failed_login_count = 0
    user.locked_until = None
    user.last_login_at = utc_now()
    if password and password_needs_rehash(user.password_hash):
        user.password_hash = hash_password(password)
    db.commit()


# ---------------------------------------------------------------- guest one-time codes

def _otp_digest(email: str, booking_reference: str, code: str) -> str:
    message = f"otp:{email}:{booking_reference}:{code}".encode("utf-8")
    return hmac.new(settings.AUTH_SECRET_KEY.encode("utf-8"), message, hashlib.sha256).hexdigest()


def issue_guest_otp(db: Session, email: str, booking_reference: str) -> str:
    """Creates a 6-digit code, replacing any earlier unused code for this guest. Returns the raw code."""
    email = normalize_email(email)
    reference = booking_reference.strip().upper()
    code = f"{secrets.randbelow(1_000_000):06d}"
    db.query(GuestOtpChallenge).filter(
        GuestOtpChallenge.email == email,
        GuestOtpChallenge.booking_reference == reference,
        GuestOtpChallenge.consumed_at.is_(None),
    ).update({"consumed_at": utc_now()})
    db.add(GuestOtpChallenge(
        email=email,
        booking_reference=reference,
        otp_digest=_otp_digest(email, reference, code),
        expires_at=utc_now() + timedelta(minutes=settings.GUEST_MAGIC_LINK_EXPIRE_MINUTES),
    ))
    db.commit()
    return code


def verify_guest_otp(db: Session, email: str, booking_reference: str, code: str) -> bool:
    """Single use, time limited, and burned after MAX_OTP_ATTEMPTS wrong guesses."""
    email = normalize_email(email)
    reference = booking_reference.strip().upper()
    challenge = (
        db.query(GuestOtpChallenge)
        .filter(
            GuestOtpChallenge.email == email,
            GuestOtpChallenge.booking_reference == reference,
            GuestOtpChallenge.consumed_at.is_(None),
        )
        .order_by(GuestOtpChallenge.created_at.desc())
        .first()
    )
    if not challenge or as_utc(challenge.expires_at) <= utc_now():
        return False
    if hmac.compare_digest(challenge.otp_digest, _otp_digest(email, reference, code.strip())):
        challenge.consumed_at = utc_now()
        db.commit()
        return True
    challenge.attempts = (challenge.attempts or 0) + 1
    if challenge.attempts >= MAX_OTP_ATTEMPTS:
        challenge.consumed_at = utc_now()
    db.commit()
    return False


def send_guest_otp_email(email: str, code: str) -> bool:
    """Sends the code through SMTP or Resend. The code is only logged outside production."""
    subject = "Your KAI Wellness Retreats access code"
    minutes = settings.GUEST_MAGIC_LINK_EXPIRE_MINUTES
    html_body = (
        '<div style="font-family: Georgia, serif; color: #2D3E35; padding: 24px;">'
        "<p>Your access code for the KAI guest companion is:</p>"
        f'<p style="font-size: 28px; letter-spacing: 6px;"><strong>{code}</strong></p>'
        f"<p>It expires in {minutes} minutes. If you did not request it, you can ignore this email.</p>"
        "</div>"
    )
    from backend.services.email_service import _send_smtp_email

    if settings.SMTP_HOST and _send_smtp_email([email], subject, html_body, display_name="KAI Concierge Desk"):
        return True
    if settings.RESEND_API_KEY:
        import httpx
        try:
            response = httpx.post(
                "https://api.resend.com/emails",
                json={"from": settings.RESEND_CONCIERGE_FROM_EMAIL, "to": [email], "subject": subject, "html": html_body},
                headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}"},
                timeout=10.0,
            )
            if response.status_code in (200, 201):
                return True
            logger.error(f"Guest access code delivery failed (HTTP {response.status_code})")
        except httpx.HTTPError as exc:
            logger.error(f"Guest access code delivery failed: {exc}")
        return False
    if settings.ENVIRONMENT != "production":
        logger.info(f"[Development] Guest access code for {email}: {code}")
        return True
    logger.error("No email transport configured; guest access code was not delivered.")
    return False


# ---------------------------------------------------------------- audit trail

def record_audit(
    db: Session,
    operator: AdminPrincipal,
    action: str,
    entity_type: str,
    entity_id: Any,
    details: Optional[Dict[str, Any]] = None,
    commit: bool = True,
) -> None:
    db.add(AuditEvent(
        operator_id=operator.id,
        operator_email=operator.email,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id),
        details=details or {},
    ))
    if commit:
        db.commit()
