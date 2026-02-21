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
export declare function levenshtein(a: string, b: string): number;
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
export declare function fuzzyMatch(query: string, candidates: {
    key: string;
    value: string;
}[]): {
    match: string;
    distance: number;
} | null;
