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
