/** How an order is referred to everywhere a person reads it: ORDER-001.
 *
 * The number itself comes from the server (a Postgres sequence), so it never changes and is
 * never reused. Padded to three digits for tidy columns; ORDER-1000 simply grows a digit.
 * Payments show their order's number — the two are one record, not two.
 */
export function formatOrderNumber(orderNumber) {
  if (orderNumber === null || orderNumber === undefined) return '—'
  return `ORDER-${String(orderNumber).padStart(3, '0')}`
}
