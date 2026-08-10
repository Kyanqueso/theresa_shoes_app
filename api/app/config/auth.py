import hashlib
import hmac
import os
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.config.settings import get_settings
from app.db.base import get_db
from app.db.models import Device

PBKDF2_ITERATIONS = 260_000


def hash_pin(pin: str) -> str:
    settings = get_settings()
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", f"{pin}{settings.pin_pepper}".encode(), salt, PBKDF2_ITERATIONS)
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${salt.hex()}${digest.hex()}"


def verify_pin(pin: str, pin_hash: str) -> bool:
    settings = get_settings()
    try:
        algorithm, iterations, salt_hex, hash_hex = pin_hash.split("$")
        if algorithm != "pbkdf2_sha256":
            return False
        salt = bytes.fromhex(salt_hex)
        expected = bytes.fromhex(hash_hex)
    except (ValueError, AttributeError):
        return False

    actual = hashlib.pbkdf2_hmac("sha256", f"{pin}{settings.pin_pepper}".encode(), salt, int(iterations))
    return hmac.compare_digest(actual, expected)


def create_access_token(device_id: str) -> str:
    settings = get_settings()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {"sub": device_id, "exp": expire, "type": "admin_session"}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict:
    settings = get_settings()
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid or expired session") from exc


def create_reset_token() -> str:
    """Short-lived ticket proving the OTP step of the forgot-PIN flow just succeeded."""
    settings = get_settings()
    expire = datetime.now(timezone.utc) + timedelta(minutes=10)
    payload = {"purpose": "pin_reset", "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_reset_token(token: str) -> dict:
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Reset session expired. Please start over."
        ) from exc
    if payload.get("purpose") != "pin_reset":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid reset session.")
    return payload


def require_valid_device(
    x_device_id: str | None = Header(default=None, alias="X-Device-Id"),
    db: Session = Depends(get_db),
) -> Device:
    """Gate for anything device-restricted. Missing/unknown/inactive device -> 403."""
    if not x_device_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Missing device identifier")

    device = db.query(Device).filter(Device.device_token == x_device_id).first()
    if device is None or not device.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Device is not authorized")

    device.last_seen_at = datetime.now(timezone.utc)
    db.commit()
    return device


def require_admin_session(
    authorization: str | None = Header(default=None),
    device: Device = Depends(require_valid_device),
) -> Device:
    """Gate for admin-only endpoints. Requires a valid device AND a PIN-issued token bound to it."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Missing session token")

    token = authorization.removeprefix("Bearer ")
    payload = decode_access_token(token)

    if payload.get("sub") != str(device.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Session does not match this device")

    return device


def is_admin_session(
    x_device_id: str | None = Header(default=None, alias="X-Device-Id"),
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> bool:
    """Non-raising check for endpoints that are public but behave differently for admins (e.g. include_hidden)."""
    if not x_device_id or not authorization or not authorization.startswith("Bearer "):
        return False

    device = db.query(Device).filter(Device.device_token == x_device_id).first()
    if device is None or not device.is_active:
        return False

    try:
        payload = decode_access_token(authorization.removeprefix("Bearer "))
    except HTTPException:
        return False

    return payload.get("sub") == str(device.id)
