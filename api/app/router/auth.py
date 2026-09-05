from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.config.auth import require_valid_device
from app.db.base import get_db
from app.db.models import Device
from app.config.auth import require_admin_session
from app.schema.auth import (
    DeviceCheckResponse,
    ForgotPinConfirmIn,
    ForgotPinRequestIn,
    ForgotPinVerifyIn,
    ForgotPinVerifyOut,
    MessageResponse,
    PinVerifyRequest,
    SetPinIn,
    TokenResponse,
)
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/device-check", response_model=DeviceCheckResponse)
def device_check(device: Device = Depends(require_valid_device)):
    """Frontend calls this before showing the PIN pad. A 403 here sends the user to /403."""
    return DeviceCheckResponse(is_valid=True)


@router.post("/verify-pin", response_model=TokenResponse)
def verify_pin(
    payload: PinVerifyRequest,
    device: Device = Depends(require_valid_device),
    db: Session = Depends(get_db),
):
    token = auth_service.verify_admin_pin(db, device, payload.pin)
    if token is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect PIN")
    return TokenResponse(access_token=token)


@router.post("/forgot-pin/request", response_model=MessageResponse)
def forgot_pin_request(payload: ForgotPinRequestIn, device: Device = Depends(require_valid_device)):
    outcome = auth_service.request_pin_reset(payload.email)
    if outcome == "email_mismatch":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email not recognized.")
    if outcome == "send_failed":
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Could not send the code right now. Please wait a moment and try again.",
        )
    return MessageResponse(message="Verification code sent.")


@router.post("/forgot-pin/verify", response_model=ForgotPinVerifyOut)
def forgot_pin_verify(payload: ForgotPinVerifyIn, device: Device = Depends(require_valid_device)):
    reset_token = auth_service.verify_pin_reset_otp(payload.email, payload.otp)
    if reset_token is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="OTP has expired or is invalid. Please try again."
        )
    return ForgotPinVerifyOut(reset_token=reset_token)


@router.post("/forgot-pin/confirm", response_model=MessageResponse)
def forgot_pin_confirm(
    payload: ForgotPinConfirmIn,
    device: Device = Depends(require_valid_device),
    db: Session = Depends(get_db),
):
    """Resets the PIN of the device making the request — not every device."""
    auth_service.confirm_pin_reset(db, device, payload.reset_token, payload.pin)
    return MessageResponse(message="PIN updated for this device.")


@router.post("/set-pin", response_model=MessageResponse)
def set_pin(
    payload: SetPinIn,
    device: Device = Depends(require_admin_session),
    db: Session = Depends(get_db),
):
    """Changes this device's PIN while signed in. The current PIN is re-checked even though
    a valid session is already present, so someone who walks up to an unlocked screen can't
    silently take the device over."""
    if auth_service.verify_admin_pin(db, device, payload.current_pin) is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Current PIN is incorrect.")
    auth_service.set_device_pin(db, device, payload.new_pin)
    return MessageResponse(message="PIN updated for this device.")
