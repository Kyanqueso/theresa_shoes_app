import secrets
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.config.auth import hash_pin
from app.db.models import Device, DevicePairingCode

# 6 digits keeps the code readable and typeable on a phone by someone who isn't
# comfortable with technology — the same trade-off the 4-digit PIN already makes.
# A code is valid for 10 minutes and can only ever be redeemed once, so the window for
# guessing is small; see claim_pairing_code for the rest of the reasoning.
CODE_LENGTH = 6
CODE_TTL_MINUTES = 10
# Minimum gap between claim attempts. Cheap to enforce, and it's what makes a 6-digit code
# defensible against guessing on an endpoint that can't require authentication.
CLAIM_COOLDOWN_SECONDS = 10


def _now() -> datetime:
    return datetime.now(timezone.utc)


def create_pairing_code(db: Session) -> DevicePairingCode:
    """Issues a fresh pairing code. Admin-only — see router/devices.py.

    Any earlier unused codes are dropped first: only one code is ever live at a time, which
    both avoids confusion ("which code did I read out?") and shrinks the guessable set.
    """
    db.query(DevicePairingCode).filter(DevicePairingCode.used_at.is_(None)).delete()
    db.query(DevicePairingCode).filter(DevicePairingCode.expires_at < _now()).delete()

    # secrets, not random - this value is a credential.
    code = "".join(secrets.choice("0123456789") for _ in range(CODE_LENGTH))
    record = DevicePairingCode(code=code, expires_at=_now() + timedelta(minutes=CODE_TTL_MINUTES))
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def claim_pairing_code(db: Session, code: str, label: str | None, pin: str) -> Device:
    """Redeems a code and returns the newly created Device, whose token the caller stores.

    Deliberately reachable without a device header — a device being paired has no token yet,
    so this is the one endpoint that cannot be behind require_valid_device. It stays safe
    because a code is single-use, expires in 10 minutes, only one exists at a time, and a
    wrong guess forces a cooldown before the next attempt (see below).
    """
    live = (
        db.query(DevicePairingCode)
        .filter(DevicePairingCode.used_at.is_(None), DevicePairingCode.expires_at > _now())
        .first()
    )

    # Throttle before checking the code. A 6-digit code is a million combinations, which is
    # only meaningful if guesses are cheap — this makes each wrong guess cost 10 seconds,
    # turning an afternoon's brute force into months. Tracked on the code row itself rather
    # than in memory, because each Lambda invocation is a fresh process with no shared state.
    if live is not None and live.last_attempt_at is not None:
        elapsed = (_now() - live.last_attempt_at).total_seconds()
        if elapsed < CLAIM_COOLDOWN_SECONDS:
            wait = int(CLAIM_COOLDOWN_SECONDS - elapsed) + 1
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many attempts. Please wait {wait} second{'s' if wait != 1 else ''} and try again.",
            )

    record = (
        db.query(DevicePairingCode)
        .filter(
            DevicePairingCode.code == code.strip(),
            DevicePairingCode.used_at.is_(None),
            DevicePairingCode.expires_at > _now(),
        )
        .first()
    )
    if record is None:
        if live is not None:
            live.last_attempt_at = _now()
            db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="That pairing code is invalid, already used, or has expired.",
        )

    # The PIN is set here, in the same transaction as the device row, so a device can never
    # exist in a half-paired state with no way to authenticate.
    device = Device(
        device_token=str(uuid.uuid4()),
        label=(label or "").strip() or "New device",
        pin_hash=hash_pin(pin),
    )
    db.add(device)
    db.flush()

    record.used_at = _now()
    record.used_by_device_id = device.id
    db.commit()
    db.refresh(device)
    return device


def list_devices(db: Session) -> list[Device]:
    return db.query(Device).order_by(Device.created_at.desc()).all()


def update_device(db: Session, device_id: uuid.UUID, label: str | None, is_active: bool | None) -> Device | None:
    """Rename or revoke a device. Revoking (is_active=False) takes effect on its next request:
    require_valid_device rejects inactive devices, so any session it still holds becomes useless."""
    device = db.query(Device).filter(Device.id == device_id).first()
    if device is None:
        return None
    if label is not None:
        device.label = label.strip() or device.label
    if is_active is not None:
        device.is_active = is_active
    db.commit()
    db.refresh(device)
    return device


def delete_device(db: Session, device_id: uuid.UUID, current_device: Device) -> bool:
    """Permanently removes a device. Refuses to delete the device making the request — that
    would 403 the admin out of the panel they're standing in with no way back."""
    if device_id == current_device.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You can't remove the device you're currently using.",
        )
    device = db.query(Device).filter(Device.id == device_id).first()
    if device is None:
        return False
    # Pairing codes reference the device they created; clear the link so the delete succeeds.
    db.query(DevicePairingCode).filter(DevicePairingCode.used_by_device_id == device_id).update(
        {DevicePairingCode.used_by_device_id: None}
    )
    db.delete(device)
    db.commit()
    return True
