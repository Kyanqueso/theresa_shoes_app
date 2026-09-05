// Real Viber number for the shop owner.
// Shared by the Contact page's "Contact Us in Viber" button and the order-success
// overlay's "Owner's Viber" share option.
export const OWNER_VIBER_NUMBER = '+639225978596'

/** Digits only, no "+". Viber's chat deep link matches on this form.
 *
 * Passing the E.164 number through encodeURIComponent turns "+" into "%2B", which Viber
 * does not decode back before looking the number up — so it finds nothing and falls back to
 * showing the contact picker. Sending a bare "+" is no better: in a query string it decodes
 * to a space. Digits alone avoid both. */
export const OWNER_VIBER_DIGITS = OWNER_VIBER_NUMBER.replace(/\D/g, '')

/** Deep link that opens a chat with the shop owner. */
export const ownerViberChatUrl = () => `viber://chat?number=${OWNER_VIBER_DIGITS}`

/** Converts a locally-entered Philippine mobile number into the digits Viber matches on.
 *
 * The order form stores numbers as "09XXXXXXXXX" (see PhoneNumberInput). Viber looks numbers
 * up in international form, so the leading 0 becomes the 63 country code. Returns null when
 * the number isn't a plausible PH mobile, so callers can hide the option rather than open a
 * link that will silently fail.
 */
export function toViberDigits(localNumber) {
  const digits = (localNumber ?? '').replace(/\D/g, '')
  if (/^09\d{9}$/.test(digits)) return `63${digits.slice(1)}`
  if (/^639\d{9}$/.test(digits)) return digits
  return null
}

/** Deep link that opens a chat with an arbitrary number. */
export const viberChatUrl = (digits) => `viber://chat?number=${digits}`

/** Hands off to Viber for a given number.
 *
 * Plain navigation, deliberately — not window.open and not a hidden iframe. Both of those
 * create something the browser can tear down: a hidden iframe removed on a timer cancels the
 * OS handoff if Viber is still cold-starting, which is why the first tap used to bounce
 * straight back to the site and only the second (with Viber now warm) worked. Assigning
 * location.href from a click hands the URL to the OS and leaves nothing to cancel.
 *
 * If no handler is registered the browser simply stays put, so callers that want to react to
 * that should watch for the page being hidden rather than expecting this to throw.
 */
export function openViberChat(digits) {
  window.location.href = viberChatUrl(digits)
}
