"""Operator authentication: login, refresh rotation, logout and the current principal."""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from backend.config import settings
from backend.database import get_db
from backend.dependencies.auth import client_ip, enforce_csrf, get_current_admin
from backend.models import OperatorUser, PortalSession
from backend.services.auth_service import (
    ACCESS_COOKIE,
    ADMIN_PERMISSIONS,
    AdminPrincipal,
    AuthError,
    CSRF_COOKIE,
    IssuedTokens,
    MAX_LOGINS_PER_IP,
    REFRESH_COOKIE,
    account_is_locked,
    attempts_exceeded,
    burn_password_check,
    clear_attempts,
    create_operator_session,
    decode_token,
    ensure_bootstrap_operator,
    find_session_by_refresh_token,
    generate_csrf_token,
    normalize_email,
    principal_for,
    record_attempt,
    record_audit,
    register_failed_login,
    register_successful_login,
    revoke_session,
    rotate_refresh_token,
    verify_password,
)
logger = logging.getLogger("kai_auth_router")

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

INVALID_LOGIN_MESSAGE = "Incorrect email or password."


class OperatorLoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=512)


def secure_cookies(request: Optional[Request] = None) -> bool:
    if settings.ENVIRONMENT != "production":
        return False
    if request is not None:
        proto = (request.headers.get("x-forwarded-proto") or request.url.scheme or "").lower()
        if proto == "http":
            return False
        host = (request.headers.get("x-forwarded-host") or request.headers.get("host") or "").split(":")[0].lower()
        if host in ("localhost", "127.0.0.1", "backend", "frontend"):
            return False
    return True


def set_csrf_cookie(response: Response, csrf_token: str, request: Optional[Request] = None) -> None:
    # Readable by page scripts by design: that is what makes the double-submit check work.
    response.set_cookie(
        CSRF_COOKIE, csrf_token,
        max_age=settings.REFRESH_SESSION_EXPIRE_DAYS * 86400,
        httponly=False, secure=secure_cookies(request), samesite="lax", path="/",
    )


def set_session_cookies(response: Response, tokens: IssuedTokens, request: Optional[Request] = None) -> None:
    is_sec = secure_cookies(request)
    response.set_cookie(
        ACCESS_COOKIE, tokens.access_token,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        httponly=True, secure=is_sec, samesite="lax", path="/",
    )
    response.set_cookie(
        REFRESH_COOKIE, tokens.refresh_token,
        max_age=settings.REFRESH_SESSION_EXPIRE_DAYS * 86400,
        httponly=True, secure=is_sec, samesite="lax", path="/",
    )
    set_csrf_cookie(response, tokens.csrf_token, request)


def clear_session_cookies(response: Response) -> None:
    for name in (ACCESS_COOKIE, REFRESH_COOKIE, CSRF_COOKIE):
        response.delete_cookie(name, path="/")


def _principal_payload(principal: AdminPrincipal, csrf_token: Optional[str]) -> dict:
    return {
        "id": principal.id,
        "email": principal.email,
        "full_name": principal.full_name,
        "role": principal.role,
        "permissions": list(ADMIN_PERMISSIONS),
        "csrf_token": csrf_token,
    }


@router.post("/operator/login")
def operator_login(payload: OperatorLoginRequest, request: Request, response: Response, db: Session = Depends(get_db)):
    """Verifies email and Argon2id password, with per-IP throttling and per-account lockout."""
    ip_address = client_ip(request)
    ip_key = f"operator-login-ip:{ip_address}"
    if attempts_exceeded(db, ip_key, MAX_LOGINS_PER_IP):
        raise HTTPException(status_code=429, detail="Too many sign-in attempts. Please wait a few minutes and try again.")

    user = db.query(OperatorUser).filter(OperatorUser.email == normalize_email(payload.email)).first()
    if not user:
        burn_password_check(payload.password)
        record_attempt(db, ip_key)
        raise HTTPException(status_code=401, detail=INVALID_LOGIN_MESSAGE)
    if account_is_locked(user):
        burn_password_check(payload.password)
        record_attempt(db, ip_key)
        raise HTTPException(status_code=429, detail="Too many sign-in attempts. Please wait a few minutes and try again.")
    if not user.is_active or not verify_password(payload.password, user.password_hash):
        register_failed_login(db, user)
        record_attempt(db, ip_key)
        raise HTTPException(status_code=401, detail=INVALID_LOGIN_MESSAGE)

    register_successful_login(db, user, payload.password)
    clear_attempts(db, ip_key)
    tokens = create_operator_session(db, user, ip_address, request.headers.get("user-agent"))
    set_session_cookies(response, tokens, request)
    principal = principal_for(user, tokens.session.session_id)
    record_audit(db, principal, "operator.login", "portal_session", tokens.session.session_id, {"ip": ip_address})
    return _principal_payload(principal, tokens.csrf_token)


@router.post("/operator/demo-login")
def operator_demo_login(request: Request, response: Response, db: Session = Depends(get_db)):
    """One-click sign-in for local development and previews. Does not exist in production."""
    if settings.ENVIRONMENT == "production" or not settings.ENABLE_DEMO_AUTH:
        raise HTTPException(status_code=404, detail="Not found.")
    ensure_bootstrap_operator(db)
    user = db.query(OperatorUser).filter(OperatorUser.email == normalize_email(settings.ADMIN_EMAIL)).first()
    if not user:
        raise HTTPException(status_code=404, detail="Not found.")
    tokens = create_operator_session(db, user, client_ip(request), request.headers.get("user-agent"))
    set_session_cookies(response, tokens, request)
    principal = principal_for(user, tokens.session.session_id)
    record_audit(db, principal, "operator.demo_login", "portal_session", tokens.session.session_id)
    return _principal_payload(principal, tokens.csrf_token)


@router.post("/operator/refresh")
def operator_refresh(request: Request, response: Response, db: Session = Depends(get_db)):
    """Rotates the refresh token. Reusing an already rotated token revokes the whole session family."""
    refresh_token = request.cookies.get(REFRESH_COOKIE)
    if not refresh_token:
        raise HTTPException(status_code=401, detail="No active session.")

    session = find_session_by_refresh_token(db, refresh_token)
    if session:
        enforce_csrf(request, session.session_id)
    try:
        tokens = rotate_refresh_token(db, refresh_token, client_ip(request), request.headers.get("user-agent"))
    except AuthError as exc:
        error = JSONResponse(status_code=401, content={"detail": str(exc)})
        clear_session_cookies(error)
        return error
    set_session_cookies(response, tokens, request)
    user = db.query(OperatorUser).filter(OperatorUser.id == tokens.session.user_id).first()
    return _principal_payload(principal_for(user, tokens.session.session_id), tokens.csrf_token)


@router.post("/operator/logout")
def operator_logout(request: Request, response: Response, db: Session = Depends(get_db)):
    """Revokes the server-side session and clears cookies."""
    session = None
    refresh_token = request.cookies.get(REFRESH_COOKIE)
    if refresh_token:
        session = find_session_by_refresh_token(db, refresh_token)
    access_token = request.cookies.get(ACCESS_COOKIE)
    if not session and access_token:
        try:
            claims = decode_token(access_token, "access")
            session = db.query(PortalSession).filter(PortalSession.session_id == claims.get("sid")).first()
        except AuthError:
            session = None
    if session:
        enforce_csrf(request, session.session_id)
        revoke_session(db, session)
        user = db.query(OperatorUser).filter(OperatorUser.id == session.user_id).first()
        if user:
            record_audit(db, principal_for(user, session.session_id), "operator.logout", "portal_session", session.session_id)
    clear_session_cookies(response)
    return {"success": True}


@router.get("/me")
def get_me(request: Request, response: Response, principal: AdminPrincipal = Depends(get_current_admin)):
    """The signed-in operator. Reissues the CSRF cookie if the browser has lost it."""
    csrf_token = request.cookies.get(CSRF_COOKIE)
    if not csrf_token:
        csrf_token = generate_csrf_token(principal.session_id)
        set_csrf_cookie(response, csrf_token, request)
    return _principal_payload(principal, csrf_token)
