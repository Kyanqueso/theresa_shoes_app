import { apiFetch, clearToken, isAuthenticated, setToken } from './apiClient.js'

export { isAuthenticated, clearToken as logout }

export function checkDevice() {
  return apiFetch('/auth/device-check', { skipAuth: true })
}

/** Non-raising version of checkDevice for gating UI entry points (Admin nav, Manage Collections). */
export async function isDeviceRecognized() {
  try {
    await checkDevice()
    return true
  } catch {
    return false
  }
}

export async function verifyPin(pin) {
  const { access_token } = await apiFetch('/auth/verify-pin', {
    method: 'POST',
    body: { pin },
    skipAuth: true,
  })
  setToken(access_token)
  return access_token
}

export function requestPinReset(email) {
  return apiFetch('/auth/forgot-pin/request', { method: 'POST', body: { email }, skipAuth: true })
}

export function verifyPinResetOtp(email, otp) {
  return apiFetch('/auth/forgot-pin/verify', { method: 'POST', body: { email, otp }, skipAuth: true })
}

export function confirmPinReset(resetToken, pin) {
  return apiFetch('/auth/forgot-pin/confirm', {
    method: 'POST',
    body: { reset_token: resetToken, pin },
    skipAuth: true,
  })
}

/** Changes the PIN of the device making the request. Other devices keep theirs. */
export function setDevicePin(currentPin, newPin) {
  return apiFetch('/auth/set-pin', {
    method: 'POST',
    body: { current_pin: currentPin, new_pin: newPin },
  })
}
