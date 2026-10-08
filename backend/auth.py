import base64
import hashlib
import hmac
import json
import logging
import os
import time
from datetime import datetime, timezone

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from pydantic import BaseModel

from database import db


logger = logging.getLogger(__name__)


router = APIRouter(prefix="/auth", tags=["auth"])
users_collection = db["users"]

SESSION_COOKIE_NAME = "productiq_session"
SESSION_MAX_AGE = int(os.getenv("SESSION_MAX_AGE_SECONDS", "28800"))

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "").strip()
SESSION_SECRET = os.getenv("SESSION_SECRET", "").strip()

REVIEWER_EMAILS = {
    email.strip().lower()
    for email in os.getenv("REVIEWER_EMAILS", "").split(",")
    if email.strip()
}

SELLER_EMAILS = {
    email.strip().lower()
    for email in os.getenv("SELLER_EMAILS", "").split(",")
    if email.strip()
}


class GoogleCredential(BaseModel):
    credential: str
    requested_role: str = "USER"


def _session_signature(payload):
    if not SESSION_SECRET:
        raise HTTPException(
            status_code=500,
            detail="SESSION_SECRET is not configured",
        )

    return hmac.new(
        SESSION_SECRET.encode("utf-8"),
        payload,
        hashlib.sha256,
    ).digest()


def _session_value(google_sub):
    payload = base64.urlsafe_b64encode(
        json.dumps(
            {
                "sub": google_sub,
                "exp": int(time.time()) + SESSION_MAX_AGE,
            }
        ).encode("utf-8")
    ).rstrip(b"=")

    signature = base64.urlsafe_b64encode(
        _session_signature(payload)
    ).rstrip(b"=")

    return f"{payload.decode('ascii')}.{signature.decode('ascii')}"


def _google_sub_from_session(session_cookie):
    if not session_cookie:
        return None

    try:
        payload_text, signature_text = session_cookie.split(".", 1)

        payload = payload_text.encode("ascii")

        supplied_signature = base64.urlsafe_b64decode(
            signature_text
            + "=" * (-len(signature_text) % 4)
        )

        if not hmac.compare_digest(
            _session_signature(payload),
            supplied_signature,
        ):
            return None

        claims = json.loads(
            base64.urlsafe_b64decode(
                payload + b"=" * (-len(payload) % 4)
            )
        )

        if claims.get("exp", 0) < time.time():
            return None

        return claims.get("sub")

    except (
        ValueError,
        TypeError,
        UnicodeDecodeError,
        json.JSONDecodeError,
    ):
        return None


def _public_user(user):
    return {
        "id": str(user["_id"]),
        "authenticated": True,
        "google_sub": user["google_sub"],
        "email": user["email"],
        "name": user.get("name", ""),
        "picture": user.get("picture", ""),
        "role": user.get("role", "USER"),
        "created_at": user["created_at"].isoformat(),
        "last_login_at": user["last_login_at"].isoformat(),
        "is_active": user.get("is_active", True),
    }


def get_current_user(
    productiq_session: str | None = Cookie(default=None),
):
    google_sub = _google_sub_from_session(productiq_session)

    if not google_sub:
        raise HTTPException(
            status_code=401,
            detail="Not authenticated",
        )

    user = users_collection.find_one(
        {"google_sub": google_sub}
    )

    if not user or not user.get("is_active", True):
        raise HTTPException(
            status_code=401,
            detail="Not authenticated",
        )

    return user


def require_reviewer(user=Depends(get_current_user)):
    if user.get("role") != "REVIEWER":
        raise HTTPException(
            status_code=403,
            detail="Reviewer access required",
        )

    return user


def require_user(user=Depends(get_current_user)):
    if user.get("role") != "USER":
        raise HTTPException(
            status_code=403,
            detail="Customer access required",
        )

    return user


def require_seller(user=Depends(get_current_user)):
    if user.get("role") != "SELLER":
        raise HTTPException(
            status_code=403,
            detail="Seller access required",
        )

    return user


def require_catalog_contributor(
    user=Depends(get_current_user),
):
    if user.get("role") not in {"REVIEWER", "SELLER"}:
        raise HTTPException(
            status_code=403,
            detail="Catalog contributor access required",
        )

    return user


@router.post("/google")
def google_login(
    payload: GoogleCredential,
    response: Response,
):
    # ============================================================
    # TEMPORARY SAFE GOOGLE JWT DIAGNOSTICS
    #
    # We only inspect:
    #   - JWT header: alg, kid, typ
    #   - JWT payload: aud, iss, exp, iat, azp
    #
    # NEVER log the complete Google credential.
    # ============================================================

    decoded_header = None
    decoded_payload = None

    try:
        jwt_parts = payload.credential.split(".")

        if len(jwt_parts) == 3:
            # ----------------------------------------------------
            # Decode JWT HEADER
            # ----------------------------------------------------
            header_bytes = base64.urlsafe_b64decode(
                jwt_parts[0]
                + "=" * (-len(jwt_parts[0]) % 4)
            )

            candidate_header = json.loads(header_bytes)

            if isinstance(candidate_header, dict):
                decoded_header = candidate_header

            # ----------------------------------------------------
            # Decode JWT PAYLOAD
            # ----------------------------------------------------
            payload_bytes = base64.urlsafe_b64decode(
                jwt_parts[1]
                + "=" * (-len(jwt_parts[1]) % 4)
            )

            candidate_payload = json.loads(payload_bytes)

            if isinstance(candidate_payload, dict):
                decoded_payload = candidate_payload

    except Exception:
        decoded_header = None
        decoded_payload = None

    # ------------------------------------------------------------
    # SAFE HEADER INFORMATION
    # ------------------------------------------------------------

    safe_header = {
        "alg": (
            decoded_header.get("alg")
            if decoded_header
            else None
        ),
        "kid": (
            decoded_header.get("kid")
            if decoded_header
            else None
        ),
        "typ": (
            decoded_header.get("typ")
            if decoded_header
            else None
        ),
    }

    # ------------------------------------------------------------
    # SAFE PAYLOAD INFORMATION
    # ------------------------------------------------------------

    aud = (
        decoded_payload.get("aud")
        if decoded_payload
        else None
    )

    audience_match = bool(GOOGLE_CLIENT_ID) and (
        aud == GOOGLE_CLIENT_ID
        or (
            isinstance(aud, list)
            and GOOGLE_CLIENT_ID in aud
        )
    )

    safe_claims = {
        "aud": aud,
        "iss": (
            decoded_payload.get("iss")
            if decoded_payload
            else None
        ),
        "exp": (
            decoded_payload.get("exp")
            if decoded_payload
            else None
        ),
        "iat": (
            decoded_payload.get("iat")
            if decoded_payload
            else None
        ),
        "azp": (
            decoded_payload.get("azp")
            if decoded_payload
            else None
        ),
    }

    logger.warning(
        "Google credential diagnostics: "
        "decoded=%s claims=%s "
        "google_client_id_present=%s "
        "google_client_id_length=%d "
        "google_client_id_suffix=%s "
        "audience_match=%s",
        decoded_payload is not None,
        json.dumps(
            safe_claims,
            separators=(",", ":"),
            ensure_ascii=True,
        ),
        bool(GOOGLE_CLIENT_ID),
        len(GOOGLE_CLIENT_ID),
        GOOGLE_CLIENT_ID[-6:],
        audience_match,
    )

    # ============================================================
    # GOOGLE CLIENT ID CHECK
    # ============================================================

    if not GOOGLE_CLIENT_ID:
        logger.error(
            "Google login verification unavailable: "
            "GOOGLE_CLIENT_ID is missing"
        )

        raise HTTPException(
            status_code=500,
            detail="GOOGLE_CLIENT_ID is not configured",
        )

    # ============================================================
    # GOOGLE TOKEN VERIFICATION
    # ============================================================

    try:
        claims = id_token.verify_oauth2_token(
            payload.credential,
            google_requests.Request(),
            GOOGLE_CLIENT_ID,
        )

    except Exception as error:
        error_text = str(error).lower()

        if (
            "expired" in error_text
            or "expiration" in error_text
        ):
            reason = "expired token"

        elif (
            "audience" in error_text
            or "aud" in error_text
        ):
            reason = "wrong audience"

        elif "issuer" in error_text:
            reason = "wrong issuer"

        elif "signature" in error_text:
            reason = "invalid signature"

        elif isinstance(error, ValueError):
            reason = "invalid token"

        else:
            reason = "verification exception"

        logger.warning(
            "Google credential verification failed: "
            "reason=%s exception_type=%s error=%s",
            reason,
            type(error).__name__,
            str(error),
        )

        if not isinstance(error, ValueError):
            raise

        raise HTTPException(
            status_code=401,
            detail="Invalid Google credential",
        ) from error

    # ============================================================
    # VERIFIED GOOGLE CLAIMS
    # ============================================================

    if claims.get("iss") not in {
        "accounts.google.com",
        "https://accounts.google.com",
    }:
        logger.warning(
            "Google credential rejected: reason=wrong issuer"
        )

        raise HTTPException(
            status_code=401,
            detail="Invalid Google credential issuer",
        )

    if claims.get("email_verified") is not True:
        raise HTTPException(
            status_code=403,
            detail="A verified Google email is required",
        )

    google_sub = claims.get("sub")
    email = claims.get("email", "").strip().lower()

    if not google_sub or not email:
        raise HTTPException(
            status_code=401,
            detail=(
                "Google credential is missing "
                "required identity claims"
            ),
        )

    # ============================================================
    # FIND / CREATE USER
    # ============================================================

    now = datetime.now(timezone.utc)

    existing_user = users_collection.find_one(
        {"google_sub": google_sub}
    )

    created_at = (
        existing_user.get("created_at", now)
        if existing_user
        else now
    )

    # ============================================================
    # SERVER-SIDE ROLE ASSIGNMENT
    #
    # REVIEWER:
    #   controlled by REVIEWER_EMAILS
    #
    # SELLER:
    #   requested SELLER + email exists in SELLER_EMAILS
    #
    # USER:
    #   default customer role
    # ============================================================

    requested_role = (
        payload.requested_role.strip().upper()
    )

    if email in REVIEWER_EMAILS:
        role = "REVIEWER"

    elif (
        requested_role == "SELLER"
        and email in SELLER_EMAILS
    ):
        role = "SELLER"

    else:
        role = "USER"

    user = {
        "google_sub": google_sub,
        "email": email,
        "name": claims.get("name", ""),
        "picture": claims.get("picture", ""),
        "role": role,
        "created_at": created_at,
        "last_login_at": now,
        "is_active": (
            existing_user.get("is_active", True)
            if existing_user
            else True
        ),
    }

    users_collection.replace_one(
        {"google_sub": google_sub},
        user,
        upsert=True,
    )

    stored_user = users_collection.find_one(
        {"google_sub": google_sub}
    )

    # ============================================================
    # ACCOUNT ACTIVE CHECK
    # ============================================================

    if not user["is_active"]:
        raise HTTPException(
            status_code=403,
            detail="This ProductIQ account is inactive",
        )

    # ============================================================
    # CREATE HTTP-ONLY SESSION COOKIE
    # ============================================================

    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=_session_value(google_sub),
        max_age=SESSION_MAX_AGE,
        httponly=True,
        secure=(
            os.getenv(
                "SESSION_COOKIE_SECURE",
                "false",
            ).lower()
            == "true"
        ),
        samesite="lax",
        path="/",
    )

    return {
        "user": _public_user(stored_user)
    }


@router.get("/me")
def current_user(
    user=Depends(get_current_user),
):
    return {
        "user": _public_user(user)
    }


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(
        key=SESSION_COOKIE_NAME,
        path="/",
    )

    return {
        "success": True
    }


users_collection.create_index(
    "google_sub",
    unique=True,
)
