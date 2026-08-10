const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
const DEVICE_ID = import.meta.env.VITE_DEVICE_ID ?? ''

const TOKEN_KEY = 'ts_admin_token'

export class ApiError extends Error {
  constructor(status, detail) {
    super(typeof detail === 'string' ? detail : `Request failed (${status})`)
    this.status = status
    this.detail = detail
  }
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
  const headers = { 'X-Device-Id': DEVICE_ID }
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
