import { apiFetch, apiUpload } from './apiClient.js'

export function listOrders({ companyId, status } = {}) {
  const params = new URLSearchParams()
  if (companyId) params.set('company_id', companyId)
  if (status) params.set('status', status)
  const query = params.toString()
  return apiFetch(`/orders${query ? `?${query}` : ''}`)
}

export function createOrder(payload) {
  return apiFetch('/orders', { method: 'POST', body: payload, skipAuth: true })
}

export function updateOrder(orderId, payload) {
  return apiFetch(`/orders/${orderId}`, { method: 'PATCH', body: payload })
}

export function deleteOrder(orderId) {
  return apiFetch(`/orders/${orderId}`, { method: 'DELETE' })
}

export function uploadNotesImage(file) {
  const formData = new FormData()
  formData.append('file', file)
  return apiUpload('/orders/notes-image', formData)
}
