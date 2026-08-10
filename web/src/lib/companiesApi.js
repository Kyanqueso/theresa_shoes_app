import { apiFetch } from './apiClient.js'

export function listCompanies() {
  return apiFetch('/companies', { skipAuth: true })
}

export function createCompany(payload) {
  return apiFetch('/companies', { method: 'POST', body: payload })
}

export function updateCompany(companyId, payload) {
  return apiFetch(`/companies/${companyId}`, { method: 'PATCH', body: payload })
}

export function deleteCompany(companyId) {
  return apiFetch(`/companies/${companyId}`, { method: 'DELETE' })
}
