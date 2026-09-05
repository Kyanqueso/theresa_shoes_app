import { apiFetch, apiUpload } from './apiClient.js'

/** Returns { items, total }. Filtering, search, sort and paging all happen server-side so a
 * page load fetches one page rather than the whole order history. */
export function listOrders({ companyId, status, search, completed, sort, limit, offset } = {}) {
  const params = new URLSearchParams()
  if (companyId) params.set('company_id', companyId)
  if (status) params.set('status', status)
  if (search) params.set('search', search)
  if (completed !== undefined && completed !== null) params.set('completed', String(completed))
  if (sort) params.set('sort', sort)
  if (limit) params.set('limit', String(limit))
  if (offset) params.set('offset', String(offset))
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
