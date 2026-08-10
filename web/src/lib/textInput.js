// Strips emoji (and their joiners/variation selectors) and truncates to maxLength.
// Used as a live onChange filter on guest-facing text inputs.
const EMOJI_PATTERN = new RegExp('[\\p{Extended_Pictographic}\\p{Emoji_Modifier}\\u200D\\uFE0F]', 'gu')

export function sanitizeText(value, maxLength = 50) {
  return value.replace(EMOJI_PATTERN, '').slice(0, maxLength)
}
