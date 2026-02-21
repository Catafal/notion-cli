/**
 * Fuzzy matching utilities for typo-tolerant name resolution.
 *
 * Uses Levenshtein distance (edit distance) to find the closest match
 * when exact/substring lookups fail. No external dependencies — the
 * algorithm is ~20 lines of classic dynamic programming.
 */

/**
 * Levenshtein distance — minimum single-char edits (insert, delete, replace)
 * to transform string `a` into string `b`.
 *
 * Classic DP approach, O(m*n) time and O(min(m,n)) space.
 * Both inputs should be pre-normalized (lowercased/trimmed) by the caller.
 */
export function levenshtein(a: string, b: string): number {
  // Optimization: ensure `a` is the shorter string so we use less memory
  if (a.length > b.length) [a, b] = [b, a]

  const m = a.length
  const n = b.length

  // Single row of the DP matrix (+ previous value), reused per iteration
  let prev = Array.from({ length: m + 1 }, (_, i) => i)

  for (let j = 1; j <= n; j++) {
    const curr = [j] // first column = number of insertions
    for (let i = 1; i <= m; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[i] = Math.min(
        curr[i - 1] + 1,     // insert
        prev[i] + 1,         // delete
        prev[i - 1] + cost,  // replace (or match)
      )
    }
    prev = curr
  }

  return prev[m]
}

/**
 * Find the best fuzzy match from a list of candidates.
 *
 * Returns the candidate with the lowest Levenshtein distance,
 * but ONLY if the distance is within a dynamic threshold:
 *   threshold = max(2, floor(query.length / 4))
 *
 * - Short names (≤8 chars): allows up to 2 typos
 * - Longer names: ~25% of query length
 *
 * @param query - Normalized search query (lowercase, trimmed)
 * @param candidates - Array of { key: unique ID, value: normalized name }
 * @returns Best match { match: key, distance } or null if nothing is close enough
 */
export function fuzzyMatch(
  query: string,
  candidates: { key: string; value: string }[],
): { match: string; distance: number } | null {
  const threshold = Math.max(2, Math.floor(query.length / 4))

  let bestKey: string | null = null
  let bestDist = threshold + 1 // start above threshold so first valid match wins

  for (const { key, value } of candidates) {
    const dist = levenshtein(query, value)
    if (dist < bestDist) {
      bestDist = dist
      bestKey = key
    }
  }

  // Only return if we found something within the allowed threshold
  if (bestKey !== null && bestDist <= threshold) {
    return { match: bestKey, distance: bestDist }
  }

  return null
}
