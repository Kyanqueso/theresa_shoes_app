import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class PinVerifyRequest(BaseModel):
    pin: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class DeviceCheckResponse(BaseModel):
    is_valid: bool


class ForgotPinRequestIn(BaseModel):
    email: EmailStr


class ForgotPinVerifyIn(BaseModel):
    email: EmailStr
    otp: str


class ForgotPinVerifyOut(BaseModel):
    reset_token: str


class ForgotPinConfirmIn(BaseModel):
    reset_token: str
    pin: str


class MessageResponse(BaseModel):
    message: str


class PairingCodeOut(BaseModel):
    code: str
    expires_at: datetime


class ClaimDeviceIn(BaseModel):
    code: str
    # Shown in the admin device list so the owner can tell one device from another.
    label: str | None = Field(default=None, max_length=50)


class ClaimDeviceOut(BaseModel):
    """The token here is what the new browser stores; it is never issued again."""

    device_token: str
    label: str | None = None


class DeviceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    label: str | None = None
    is_active: bool
    created_at: datetime
    last_seen_at: datetime | None = None
    # Set by the router, not the DB. device_token is deliberately never serialized — handing
    # every device's token to the browser would let anyone with an admin session collect them
    # and impersonate those devices, so the server flags the current one instead.
    is_current: bool = False


class DeviceUpdate(BaseModel):
    label: str | None = Field(default=None, max_length=50)
    is_active: bool | None = None
