import { apiFetch } from './apiClient.js'

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
