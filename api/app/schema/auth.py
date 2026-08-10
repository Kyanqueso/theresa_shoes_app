from pydantic import BaseModel, EmailStr


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
