# `notion-cli batch`

Batch operations for working with multiple Notion resources at once. All batch commands run requests in parallel and accept Notion URLs, database names, or raw IDs.

## Commands

- [`notion-cli batch retrieve [IDS]`](#batch-retrieve) — Fetch multiple pages, blocks, or databases
- [`notion-cli batch delete [IDS]`](#batch-delete) — Delete multiple blocks

---

## `batch retrieve`

Fetch multiple pages, blocks, or data sources in a single command. Each ID is resolved through the standard pipeline (URL extraction, cache lookup, API search) before calling the Notion API. All requests run in parallel.

**Alias:** `batch:r`

### Usage

```
notion-cli batch retrieve [IDS] [FLAGS]
```

### Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `IDS` | No | Comma-separated list of IDs, URLs, or names |

If no positional argument is given, the command checks `--ids` flag, then stdin.

### Flags

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--ids` | | | Comma-separated list of IDs to retrieve |
| `--type` | | `page` | Resource type: `page`, `block`, or `database` |
| `--json` | `-j` | | Output as JSON with metadata (total, succeeded, failed) |
| `--compact-json` | `-c` | | Output as single-line JSON (ideal for piping) |
| `--raw` | `-r` | | Output full API response for each resource |
| `--markdown` | `-m` | | Output as GitHub-flavored markdown table |
| `--pretty` | `-P` | | Output as table with borders |
| `--verbose` | `-v` | | Show resolver and cache debug info on stderr |
| `--minimal` | | | Strip metadata fields (~40% smaller responses) |
| `--no-cache` | | | Bypass cache, force fresh API calls |
| `--retry` | | | Auto-retry on rate limit (respects Retry-After) |
| `--timeout` | | `30000` | Request timeout in milliseconds |

### Input Methods

There are three ways to pass IDs to batch retrieve:

**1. Positional argument** — comma-separated on the command line:

```bash
notion-cli batch retrieve "ID1,ID2,ID3"
```

**2. `--ids` flag** — same format, explicit flag:

```bash
notion-cli batch retrieve --ids "ID1,ID2,ID3"
```

**3. stdin** — one ID per line, piped from a file or another command:

```bash
cat page_ids.txt | notion-cli batch retrieve --json
```

All three methods accept any input format the resolver understands: raw hex IDs, dashed UUIDs, full Notion URLs (including title-slug URLs), and cached database names.

### ID Resolution

Every ID passes through `resolveNotionId()` before the API call. This means batch retrieve accepts:

- Raw IDs: `2fc3826d337780419021c0097da10f33`
- Dashed UUIDs: `2fc3826d-3377-8041-9021-c0097da10f33`
- Title-slug URLs: `https://notion.so/My-Page-2fc3826d337780419021c0097da10f33`
- URLs with query params: `https://notion.so/Page-abc123?source=copy_link`
- Database names (from cache): `"Tasks Database"`

You can mix formats in the same command:

```bash
notion-cli batch retrieve --ids "https://notion.so/Page-abc123,2fc3826d337780419021c0097da10f33"
```

### Output Formats

**Table (default)** — shows id, status, type, and title:

```
┌──────────────────────────────────────┬─────────┬──────┬─────────────────────────┐
│ id                                   │ status  │ type │ title                   │
├──────────────────────────────────────┼─────────┼──────┼─────────────────────────┤
│ 2fc3826d337780419021c0097da10f33     │ success │ page │ agentic engineering 101 │
├──────────────────────────────────────┼─────────┼──────┼─────────────────────────┤
│ aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa     │ failed  │ page │ Page not found          │
└──────────────────────────────────────┴─────────┴──────┴─────────────────────────┘

Total: 2 | Succeeded: 1 | Failed: 1
```

**JSON (`--json`)** — structured envelope with metadata:

```json
{
  "success": true,
  "total": 2,
  "succeeded": 1,
  "failed": 1,
  "results": [
    { "id": "...", "success": true, "data": { ... } },
    { "id": "...", "success": false, "error": "OBJECT_NOT_FOUND", "message": "Page not found" }
  ],
  "timestamp": "2026-02-20T20:15:00.000Z"
}
```

### Exit Codes

| Code | Meaning |
|------|---------|
| `0` | All resources retrieved successfully |
| `1` | One or more resources failed (partial or total failure) |

### Error Handling

Each resource is fetched independently. If one ID fails (wrong ID, no access, deleted), the others still succeed. The results array shows the status of each individual request. Failed items include the error code and a human-readable message.

### Examples

```bash
# Retrieve 3 pages, output as JSON
notion-cli batch retrieve --ids "ID1,ID2,ID3" --json

# Retrieve blocks
notion-cli batch retrieve --ids "BLOCK1,BLOCK2" --type block

# Retrieve databases by name
notion-cli batch retrieve --ids "Tasks,Projects" --type database

# Pipe IDs from a file
cat page_ids.txt | notion-cli batch retrieve --compact-json

# Mix URLs and raw IDs
notion-cli batch retrieve --ids "https://notion.so/Page-abc123,def456789012345678901234567890ab"

# Raw output for AI assistants
notion-cli batch retrieve --ids "ID1,ID2" -r
```

---

## `batch delete`

Delete multiple blocks in a single command. Each ID is resolved through the standard pipeline before calling the Notion API. All deletions run in parallel. Deleted blocks are moved to Notion's trash (soft delete — recoverable from Notion's UI).

**Alias:** `batch:d`

### Usage

```
notion-cli batch delete [IDS] [FLAGS]
```

### Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `IDS` | No | Comma-separated list of block IDs, URLs, or names |

If no positional argument is given, the command checks `--ids` flag, then stdin.

### Flags

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--ids` | | | Comma-separated list of block IDs to delete |
| `--json` | `-j` | | Output as JSON with metadata (total, deleted, failed) |
| `--compact-json` | `-c` | | Output as single-line JSON |
| `--raw` | `-r` | | Output full API response for each deletion |
| `--markdown` | `-m` | | Output as GitHub-flavored markdown table |
| `--pretty` | `-P` | | Output as table with borders |
| `--verbose` | `-v` | | Show resolver and cache debug info on stderr |
| `--minimal` | | | Strip metadata fields |
| `--no-cache` | | | Bypass cache, force fresh API calls |
| `--retry` | | | Auto-retry on rate limit |
| `--timeout` | | `30000` | Request timeout in milliseconds |

### Input Methods

Same three methods as `batch retrieve`:

```bash
# Positional argument
notion-cli batch delete "BLOCK_ID_1,BLOCK_ID_2"

# --ids flag
notion-cli batch delete --ids "BLOCK_ID_1,BLOCK_ID_2"

# stdin
cat block_ids.txt | notion-cli batch delete --json
```

### ID Resolution

Same as `batch retrieve` — accepts raw IDs, dashed UUIDs, and full Notion URLs. Database names are not applicable since `batch delete` only operates on blocks.

### Output Formats

**Table (default)** — shows id, status, and content preview:

```
┌──────────────────────────────────────┬─────────┬──────────────────────────┐
│ id                                   │ status  │ content                  │
├──────────────────────────────────────┼─────────┼──────────────────────────┤
│ e70675e2b1e242da9cab76bde07fac6b     │ deleted │ Standard Operating Proc… │
├──────────────────────────────────────┼─────────┼──────────────────────────┤
│ aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa     │ failed  │ Block not found          │
└──────────────────────────────────────┴─────────┴──────────────────────────┘

Total: 2 | Deleted: 1 | Failed: 1
```

**JSON (`--json`)** — same envelope structure as batch retrieve:

```json
{
  "success": true,
  "total": 2,
  "succeeded": 1,
  "failed": 1,
  "results": [
    { "id": "...", "success": true, "data": { ... } },
    { "id": "...", "success": false, "error": "OBJECT_NOT_FOUND", "message": "Block not found" }
  ],
  "timestamp": "2026-02-20T20:20:00.000Z"
}
```

### Exit Codes

| Code | Meaning |
|------|---------|
| `0` | All blocks deleted successfully |
| `1` | One or more deletions failed |

### Error Handling

Same as batch retrieve: each deletion is independent. If one block fails, the rest still proceed. Common failure causes:

- **OBJECT_NOT_FOUND** — block doesn't exist or integration lacks access
- **VALIDATION_ERROR** — invalid ID format
- **UNAUTHORIZED** — token is missing or invalid

### Examples

```bash
# Delete 3 blocks, output as JSON
notion-cli batch delete --ids "BLOCK1,BLOCK2,BLOCK3" --json

# Delete from a file of block IDs
cat blocks_to_delete.txt | notion-cli batch delete --json

# Delete using Notion URLs
notion-cli batch delete --ids "https://notion.so/Page-abc123"

# Compact output for scripting
notion-cli batch delete --ids "ID1,ID2" --compact-json
```

---

## Source Files

| File | Purpose |
|------|---------|
| [`src/commands/batch/retrieve.ts`](../src/commands/batch/retrieve.ts) | Batch retrieve command |
| [`src/commands/batch/delete.ts`](../src/commands/batch/delete.ts) | Batch delete command |
| [`src/utils/notion-resolver.ts`](../src/utils/notion-resolver.ts) | ID resolution pipeline used by both commands |

## Related Documentation

- **[Smart ID Resolution](architecture/smart-id-resolution.md)** — How URLs and names are resolved to Notion IDs
- **[Output Formats](user-guides/output-formats.md)** — All output format options
- **[Error Handling](user-guides/error-handling-examples.md)** — Understanding error codes and recovery
- **[Batch Operations Guide](user-guides/batch-operations.md)** — Practical workflows and recipes
