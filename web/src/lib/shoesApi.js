import { apiFetch, apiUpload } from './apiClient.js'

export function listShoes({ includeHidden = false } = {}) {
  const query = includeHidden ? '?include_hidden=true' : ''
  return apiFetch(`/shoes${query}`, { skipAuth: !includeHidden })
}

export function getShoe(shoeId) {
  return apiFetch(`/shoes/${shoeId}`, { skipAuth: true })
}

export function createShoe(payload) {
  return apiFetch('/shoes', { method: 'POST', body: payload })
}

export function updateShoe(shoeId, payload) {
  return apiFetch(`/shoes/${shoeId}`, { method: 'PATCH', body: payload })
}

export function deleteShoe(shoeId) {
  return apiFetch(`/shoes/${shoeId}`, { method: 'DELETE' })
}

export function uploadShoeImage(shoeId, file, sortOrder = 0) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('sort_order', String(sortOrder))
  return apiUpload(`/shoes/${shoeId}/images`, formData)
}

export function updateShoeImage(shoeId, imageId, sortOrder) {
  return apiFetch(`/shoes/${shoeId}/images/${imageId}`, { method: 'PATCH', body: { sort_order: sortOrder } })
}

export function deleteShoeImage(shoeId, imageId) {
  return apiFetch(`/shoes/${shoeId}/images/${imageId}`, { method: 'DELETE' })
}
