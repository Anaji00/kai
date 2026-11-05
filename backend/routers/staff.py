"""Staff accounts: self-service password reset, invitations, and activating or deactivating staff. Every staff member is an admin."""
import html
import logging
import secrets
from datetime import timedelta
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.config import settings
from backend.database import get_db
from backend.dependencies.auth import client_ip, get_current_admin
from backend.models import OperatorUser, PasswordResetToken, PortalSession
from backend.services.auth_service import (
    AdminPrincipal,
    as_utc,
    attempts_exceeded,
    create_operator,
    hash_password,
    normalize_email,
    principal_for,
    record_attempt,
    record_audit,
    sha256_hex,
    utc_now,
)

logger = logging.getLogger("kai_staff")

router = APIRouter(prefix="/api/auth", tags=["Staff accounts"])

RESET_EXPIRE_MINUTES = 30
INVITE_EXPIRE_HOURS = 72
MAX_RESET_REQUESTS_PER_IP = 10
MAX_RESET_REQUESTS_PER_ACCOUNT = 3
MAX_RESET_CONFIRMS_PER_IP = 10
MIN_PASSWORD_LENGTH = 12

GENERIC_RESET_MESSAGE = "If that email belongs to a staff account, a reset link is on its way."
INVALID_LINK_MESSAGE = "This link is invalid or has expired. Please request a new one."


class ResetRequest(BaseModel):
    email: EmailStr


class ResetConfirm(BaseModel):
    token: str = Field(..., min_length=20, max_length=200)
    password: str = Field(..., max_length=512)


class StaffCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=1, max_length=255)


def issue_access_token(db: Session, user: OperatorUser, purpose: str) -> str:
    """Replaces any earlier unused link for this person and returns the raw token, which is never stored."""
    now = utc_now()
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id, PasswordResetToken.used_at.is_(None)
    ).update({"used_at": now})
    lifetime = timedelta(hours=INVITE_EXPIRE_HOURS) if purpose == "invite" else timedelta(minutes=RESET_EXPIRE_MINUTES)
    token = secrets.token_urlsafe(32)
    db.add(PasswordResetToken(user_id=user.id, token_sha256=sha256_hex(token), purpose=purpose, expires_at=now + lifetime))
    db.commit()
    return token


def access_link(token: str, purpose: str) -> str:
    # The token sits in the URL fragment, so it never reaches server logs or Referer headers.
    # The base comes from configuration, not the request's Host header, which an attacker could forge.
    suffix = "&invite=1" if purpose == "invite" else ""
    return f"{settings.PUBLIC_SITE_URL.rstrip('/')}/portal/reset-password#token={token}{suffix}"


def _deliver(email: str, subject: str, html_body: str, log_detail: str) -> bool:
    from backend.services.email_service import _send_smtp_email

    if settings.SMTP_HOST and _send_smtp_email([email], subject, html_body, display_name="KAI Wellness Retreats"):
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
            logger.error(f"Staff email delivery failed (HTTP {response.status_code})")
        except httpx.HTTPError as exc:
            logger.error(f"Staff email delivery failed: {exc}")
        return False
    if settings.ENVIRONMENT != "production":
        logger.info(f"[Development] Staff email for {email}: {log_detail}")
        return True
    logger.error("No email transport configured; staff email was not delivered.")
    return False


def send_access_email(email: str, full_name: str, link: str, purpose: str) -> bool:
    name = html.escape(full_name)
    if purpose == "invite":
        subject = "You're invited to the KAI staff CRM"
        intro = "You've been given a staff account for the KAI Wellness Retreats CRM. Choose a password to get started."
        action = "Set your password"
        expiry = f"This link expires in {INVITE_EXPIRE_HOURS} hours."
    else:
        subject = "Reset your KAI staff CRM password"
        intro = "We received a request to reset your password."
        action = "Choose a new password"
        expiry = f"This link expires in {RESET_EXPIRE_MINUTES} minutes. If you didn't ask for it, you can ignore this email."
    body = (
        '<div style="font-family: Arial, sans-serif; color: #2D3E35; padding: 24px; max-width: 520px;">'
        f"<p>Hi {name},</p><p>{intro}</p>"
        f'<p><a href="{html.escape(link, quote=True)}" style="background:#2D3E35;color:#FAF7F2;padding:10px 18px;'
        f'border-radius:8px;text-decoration:none;display:inline-block;">{action}</a></p>'
        f"<p>{expiry}</p></div>"
    )
    return _deliver(email, subject, body, link)


def send_password_changed_email(email: str, full_name: str) -> None:
    body = (
        '<div style="font-family: Arial, sans-serif; color: #2D3E35; padding: 24px; max-width: 520px;">'
        f"<p>Hi {html.escape(full_name)},</p><p>Your KAI staff CRM password was just changed, and other devices have been signed out.</p>"
        "<p>If this wasn't you, contact Kareena or Armaan right away.</p></div>"
    )
    _deliver(email, "Your KAI staff CRM password was changed", body, "password changed")


def end_all_sessions(db: Session, user: OperatorUser) -> None:
    """Bumping the version invalidates live access tokens; revoking the rows stops refreshes."""
    user.token_version = (user.token_version or 0) + 1
    db.query(PortalSession).filter(
        PortalSession.user_id == user.id, PortalSession.revoked_at.is_(None)
    ).update({"revoked_at": utc_now()})


# ---------------------------------------------------------------- public reset flow

@router.post("/operator/password-reset/request")
def request_password_reset(
    payload: ResetRequest, request: Request, background: BackgroundTasks, db: Session = Depends(get_db)
):
    """Answers the same way for every email, so it can't be used to find out who has an account."""
    ip_key = f"password-reset-ip:{client_ip(request)}"
    if attempts_exceeded(db, ip_key, MAX_RESET_REQUESTS_PER_IP):
        raise HTTPException(status_code=429, detail="Too many requests. Please wait a few minutes and try again.")
    record_attempt(db, ip_key)

    email = normalize_email(payload.email)
    account_key = f"password-reset-account:{email}"
    user = db.query(OperatorUser).filter(OperatorUser.email == email).first()
    if user and user.is_active and not attempts_exceeded(db, account_key, MAX_RESET_REQUESTS_PER_ACCOUNT):
        record_attempt(db, account_key)
        purpose = "invite" if user.last_login_at is None else "reset"
        token = issue_access_token(db, user, purpose)
        # Runs after the response, so response time doesn't reveal whether an email was sent.
        background.add_task(send_access_email, user.email, user.full_name, access_link(token, purpose), purpose)
    return {"message": GENERIC_RESET_MESSAGE}


@router.post("/operator/password-reset/confirm")
def confirm_password_reset(
    payload: ResetConfirm, request: Request, background: BackgroundTasks, db: Session = Depends(get_db)
):
    ip_key = f"password-reset-confirm-ip:{client_ip(request)}"
    if attempts_exceeded(db, ip_key, MAX_RESET_CONFIRMS_PER_IP):
        raise HTTPException(status_code=429, detail="Too many attempts. Please wait a few minutes and try again.")
    if len(payload.password) < MIN_PASSWORD_LENGTH:
        raise HTTPException(status_code=422, detail=f"Use at least {MIN_PASSWORD_LENGTH} characters.")

    digest = sha256_hex(payload.token)
    row = db.query(PasswordResetToken).filter(PasswordResetToken.token_sha256 == digest).first()
    user = db.query(OperatorUser).filter(OperatorUser.id == row.user_id).first() if row else None
    if not row or row.used_at is not None or as_utc(row.expires_at) <= utc_now() or not user or not user.is_active:
        record_attempt(db, ip_key)
        raise HTTPException(status_code=400, detail=INVALID_LINK_MESSAGE)
    if payload.password.strip().lower() == user.email:
        raise HTTPException(status_code=422, detail="Your password can't be your email address.")

    password_hash = hash_password(payload.password)
    # Conditional update, so two simultaneous submissions can't both use one link.
    claimed = db.query(PasswordResetToken).filter(
        PasswordResetToken.id == row.id, PasswordResetToken.used_at.is_(None)
    ).update({"used_at": utc_now()}, synchronize_session=False)
    if claimed != 1:
        db.rollback()
        raise HTTPException(status_code=400, detail=INVALID_LINK_MESSAGE)

    user.password_hash = password_hash
    user.failed_login_count = 0
    user.locked_until = None
    end_all_sessions(db, user)
    db.commit()
    record_audit(db, principal_for(user), "operator.password_set", "operator_user", user.id, {"via": row.purpose})
    background.add_task(send_password_changed_email, user.email, user.full_name)
    return {"success": True}


# ---------------------------------------------------------------- staff management (admins only)

def _staff_payload(user: OperatorUser, current_id: str) -> dict:
    if not user.is_active:
        status = "deactivated"
    elif user.last_login_at is None:
        status = "invited"
    else:
        status = "active"
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "status": status,
        "last_login_at": as_utc(user.last_login_at).isoformat() if user.last_login_at else None,
        "created_at": as_utc(user.created_at).isoformat() if user.created_at else None,
        "is_you": user.id == current_id,
    }


def _get_staff(db: Session, user_id: str) -> OperatorUser:
    user = db.query(OperatorUser).filter(OperatorUser.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Staff member not found.")
    return user


def _send_access(db: Session, user: OperatorUser) -> dict:
    """Sends the link while the admin waits. If email fails, the admin gets the link to pass on."""
    purpose = "invite" if user.last_login_at is None else "reset"
    token = issue_access_token(db, user, purpose)
    link = access_link(token, purpose)
    sent = send_access_email(user.email, user.full_name, link, purpose)
    return {"email_sent": sent, "access_link": None if sent else link}


@router.get("/staff")
def list_staff(principal: AdminPrincipal = Depends(get_current_admin), db: Session = Depends(get_db)):
    users = db.query(OperatorUser).order_by(OperatorUser.full_name).all()
    return [_staff_payload(user, principal.id) for user in users]


@router.post("/staff", status_code=201)
def invite_staff(payload: StaffCreate, principal: AdminPrincipal = Depends(get_current_admin), db: Session = Depends(get_db)):
    full_name = payload.full_name.strip()
    if not full_name:
        raise HTTPException(status_code=422, detail="Enter a name.")
    try:
        # A random password nobody knows: the account opens only through the invitation link.
        user = create_operator(db, normalize_email(payload.email), secrets.token_urlsafe(32), full_name)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="A staff account with that email already exists.")
    record_audit(db, principal, "staff.invited", "operator_user", user.id, {"email": user.email})
    return {"staff": _staff_payload(user, principal.id), **_send_access(db, user)}


@router.post("/staff/{user_id}/send-access")
def send_staff_access(user_id: str, principal: AdminPrincipal = Depends(get_current_admin), db: Session = Depends(get_db)):
    user = _get_staff(db, user_id)
    if not user.is_active:
        raise HTTPException(status_code=409, detail="Reactivate this account first.")
    result = _send_access(db, user)
    record_audit(db, principal, "staff.access_link_sent", "operator_user", user.id, {"email_sent": result["email_sent"]})
    return result


@router.post("/staff/{user_id}/deactivate")
def deactivate_staff(user_id: str, principal: AdminPrincipal = Depends(get_current_admin), db: Session = Depends(get_db)):
    user = _get_staff(db, user_id)
    # This also guarantees at least one active admin always remains.
    if user.id == principal.id:
        raise HTTPException(status_code=409, detail="You can't deactivate your own account.")
    user.is_active = False
    end_all_sessions(db, user)
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id, PasswordResetToken.used_at.is_(None)
    ).update({"used_at": utc_now()})
    db.commit()
    record_audit(db, principal, "staff.deactivated", "operator_user", user.id, {"email": user.email})
    return _staff_payload(user, principal.id)


@router.post("/staff/{user_id}/reactivate")
def reactivate_staff(user_id: str, principal: AdminPrincipal = Depends(get_current_admin), db: Session = Depends(get_db)):
    user = _get_staff(db, user_id)
    user.is_active = True
    user.failed_login_count = 0
    user.locked_until = None
    db.commit()
    record_audit(db, principal, "staff.reactivated", "operator_user", user.id, {"email": user.email})
    return _staff_payload(user, principal.id)
