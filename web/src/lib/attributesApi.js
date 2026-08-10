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

export function deleteAttributeOption(optionId) {
  return apiFetch(`/attributes/${optionId}`, { method: 'DELETE' })
}

export function uploadAttributeImage(optionId, file) {
  const formData = new FormData()
  formData.append('file', file)
  return apiUpload(`/attributes/${optionId}/image`, formData)
}
