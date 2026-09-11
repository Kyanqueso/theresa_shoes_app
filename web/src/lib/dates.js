/** Calendar-date helpers, all in shop-local time (UTC+8).
 *
 * Dates travel as 'YYYY-MM-DD' strings and are never pushed through new Date() for display:
 * that parses them as UTC midnight, which can shift to the previous day on screen. Kept apart
 * from DatePicker.jsx so that file exports only its component (a React Fast Refresh rule).
 */

// Records go back to 1998; the API rejects anything earlier (see api/app/config/timezone.py).
export const EARLIEST_DATE = '1998-01-01'

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September',
  'October', 'November', 'December']
export const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

const pad = (n) => String(n).padStart(2, '0')
export const toIso = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`

/** Today in shop-local time (UTC+8), not whatever timezone the device happens to be set to. */
export function todayIso() {
  const shifted = new Date(Date.now() + 8 * 60 * 60 * 1000)
  return toIso(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate())
}

/** Splits 'YYYY-MM-DD' by hand. new Date('2026-09-05') parses as UTC midnight and can land on
 * the previous day once converted to local time, which is exactly the bug a date picker
 * must not have. */
export function parseIso(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '')
  if (!match) return null
  return { year: Number(match[1]), month: Number(match[2]) - 1, day: Number(match[3]) }
}

/** The calendar day a stored timestamp falls on, in shop-local time (UTC+8). An order saved
 * at 23:30 Manila is 15:30 UTC — reading its date in UTC would show the right day, but one
 * saved at 07:00 Manila is 23:00 UTC the *previous* day. */
export function toBusinessIsoDate(timestamp) {
  if (!timestamp) return ''
  const shifted = new Date(new Date(timestamp).getTime() + 8 * 60 * 60 * 1000)
  return toIso(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate())
}

export function formatIsoDate(iso) {
  const parts = parseIso(iso)
  if (!parts) return ''
  return `${MONTHS[parts.month].slice(0, 3)} ${parts.day}, ${parts.year}`
}
