import { apiFetch } from './apiClient.js'

/** Returns { items, total } — see listOrders. */
export function listPayments({ companyId, search, archived, sort, limit, offset } = {}) {
  const params = new URLSearchParams()
  if (companyId) params.set('company_id', companyId)
  if (search) params.set('search', search)
  if (archived !== undefined && archived !== null) params.set('archived', String(archived))
  if (sort) params.set('sort', sort)
  if (limit) params.set('limit', String(limit))
  if (offset) params.set('offset', String(offset))
  const query = params.toString()
  return apiFetch(`/payments${query ? `?${query}` : ''}`)
}

export function updatePayment(paymentId, payload) {
  return apiFetch(`/payments/${paymentId}`, { method: 'PATCH', body: payload })
}
