import { apiFetch, apiUpload } from './apiClient.js'

export function listAttributeOptions(category) {
  const query = category ? `?category=${encodeURIComponent(category)}` : ''
  return apiFetch(`/attributes${query}`, { skipAuth: true })
}

export function createAttributeOption(payload) {
  return apiFetch('/attributes', { method: 'POST', body: payload })
}

export function updateAttributeOption(optionId, payload) {
  return apiFetch(`/attributes/${optionId}`, { method: 'PATCH', body: payload })
}

// Public — no admin session needed. Only toggles is_active (used by the guest-facing
// drag-to-toggle Available/Unavailable swatch pickers).
export function setAttributeAvailability(optionId, isActive) {
  return apiFetch(`/attributes/${optionId}/availability`, {
    method: 'PATCH',
    body: { is_active: isActive },
    skipAuth: true,
  })
}

export function deleteAttributeOption(optionId) {
  return apiFetch(`/attributes/${optionId}`, { method: 'DELETE' })
}

export function uploadAttributeImage(optionId, file) {
  const formData = new FormData()
  formData.append('file', file)
  return apiUpload(`/attributes/${optionId}/image`, formData)
}
