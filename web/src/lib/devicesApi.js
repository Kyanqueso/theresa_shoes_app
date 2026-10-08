import { apiFetch, setDeviceToken } from './apiClient.js'

/** Admin-only: mint a fresh pairing code to read out to the device being added. */
export function issuePairingCode() {
  return apiFetch('/auth/devices/pairing-code', { method: 'POST' })
}

/** Whether the shop has a pairing code live right now.
 *
 * Public — asked by browsers that have no token yet, to decide whether to offer the pairing
 * keypad at all. Never raises: anything other than a clear "yes" is treated as "no code to
 * type", which shows the "ask the shop" screen rather than a keypad. */
export async function isPairingOpen() {
  try {
    const { is_open: isOpen } = await apiFetch('/auth/devices/pairing-open', { skipAuth: true })
    return Boolean(isOpen)
  } catch {
    return false
  }
}

/** Redeems a code and stores the returned token for this browser.
 * skipAuth because a device being paired has no token or session yet — this is the one
 * call that has to work from an unrecognised browser. */
export async function claimPairingCode(code, label, pin) {
  const result = await apiFetch('/auth/devices/claim', {
    method: 'POST',
    body: { code: code.trim(), label: label?.trim() || null, pin },
    skipAuth: true,
  })
  setDeviceToken(result.device_token)
  return result
}

export function listDevices() {
  return apiFetch('/auth/devices')
}

export function updateDevice(deviceId, payload) {
  return apiFetch(`/auth/devices/${deviceId}`, { method: 'PATCH', body: payload })
}

export function deleteDevice(deviceId) {
  return apiFetch(`/auth/devices/${deviceId}`, { method: 'DELETE' })
}
