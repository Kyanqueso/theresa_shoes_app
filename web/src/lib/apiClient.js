const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

const TOKEN_KEY = 'ts_admin_token'
const DEVICE_KEY = 'ts_device_token'

/** Build-time device token. This is the LEGACY mechanism: because Vite inlines VITE_* values
 * into the public bundle, every visitor downloads the same token, so the device allowlist
 * couldn't actually reject anyone. Devices now hold their own token in localStorage instead.
 *
 * It stays here only as a migration fallback so already-in-use browsers keep working until
 * they've paired. Remove the env var from Vercel once every real device shows up under
 * Admin -> Devices, and the allowlist becomes a genuine first factor. */
const LEGACY_DEVICE_ID = import.meta.env.VITE_DEVICE_ID ?? ''

export function getDeviceToken() {
  try {
    return localStorage.getItem(DEVICE_KEY) || LEGACY_DEVICE_ID
  } catch {
    // Private mode / blocked storage — fall back to the legacy value if there is one.
    return LEGACY_DEVICE_ID
  }
}

export function setDeviceToken(token) {
  localStorage.setItem(DEVICE_KEY, token)
}

export function clearDeviceToken() {
  localStorage.removeItem(DEVICE_KEY)
}

/** True when this browser has paired itself, as opposed to riding on the legacy bundle token. */
export function hasPairedDevice() {
  try {
    return Boolean(localStorage.getItem(DEVICE_KEY))
  } catch {
    return false
  }
}

export class ApiError extends Error {
  constructor(status, detail) {
    super(typeof detail === 'string' ? detail : `Request failed (${status})`)
    this.status = status
    this.detail = detail
  }
}

/** Pulls a displayable message out of a thrown error.
 * FastAPI validation errors (422) return `detail` as an array of objects, not a string —
 * rendering that straight into JSX would crash, so only ever use it when it's really a string.
 * Everything else (409 duplicate-name conflicts, 404s, ...) sends a plain string we can show. */
export function errorDetail(err, fallback) {
  return err instanceof ApiError && typeof err.detail === 'string' ? err.detail : fallback
}

export function getToken() {
  const token = localStorage.getItem(TOKEN_KEY)
  if (!token) return null

  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
    const payload = JSON.parse(atob(padded))
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      localStorage.removeItem(TOKEN_KEY)
      return null
    }
  } catch {
    localStorage.removeItem(TOKEN_KEY)
    return null
  }

  return token
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export function isAuthenticated() {
  return Boolean(getToken())
}

function authHeaders(skipAuth) {
  const headers = { 'X-Device-Id': getDeviceToken() }
  if (!skipAuth) {
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }
  return headers
}

async function handleResponse(res) {
  if (res.status === 204) return null

  let data = null
  const text = await res.text()
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }

  if (!res.ok) {
    throw new ApiError(res.status, data?.detail ?? data)
  }

  return data
}

export async function apiFetch(path, { method = 'GET', body, skipAuth = false } = {}) {
  const headers = authHeaders(skipAuth)
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  return handleResponse(res)
}

/** For multipart/form-data uploads — don't set Content-Type, the browser adds the boundary. */
export async function apiUpload(path, formData, { method = 'POST' } = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: authHeaders(false),
    body: formData,
  })

  return handleResponse(res)
}
