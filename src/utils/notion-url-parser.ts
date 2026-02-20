/**
 * Notion URL Parser
 *
 * Extracts clean Notion IDs from various input formats:
 * - Title-slug URLs: https://www.notion.so/My-Page-Title-1fb79d4c71bb8032b722c82305b63a00
 * - Workspace URLs: https://www.notion.so/workspace/Page-Title-1fb79d4c71bb8032b722c82305b63a00
 * - Bare ID URLs: https://www.notion.so/1fb79d4c71bb8032b722c82305b63a00?v=...
 * - Short URLs: notion.so/1fb79d4c71bb8032b722c82305b63a00
 * - Raw IDs with dashes: 1fb79d4c-71bb-8032-b722-c82305b63a00
 * - Raw IDs without dashes: 1fb79d4c71bb8032b722c82305b63a00
 */

/**
 * Extract Notion ID from URL or raw ID
 *
 * @param input - Full Notion URL, partial URL, or raw ID
 * @returns Clean Notion ID (32 hex characters without dashes)
 * @throws Error if input is invalid
 *
 * @example
 * // URL with page title slug (most common format)
 * extractNotionId('https://www.notion.so/My-Page-1fb79d4c71bb8032b722c82305b63a00')
 * // Returns: '1fb79d4c71bb8032b722c82305b63a00'
 *
 * @example
 * // Bare ID URL
 * extractNotionId('https://www.notion.so/1fb79d4c71bb8032b722c82305b63a00?v=...')
 * // Returns: '1fb79d4c71bb8032b722c82305b63a00'
 *
 * @example
 * // Raw ID with dashes
 * extractNotionId('1fb79d4c-71bb-8032-b722-c82305b63a00')
 * // Returns: '1fb79d4c71bb8032b722c82305b63a00'
 */
export function extractNotionId(input: string): string {
  if (!input || typeof input !== 'string') {
    throw new Error('Input must be a non-empty string')
  }

  const trimmed = input.trim()

  // Check if it's a URL (contains notion.so or http)
  if (trimmed.includes('notion.so') || trimmed.includes('http')) {
    return extractIdFromUrl(trimmed)
  }

  // Not a URL, treat as raw ID
  return cleanRawId(trimmed)
}

/**
 * Extract ID from Notion URL
 */
function extractIdFromUrl(url: string): string {
  // Notion URL formats (the ID is always the last 32 hex chars in the path):
  // https://www.notion.so/1fb79d4c71bb8032b722c82305b63a00
  // https://www.notion.so/1fb79d4c71bb8032b722c82305b63a00?v=view_id
  // https://www.notion.so/My-Page-Title-1fb79d4c71bb8032b722c82305b63a00
  // https://www.notion.so/workspace/Page-Title-1fb79d4c71bb8032b722c82305b63a00

  // Strip query params and hash before matching
  const pathOnly = url.split(/[?#]/)[0]

  // Extract the last 32 hex characters from the URL path.
  // Notion always appends the ID at the end of the slug (after the last dash).
  const match = pathOnly.match(/([a-f0-9]{32})$/i)

  if (match) {
    return match[1].toLowerCase()
  }

  // Fallback: try matching a dashed UUID anywhere in the path
  const dashedMatch = pathOnly.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i)

  if (dashedMatch) {
    return cleanRawId(dashedMatch[1])
  }

  throw new Error(
    `Could not extract Notion ID from URL: ${url}\n\n` +
    `Expected format: https://www.notion.so/Page-Title-{id}\n` +
    `Example: https://www.notion.so/My-Page-1fb79d4c71bb8032b722c82305b63a00`
  )
}

/**
 * Clean raw ID by removing dashes and validating format
 */
function cleanRawId(id: string): string {
  // Remove all dashes
  const cleaned = id.replace(/-/g, '')

  // Validate: must be exactly 32 hex characters
  if (!/^[a-f0-9]{32}$/i.test(cleaned)) {
    throw new Error(
      `Invalid Notion ID format: ${id}\n\n` +
      `Expected: 32 hexadecimal characters (with or without dashes)\n` +
      `Example: 1fb79d4c71bb8032b722c82305b63a00\n` +
      `Example: 1fb79d4c-71bb-8032-b722-c82305b63a00`
    )
  }

  return cleaned.toLowerCase()
}

/**
 * Check if a string looks like a Notion URL
 *
 * @param input - String to check
 * @returns True if input appears to be a Notion URL
 */
export function isNotionUrl(input: string): boolean {
  if (!input || typeof input !== 'string') {
    return false
  }

  return input.includes('notion.so')
}

/**
 * Check if a string looks like a valid Notion ID
 *
 * @param input - String to check
 * @returns True if input appears to be a valid Notion ID
 */
export function isValidNotionId(input: string): boolean {
  if (!input || typeof input !== 'string') {
    return false
  }

  try {
    extractNotionId(input)
    return true
  } catch {
    return false
  }
}
