import { apiFetch } from './apiClient.js'

export function listPayments({ companyId } = {}) {
  const query = companyId ? `?company_id=${companyId}` : ''
  return apiFetch(`/payments${query}`)
}

export function updatePayment(paymentId, payload) {
  return apiFetch(`/payments/${paymentId}`, { method: 'PATCH', body: payload })
}
