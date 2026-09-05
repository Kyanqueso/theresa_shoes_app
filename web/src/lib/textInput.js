// Strips emoji (and their joiners/variation selectors) and truncates to maxLength.
// Used as a live onChange filter on guest-facing text inputs. The 50-char default suits
// names and codes; longer fields (order notes) pass their own limit.
// Alternation rather than one character class: mixing property escapes with lone
// surrogates in a class is flagged as misleading, because a class matches single code
// units while \p{...} matches whole code points.
const EMOJI_PATTERN = new RegExp(
  '\\p{Extended_Pictographic}|\\p{Emoji_Modifier}|\\u200D|\\uFE0F',
  'gu',
)

export function sanitizeText(value, maxLength = 50) {
  return value.replace(EMOJI_PATTERN, '').slice(0, maxLength)
}
