---
agent:
  name: SmartIDResolver
  type: utility
  status: production
  version: "2.0"

component:
  source_files:
    - src/utils/notion-resolver.ts
    - src/utils/notion-url-parser.ts
    - src/utils/fuzzy.ts
    - src/errors/enhanced-errors.ts
  test_files:
    - test/utils/notion-url-parser.test.ts
  entry_point: resolveNotionId()

resolution:
  input_formats:
    - raw_hex_id          # 1fb79d4c71bb8032b722c82305b63a00
    - dashed_uuid         # 1fb79d4c-71bb-8032-b722-c82305b63a00
    - notion_url_bare     # https://notion.so/1fb79d4c71bb8032b722c82305b63a00
    - notion_url_slug     # https://notion.so/My-Page-1fb79d4c71bb8032b722c82305b63a00
    - notion_url_workspace # https://notion.so/workspace/Page-1fb79d4c71bb8032b722c82305b63a00
    - database_name       # "Tasks Database"
  output_format: 32_char_lowercase_hex
  pipeline:
    - url_extraction
    - id_validation
    - cache_lookup          # exact → alias → substring → fuzzy
    - api_search
    - smart_database_resolution

commands_covered:
  with_resolver:
    - db retrieve
    - db query
    - db update
    - db schema
    - page retrieve
    - page create
    - page update
    - page retrieve:property_item
    - block retrieve
    - block delete
    - block retrieve:children
    - block update
    - block append
  without_resolver:
    - user retrieve   # user IDs are not Notion resource IDs
    - search          # uses query string, not ID
---

# Smart ID Resolution

## Overview

The resolver (`src/utils/notion-resolver.ts`) converts any user input — raw IDs, Notion URLs, or database names — into a clean 32-character hex ID. Every resource command pipes its ID argument through `resolveNotionId()` before calling the Notion API.

## The Problem

Notion's API v5 exposes two database ID types that look identical but are not interchangeable:

| Field | Used For | Found In |
|-------|----------|----------|
| `data_source_id` | Database operations (query, retrieve, update) | Database objects from API |
| `database_id` | Reference only — cannot query databases | `page.parent.database_id` |

Users copy `database_id` from page responses and pass it to `db query`. Notion returns `object_not_found`. The resolver fixes this automatically.

## Resolution Pipeline

```
User Input
  │
  ├─ URL? ──────────► extractIdFromUrl() ──► strip query params ──► match last 32 hex chars
  │
  ├─ Raw ID? ───────► cleanRawId() ────────► remove dashes ──► validate 32 hex chars
  │
  └─ Name? ─────────► searchCache() ───────► exact ──► alias ──► substring ──► fuzzy
                        │
                        └─ miss ──► Notion API search
                              │
                              └─ database type? ──► trySmartDatabaseResolution()
                                                     │
                                                     ├─ try data_source_id ──► success
                                                     └─ 404 ──► search pages for database_id ──► extract data_source_id
```

### Key Implementation: `src/utils/notion-resolver.ts`

```typescript
// [src/utils/notion-resolver.ts] — 5-stage resolution
async function resolveNotionId(input: string, type: 'page' | 'database'): Promise<string> {
  // Stage 1: URL extraction
  // Stage 2: ID validation (32 hex chars)
  // Stage 3: Cache lookup (exact → alias → substring → fuzzy)
  // Stage 4: API search + smart database resolution
}
```

### Stage 3 Detail: Cache Lookup with Fuzzy Matching

The cache lookup in `searchCache()` runs four sub-stages in order, returning on the first hit:

1. **Exact title** — case-insensitive comparison against `titleNormalized`
2. **Alias** — checks all aliases generated during `notion-cli sync`
3. **Substring** — `titleNormalized.includes(query)` check
4. **Fuzzy** — Levenshtein distance against all titles and aliases

The fuzzy stage (`src/utils/fuzzy.ts`) uses a dynamic threshold: `max(2, floor(query.length / 4))`. Short queries (8 chars or less) allow up to 2 edits. Longer queries allow roughly 25% of their length in edits. The stage builds a flat candidate list from all database titles and aliases, then returns the single closest match within the threshold.

```typescript
// [src/utils/fuzzy.ts] — typo tolerance via Levenshtein distance
export function levenshtein(a: string, b: string): number { /* O(m*n) DP */ }
export function fuzzyMatch(query, candidates): { match, distance } | null { /* best match within threshold */ }
```

This means `"knowldge hub"` (1 edit) resolves to `"Knowledge Hub"` locally, without an API call.

## URL Parsing

The URL parser (`src/utils/notion-url-parser.ts`) extracts the 32-character hex ID from any Notion URL format.

### Supported Formats

```bash
# All resolve to: 1fb79d4c71bb8032b722c82305b63a00

notion-cli page retrieve "https://www.notion.so/1fb79d4c71bb8032b722c82305b63a00"
notion-cli page retrieve "https://www.notion.so/My-Page-Title-1fb79d4c71bb8032b722c82305b63a00"
notion-cli page retrieve "https://www.notion.so/workspace/My-Page-1fb79d4c71bb8032b722c82305b63a00"
notion-cli page retrieve "https://notion.so/1fb79d4c71bb8032b722c82305b63a00?v=abc123"
notion-cli page retrieve "1fb79d4c-71bb-8032-b722-c82305b63a00"
```

### Parsing Logic

1. Strip query parameters (`?v=...`) and hash fragments (`#section`)
2. Match the last 32 hex characters at the end of the path
3. Fallback: match a dashed UUID (`8-4-4-4-12` format) anywhere in the path
4. Normalize to lowercase 32-char hex string

## Command Coverage

| Command | Resolver | Smart DB Resolution | Notes |
|---------|----------|---------------------|-------|
| `db retrieve` | Yes | Yes | database_id auto-converts to data_source_id |
| `db query` | Yes | Yes | |
| `db update` | Yes | Yes | |
| `db schema` | Yes | Yes | |
| `page retrieve` | Yes | No | |
| `page create` | Yes | No | database ID arg |
| `page update` | Yes | No | |
| `page retrieve:property_item` | Yes | No | page_id only; property_id is a schema key |
| `block retrieve` | Yes | No | |
| `block delete` | Yes | No | |
| `block retrieve:children` | Yes | No | |
| `block update` | Yes | No | |
| `block append` | Yes | No | |
| `search` | n/a | n/a | Uses query string, not ID |
| `user retrieve` | No | No | User IDs are not page/database IDs |

## Error Codes and Recovery

| HTTP Status | Error | Primary Cause | Recovery Strategy | Retryable |
|-------------|-------|---------------|-------------------|-----------|
| 404 | `object_not_found` | Integration not shared with resource | Open page in Notion, "..." menu, "Add connections" | No |
| 404 | `object_not_found` | Wrong ID type (database_id vs data_source_id) | Resolver auto-converts; or use `notion-cli list` to find correct ID | No |
| 404 | `object_not_found` | Resource deleted or archived | Verify in Notion | No |
| 401 | `unauthorized` | Invalid or missing token | Run `notion-cli init <token>` | No |
| 429 | `rate_limited` | Too many API calls | Automatic retry with backoff | Yes |
| 400 | `validation_error` | Invalid ID format (not 32 hex chars) | Check URL or ID format | No |

### 404 Error Output

The CLI surfaces the most common cause first:

```json
{
  "code": "RESOURCE_NOT_FOUND",
  "resourceType": "page",
  "attemptedId": "1fb79d4c71bb8032b722c82305b63a00",
  "suggestions": [
    "The integration may not have access — open the page in Notion → \"...\" menu → \"Add connections\"",
    "The ID may be incorrect - verify it in Notion",
    "The resource may have been deleted or archived"
  ]
}
```

## Performance

- **Fast path**: Valid IDs resolve in 0ms (no API call)
- **Cache hit (exact/alias/substring)**: Name lookups resolve from local cache (~1ms)
- **Cache hit (fuzzy)**: Levenshtein scan over all titles + aliases (~1-5ms for typical workspace sizes)
- **Fallback path**: API search adds one request (~200-500ms)
- **Smart DB resolution**: Adds one additional search if database_id detected (~200-500ms)
- **Caching**: Resolved IDs are cached to avoid repeated lookups

## Limitations

1. **Empty databases**: Smart resolution requires at least one page in the database
2. **Search scope**: Searches first 100 pages (sufficient for single match)
3. **API permissions**: Integration needs workspace search access

## Executable Commands

### Test URL Parsing

```bash
# Build and run URL parser tests
npm run build
npm test -- --grep "notion-url-parser"
```

### Validate Resolution Works

```bash
# Test with a known page URL (replace with your page)
notion-cli page retrieve "https://www.notion.so/Your-Page-Title-<id>"

# Test with raw ID
notion-cli page retrieve <page_id>

# Test block commands accept URLs
notion-cli block retrieve "https://www.notion.so/Your-Page-<id>"
notion-cli block retrieve:children "https://www.notion.so/Your-Page-<id>"

# Test database smart resolution (use database_id from a page parent)
notion-cli db retrieve <database_id>
# Should show: "Info: Resolved database_id to data_source_id"
```

### Verify Command Help Loads

```bash
# All commands with resolver should load without errors
notion-cli page retrieve --help
notion-cli page retrieve:property_item --help
notion-cli block retrieve --help
notion-cli block delete --help
notion-cli block retrieve:children --help
notion-cli db retrieve --help
notion-cli db query --help
```

### Debug Resolution

```bash
# Enable debug logging to trace the resolution pipeline
export DEBUG=notion-cli:*
notion-cli page retrieve "https://www.notion.so/My-Page-<id>"
# Look for: resolution stage logs, cache hit/miss, API call details
```

## Changelog

### Unreleased
- Fuzzy matching stage added to `searchCache()` via Levenshtein distance (`src/utils/fuzzy.ts`)
- `list --filter` flag for fuzzy database filtering
- URL parser handles title-slug URLs (`notion.so/My-Page-abc123`)
- All block and page property commands now route through `resolveNotionId()`
- 404 error message reordered — "not shared" hint appears first

### v5.4.0
- Initial implementation of smart ID resolution
- Automatic database_id to data_source_id conversion
- Helpful user messaging
- Full test coverage

---

**Last Updated**: 2026-02-20
**Component Status**: Production
**Machine-Readable**: YAML frontmatter + JSON error schemas
**Source**: [`src/utils/notion-resolver.ts`](../../src/utils/notion-resolver.ts), [`src/utils/notion-url-parser.ts`](../../src/utils/notion-url-parser.ts), [`src/utils/fuzzy.ts`](../../src/utils/fuzzy.ts)

---

**Related Documentation:**
- [Fuzzy Search Guide](../user-guides/fuzzy-search.md) — How-to guide for typo-tolerant search and filtering
- [Database Commands](./db.md)
- [Page Commands](./page.md)
- [Authentication Setup](../user-guides/authentication-setup.md)
- [CHANGELOG](../../CHANGELOG.md)
