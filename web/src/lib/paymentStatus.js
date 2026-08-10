// A payment/delivery record can be unpaid, undelivered, both, or neither — and each needs
// a visually distinct, non-ambiguous treatment (a single "something's wrong" color hides which problem it is).
export function paymentFulfillment(isPaid, isDelivered) {
  if (isPaid && isDelivered) return 'fulfilled'
  if (!isPaid && !isDelivered) return 'unpaidUndelivered'
  if (!isPaid) return 'unpaid'
  return 'undelivered'
}

export const PAYMENT_STATUS = {
  fulfilled: { label: 'Fulfilled', dot: 'bg-success', badge: 'bg-success/20 text-success', row: 'bg-success/25' },
  unpaid: { label: 'Unpaid', dot: 'bg-orange-500', badge: 'bg-orange-100 text-orange-700', row: 'bg-orange-200/70' },
  undelivered: { label: 'Undelivered', dot: 'bg-blue-500', badge: 'bg-blue-100 text-blue-700', row: 'bg-blue-200/70' },
  unpaidUndelivered: { label: 'Unpaid & Undelivered', dot: 'border border-gray-400 bg-white', badge: 'border border-gray-300 bg-white text-gray-700', row: 'bg-white' },
}
