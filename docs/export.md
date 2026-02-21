# `notion-cli page export`

Export a Notion page to markdown or JSON. This is the reverse of `page create -f`: instead of uploading a local file to Notion, it downloads a Notion page to a local file.

**Alias:** `page:e`

## Usage

```
notion-cli page export PAGE_ID [FLAGS]
```

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `PAGE_ID` | Yes | Page ID, dashed UUID, or full Notion URL |

The argument passes through the standard ID resolver, so all these formats work:

- Raw ID: `2fc3826d337780419021c0097da10f33`
- Dashed UUID: `2fc3826d-3377-8041-9021-c0097da10f33`
- Title-slug URL: `https://notion.so/My-Page-2fc3826d337780419021c0097da10f33`
- URL with query params: `https://notion.so/Page-abc123?source=copy_link`

## Flags

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--output` | `-o` | | File path to write (omit for stdout) |
| `--json` | `-j` | | Export as JSON instead of markdown |
| `--minimal` | | | Strip metadata fields from JSON output (~40% smaller) |
| `--verbose` | `-v` | | Show resolver and cache debug info on stderr |
| `--no-cache` | | | Bypass cache, force fresh API calls |
| `--retry` | | | Auto-retry on rate limit (respects Retry-After) |
| `--timeout` | | `30000` | Request timeout in milliseconds |

## Output Formats

### Markdown (default)

Exports the page content as GitHub-flavored markdown. The `notion-to-md` library handles conversion of all block types:

- Headings (H1, H2, H3)
- Paragraphs with rich text (bold, italic, code, links)
- Bulleted and numbered lists
- Code blocks with language syntax
- Blockquotes
- Dividers
- Images, files, and embeds (as URLs)
- Tables and toggles

Some Notion features (databases, synced blocks, columns) have no standard markdown equivalent and may render as simplified text.

### JSON (`--json`)

Exports the raw Notion API page object. This is lossless and includes all properties, metadata, and timestamps. Use `--minimal` to strip metadata fields for a smaller response.

## Output Destination

### stdout (default)

When no `-o` flag is given, content prints to stdout. This makes the command pipeable:

```bash
# Pipe to a file
notion-cli page export PAGE_ID > notes.md

# Pipe to another command
notion-cli page export PAGE_ID | wc -l

# Pipe to clipboard (macOS)
notion-cli page export PAGE_ID | pbcopy
```

### File (`-o`)

Write directly to a file. The path must be within the current working directory (directory traversal is blocked for security).

```bash
notion-cli page export PAGE_ID -o notes.md
notion-cli page export PAGE_ID --json -o backup.json
```

On success, the command prints a confirmation:

```
Exported to notes.md
```

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Export completed successfully |
| `1` | Export failed (page not found, no access, invalid path) |

## Error Handling

Errors follow the standard CLI error format. Common failures:

| Error Code | Cause | Recovery |
|------------|-------|----------|
| `OBJECT_NOT_FOUND` | Page doesn't exist or integration lacks access | Share the page with your integration |
| `VALIDATION_ERROR` | Invalid output path (directory traversal) | Use a relative path within current directory |
| `UNAUTHORIZED` | Token is missing or invalid | Run `notion-cli init` to set your token |

With `--json`, errors return structured JSON:

```json
{
  "success": false,
  "error": {
    "code": "OBJECT_NOT_FOUND",
    "message": "Page not found: abc123",
    "suggestions": [...]
  }
}
```

## Examples

```bash
# Export page as markdown to stdout
notion-cli page export PAGE_ID

# Export page as markdown to a file
notion-cli page export PAGE_ID -o notes.md

# Export page as JSON to a file
notion-cli page export PAGE_ID --json -o page.json

# Export page as compact JSON (stripped metadata)
notion-cli page export PAGE_ID --json --minimal -o page.json

# Export using a Notion URL
notion-cli page export "https://notion.so/My-Page-abc123" -o notes.md

# Round-trip: export then re-create on a different parent
notion-cli page export PAGE_ID -o backup.md
notion-cli page create -f backup.md -p NEW_PARENT_ID
```

## Supported Block Types

The markdown converter handles these Notion block types:

| Block Type | Markdown Output |
|------------|----------------|
| Heading 1/2/3 | `#`, `##`, `###` |
| Paragraph | Plain text with inline formatting |
| Bulleted list | `- item` |
| Numbered list | `1. item` |
| Code block | Fenced code with language |
| Quote | `> text` |
| Divider | `---` |
| Image | `![caption](url)` |
| Bookmark/Embed | URL as link |
| Table | GitHub-flavored markdown table |
| Toggle | Heading with nested content |
| To-do | `- [ ] item` or `- [x] item` |

## Source Files

| File | Purpose |
|------|---------|
| [`src/commands/page/export.ts`](../src/commands/page/export.ts) | Export command |
| [`src/utils/notion-resolver.ts`](../src/utils/notion-resolver.ts) | ID resolution pipeline |

## Related Documentation

- **[Smart ID Resolution](architecture/smart-id-resolution.md)** — How URLs and names resolve to Notion IDs
- **[Output Formats](user-guides/output-formats.md)** — All output format options
- **[Error Handling](user-guides/error-handling-examples.md)** — Understanding error codes and recovery
- **[Batch Operations](batch.md)** — Work with multiple pages at once
