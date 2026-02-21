`notion-cli append`
===================

Append content to an existing Notion page. Accepts the page as a name, URL, ID, or bookmark. Content is written as markdown and converted to Notion blocks automatically.

This is the counterpart of `quick` (which creates new pages). Use `append` when the page already exists and you want to add content to it.

```
USAGE
  $ notion-cli append TARGET [CONTENT] [-j] [--page-size <value>] [--retry]
    [--timeout <value>] [--no-cache] [-v] [--minimal]

ARGUMENTS
  TARGET   Page name, bookmark, URL, or ID (required)
  CONTENT  Markdown content to append (optional — can also pipe via stdin)

FLAGS
  -j, --json       Output as JSON (recommended for automation)
  -v, --verbose    Enable verbose logging to stderr
      --minimal    Strip unnecessary metadata
      --no-cache   Bypass cache and force fresh API calls

ALIASES
  $ notion-cli a

DESCRIPTION
  The command follows this sequence:
  1. Reads content from the CONTENT argument or stdin (at least one required)
  2. Resolves TARGET to a page ID using the full resolver pipeline
     (URL extraction → direct ID → bookmark → cache → fuzzy → API search)
  3. Converts the markdown content to Notion block objects
  4. Appends the blocks to the page via the Notion API

  The TARGET argument accepts any format that the resolver understands:
  - Page name: "Sprint Planning" (searched via API)
  - Page URL: "https://notion.so/Sprint-Planning-abc123"
  - Page ID: "abc123..." (32-char hex, with or without dashes)
  - Bookmark: "inbox" (if a bookmark points to a page)

  Fuzzy matching is supported — "Sprnt Planing" resolves to "Sprint Planning"
  if the edit distance is within threshold.

EXAMPLES
  Append a simple note to a page

    $ notion-cli append "Daily Log" "Had a productive standup"

  Append markdown with headings and lists

    $ notion-cli append "Meeting Notes" "## Action Items\n\n- Fix login bug\n- Update docs"

  Pipe content from another command

    $ cat notes.md | notion-cli append "Knowledge Hub"

  Append and get JSON output for scripts

    $ notion-cli append "Sprint Log" "Deployed v2.1" --json

  Use page URL directly

    $ notion-cli append "https://notion.so/My-Page-abc123" "New paragraph"

  Use the short alias

    $ notion-cli a "Daily Log" "Quick note"
```

---

## How It Works

```
notion-cli append "Daily Log" "New note"
         │              │           │
         │              │           └─ Content: converted to Notion blocks
         │              │              via markdownToBlocks()
         │              │
         │              └─ Target: resolved to page ID via
         │                 resolveNotionId(target, 'page')
         │
         └─ Command: calls notion.appendBlockChildren()
```

1. **Content input** — from the `CONTENT` argument or piped via stdin. If both are empty, the command exits with an error.
2. **Target resolution** — the `TARGET` argument goes through the full resolver pipeline. Since pages are not stored in the workspace cache (only databases are), page names resolve via the Notion API search.
3. **Markdown conversion** — content is parsed by `markdownToBlocks()`, which supports headings, paragraphs, bullet/numbered lists, code blocks, quotes, bold, italic, links, and horizontal rules.
4. **Block append** — the converted blocks are appended to the end of the target page.

---

## Output Examples

**Human-readable (default):**
```
Appended to: Daily Log
1 block(s) added
```

**Multiple blocks:**
```
Appended to: Meeting Notes
4 block(s) added
```

**JSON (`--json`):**
```json
{
  "success": true,
  "data": {
    "object": "list",
    "results": [
      {
        "object": "block",
        "id": "abc123...",
        "type": "paragraph",
        "paragraph": {
          "rich_text": [{ "plain_text": "New note" }]
        }
      }
    ]
  },
  "timestamp": "2026-02-21T15:00:00.000Z"
}
```

---

## Supported Markdown Syntax

The `CONTENT` argument supports standard markdown. Each element becomes a Notion block:

| Markdown | Notion Block Type |
|----------|------------------|
| Plain text | Paragraph |
| `# Heading` | Heading 1 |
| `## Heading` | Heading 2 |
| `### Heading` | Heading 3 |
| `- item` or `* item` | Bulleted list |
| `1. item` | Numbered list |
| `` ```code``` `` | Code block |
| `> quote` | Quote |
| `---` | Divider |
| `**bold**` | Bold text |
| `*italic*` | Italic text |
| `` `code` `` | Inline code |
| `[text](url)` | Link |

---

## Stdin Piping

The command reads from stdin when no `CONTENT` argument is provided and stdin is not a terminal. This works with pipes and redirects.

```bash
# Pipe from echo
echo "Quick thought" | notion-cli append "Daily Log"

# Pipe from a file
cat meeting-notes.md | notion-cli append "Meeting Notes"

# Pipe from another command
git log --oneline -5 | notion-cli append "Dev Log"
```

When both a `CONTENT` argument and stdin data are available, the argument takes precedence.

---

## Comparison with Related Commands

| Feature | `append` | `quick` | `block append` |
|---------|---------|---------|----------------|
| **Purpose** | Add to existing page | Create new page | Add to existing block |
| **Target** | Page name/URL/ID | Database name/ID | Block ID (required) |
| **Content format** | Markdown (auto-converted) | Markdown (auto-converted) | JSON blocks or text flags |
| **Name resolution** | Full resolver + fuzzy | Full resolver + fuzzy | URL/ID only |
| **Alias** | `a` | `q` | `block:a` |

**When to use each:**
- **`append`** — you have an existing page and want to add content by name
- **`quick`** — you want to create a brand new page in a database
- **`block append`** — you need fine-grained control (specific block types, append after a specific block, raw JSON)

---

## Error Messages

| Error | Cause | Fix |
|-------|-------|-----|
| `No content provided` | No CONTENT argument and no stdin | Add content: `append "Page" "text"` |
| `Page not found: ...` | Page name not found via API search | Check the page name, or use URL/ID instead |
| `object_not_found` | Integration not shared with the page | Open page in Notion → "..." → "Add connections" |
| `Could not find block with ID` | Target resolved to a database, not a page | Use a page name or ID, not a database name |

---

## Related

- [`notion-cli quick`](../docs/user-guides/templates-guide.md) — Create new pages (the counterpart of `append`)
- [`notion-cli block append`](../docs/user-guides/ai-agent-guide.md) — Low-level block append with JSON/text flags
- [Fuzzy Search](user-guides/fuzzy-search.md) — Typo-tolerant name resolution used by TARGET
- [Smart ID Resolution](architecture/smart-id-resolution.md) — Full resolver pipeline
