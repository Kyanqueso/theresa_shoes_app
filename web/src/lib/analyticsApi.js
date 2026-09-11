import { apiDownload, apiFetch } from './apiClient.js'

/** Headline figures, aggregated in Postgres.
 *
 * Computed server-side rather than in the browser because the numbers must cover every
 * order, and the list endpoints are capped at 100 rows a page — summing a single page would
 * quietly under-report the moment the shop passed a hundred orders.
 */
export function getAnalyticsOverview(year) {
  const query = year ? `?year=${year}` : ''
  return apiFetch(`/analytics/overview${query}`)
}

/** The full business report as an Excel workbook: Summary, Orders, Payments, Uncollected and
 * Companies tabs. Built on the server so it covers every order, not just the first page. */
export function downloadReport() {
  return apiDownload('/analytics/report')
}
