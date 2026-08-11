function normalize(name) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function levenshteinDistance(a, b) {
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0))
  for (let i = 0; i <= a.length; i++) dp[i][0] = i
  for (let j = 0; j <= b.length; j++) dp[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[a.length][b.length]
}

const SIMILARITY_THRESHOLD = 0.75

/** Finds the closest existing company that resembles `name` without being an exact
 * (case-insensitive) match - catches likely typos like "Jolibee Corp" vs "Jollibee Corp".
 * Returns null when there's an exact match (nothing to warn about) or nothing close enough. */
export function findCloseMatchingCompany(name, companies) {
  const target = normalize(name)
  if (!target) return null

  let best = null
  let bestScore = 0
  for (const company of companies) {
    const candidate = normalize(company.name)
    if (!candidate) continue
    if (candidate === target) return null
    const distance = levenshteinDistance(target, candidate)
    const score = 1 - distance / Math.max(target.length, candidate.length)
    if (score >= SIMILARITY_THRESHOLD && score > bestScore) {
      best = company
      bestScore = score
    }
  }
  return best
}
