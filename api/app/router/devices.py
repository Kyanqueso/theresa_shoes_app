import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.config.auth import require_admin_session
from app.db.base import get_db
from app.db.models import Device
from app.schema.auth import ClaimDeviceIn, ClaimDeviceOut, DeviceOut, DeviceUpdate, PairingCodeOut
from app.services import device_service

router = APIRouter(prefix="/auth/devices", tags=["devices"])

# Everything here is admin-only EXCEPT /claim — a device being paired has no token yet, so it
# cannot pass require_valid_device. That endpoint is protected by the code itself: single-use,
# 10-minute expiry, and only one live code at a time (see device_service).


@router.post("/pairing-code", response_model=PairingCodeOut, dependencies=[Depends(require_admin_session)])
def issue_pairing_code(db: Session = Depends(get_db)):
    record = device_service.create_pairing_code(db)
    return PairingCodeOut(code=record.code, expires_at=record.expires_at)


@router.post("/claim", response_model=ClaimDeviceOut, status_code=status.HTTP_201_CREATED)
def claim_pairing_code(payload: ClaimDeviceIn, db: Session = Depends(get_db)):
    """Public by necessity — this is how an unrecognised browser gets its first token."""
    device = device_service.claim_pairing_code(db, payload.code, payload.label, payload.pin)
    return ClaimDeviceOut(device_token=device.device_token, label=device.label)


@router.get("", response_model=list[DeviceOut])
def list_devices(current_device: Device = Depends(require_admin_session), db: Session = Depends(get_db)):
    devices = []
    for device in device_service.list_devices(db):
        out = DeviceOut.model_validate(device)
        out.is_current = device.id == current_device.id
        out.has_own_pin = device.pin_hash is not None
        devices.append(out)
    return devices


@router.patch("/{device_id}", response_model=DeviceOut, dependencies=[Depends(require_admin_session)])
def update_device(device_id: uuid.UUID, payload: DeviceUpdate, db: Session = Depends(get_db)):
    device = device_service.update_device(db, device_id, payload.label, payload.is_active)
    if device is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")
    return device


@router.delete("/{device_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_device(
    device_id: uuid.UUID,
    current_device: Device = Depends(require_admin_session),
    db: Session = Depends(get_db),
):
    if not device_service.delete_device(db, device_id, current_device):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")
