from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from supabase import AuthApiError
from sqlalchemy.orm import Session

from app.config.auth import create_access_token, create_reset_token, decode_reset_token, hash_pin, verify_pin
from app.config.settings import get_settings
from app.config.supabase import get_supabase
from app.db.models import AdminPin, Device

PIN_MAX_ATTEMPTS = 10
PIN_LOCKOUT_MINUTES = 30


def verify_admin_pin(db: Session, device: Device, pin: str) -> str | None:
    """Returns a session token if the PIN is correct, else None.
    Raises 429 if this device is currently locked out from too many recent wrong PINs."""
    if get_settings().demo_mode:
        # Public showcase deployment: the PIN pad stays in the flow for the real product
        # experience, but any PIN entered succeeds immediately - no hash check, no lockout.
        return create_access_token(str(device.id))

    now = datetime.now(timezone.utc)
    if device.pin_locked_until is not None and device.pin_locked_until > now:
        remaining_minutes = int((device.pin_locked_until - now).total_seconds() // 60) + 1
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many incorrect attempts. Try again in {remaining_minutes} minute"
            f"{'s' if remaining_minutes != 1 else ''}.",
        )

    record = db.query(AdminPin).first()
    if record is None or not verify_pin(pin, record.pin_hash):
        device.failed_pin_attempts += 1
        if device.failed_pin_attempts >= PIN_MAX_ATTEMPTS:
            device.pin_locked_until = now + timedelta(minutes=PIN_LOCKOUT_MINUTES)
            device.failed_pin_attempts = 0
        db.commit()
        return None

    device.failed_pin_attempts = 0
    device.pin_locked_until = None
    db.commit()
    return create_access_token(str(device.id))


def set_admin_pin(db: Session, pin: str) -> None:
    """Creates or rotates the single shared admin PIN. Not exposed publicly — see router/auth.py."""
    record = db.query(AdminPin).first()
    pin_hash = hash_pin(pin)
    if record is None:
        record = AdminPin(id=1, pin_hash=pin_hash)
        db.add(record)
    else:
        record.pin_hash = pin_hash
    db.commit()


def request_pin_reset(email: str) -> str:
    """Sends an email OTP via Supabase Auth. Returns 'ok', 'email_mismatch' (not the one authorized
    admin address — must already exist as a Supabase Auth user, created out-of-band, since OTPs are
    requested with should_create_user=False so no one else can trigger one for themselves), or
    'send_failed' (Supabase rejected the send, e.g. its email rate limit was hit)."""
    settings = get_settings()
    if email.strip().lower() != settings.admin_email.lower():
        return "email_mismatch"

    client = get_supabase()
    try:
        client.auth.sign_in_with_otp({"email": email, "options": {"should_create_user": False}})
    except AuthApiError:
        return "send_failed"
    return "ok"


def verify_pin_reset_otp(email: str, otp: str) -> str | None:
    """Verifies the OTP with Supabase. Returns a short-lived reset ticket on success, else None."""
    client = get_supabase()
    try:
        client.auth.verify_otp({"email": email, "token": otp, "type": "email"})
    except AuthApiError:
        return None
    return create_reset_token()


def confirm_pin_reset(db: Session, reset_token: str, pin: str) -> None:
    """Raises HTTPException if the ticket is missing/expired/wrong-purpose, or the PIN isn't 4 digits."""
    decode_reset_token(reset_token)
    if not (pin.isdigit() and len(pin) == 4):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="PIN must be 4 digits.")
    set_admin_pin(db, pin)
