---
guide:
  name: Interactive Browsing
  type: how-to
  status: production
  version: "1.0"
  audience: [human-users, developers]

command:
  name: browse
  aliases: [nav]
  requires_tty: true

prerequisites:
  - notion-cli installed (notion-cli --version)
  - authentication configured (notion-cli init or NOTION_TOKEN env var)
  - integration has access to target pages (Notion sharing)
  - interactive terminal (TTY)

related_commands:
  non_interactive_alternatives:
    - command: "page retrieve --map"
      purpose: "Single-level structure discovery (JSON output)"
    - command: "page retrieve --recursive"
      purpose: "Full tree retrieval (JSON output, max-depth configurable)"
    - command: "search"
      purpose: "Find pages/databases by name"
---

# Interactive Browsing Guide

> **Explore your Notion workspace from the terminal using arrow keys**

This guide walks through using the `browse` command to navigate Notion page trees interactively. It covers setup, common workflows, and troubleshooting.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Basic Usage](#basic-usage)
3. [Navigating a Page Tree](#navigating-a-page-tree)
4. [Accepted Input Formats](#accepted-input-formats)
5. [Combining with Other Commands](#combining-with-other-commands)
6. [For AI Agents: Non-Interactive Alternatives](#for-ai-agents-non-interactive-alternatives)
7. [Limitations](#limitations)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before using `browse`, ensure:

1. **Notion CLI is installed** and you can run `notion-cli --version`.
2. **Authentication is configured** via `notion-cli init` or the `NOTION_TOKEN` environment variable.
3. **Your integration has access** to the pages you want to browse. In Notion, open the page, click the `...` menu, and add your integration under "Connections".
4. **You are in an interactive terminal.** The command requires a TTY — it will not work when piped, redirected, or run inside non-interactive environments like CI.

### Quick Verification

```bash
# Confirm CLI is installed
notion-cli --version

# Confirm authentication works
notion-cli user retrieve bot

# Confirm page is accessible (replace with your page ID)
notion-cli page retrieve <page_id> --map
```

If all three commands succeed, `browse` will work.

---

## Basic Usage

Start browsing from any page:

```bash
# Using a page ID
notion-cli browse 1fb79d4c71bb8032b722c82305b63a00

# Using a Notion URL (copied from your browser)
notion-cli browse https://www.notion.so/My-Workspace-1fb79d4c71bb8032b722c82305b63a00

# Using the short alias
notion-cli nav 1fb79d4c71bb8032b722c82305b63a00
```

The terminal displays a list of child pages and databases:

```
📁 Project Hub  (4 children)
? Navigate to: (Use arrow keys)
> Design Docs
  Engineering Specs
  [DB] Task Tracker
  [Quit]
```

Use `Up`/`Down` arrows to move the highlight, then press `Enter` to select.

---

## Navigating a Page Tree

### Entering a Child Page

Select any listed page to navigate into it. The display updates to show that page's children:

```
📁 Project Hub  (4 children)
? Navigate to: Design Docs     ← you pressed Enter here

📝 Design Docs  (2 children)
? Navigate to: (Use arrow keys)
> .. Back
  UI Mockups
  API Contracts
  [Quit]
```

Notice `.. Back` now appears at the top. It was not present on the first screen because you were at the root.

### Going Back

Select `.. Back` to return to the previous page. The navigator remembers your full path, so you can drill down multiple levels and back out one at a time.

```
Level 1: Project Hub
  └─ Enter "Design Docs"
Level 2: Design Docs
  └─ Enter "UI Mockups"
Level 3: UI Mockups
  └─ Select ".. Back"
Level 2: Design Docs      ← you are here
  └─ Select ".. Back"
Level 1: Project Hub       ← back to start
```

### Reaching a Leaf Page

When you navigate into a page that has no child pages or databases, and you are not at the root, you will see only `.. Back` and `[Quit]`:

```
📄 API Contracts  (0 children)
? Navigate to: (Use arrow keys)
> .. Back
  [Quit]
```

If the starting page itself has no children, the command prints a message and exits:

```
📄 Empty Page  (0 children)
No child pages or databases found.
```

### Quitting

Select `[Quit]` at any time to exit the navigator. The command returns to your shell prompt with exit code 0.

---

## Accepted Input Formats

The `PAGE_ID` argument accepts several formats. All are resolved through the same ID resolution pipeline used by every other command. See [`src/utils/notion-resolver.ts:60`](../../src/utils/notion-resolver.ts) for the `resolveNotionId()` implementation.

| Format | Example | Resolution Stage |
|---|---|---|
| Raw hex ID (32 chars) | `1fb79d4c71bb8032b722c82305b63a00` | Stage 2: ID validation |
| Dashed UUID | `1fb79d4c-71bb-8032-b722-c82305b63a00` | Stage 2: ID validation |
| Notion URL (bare) | `https://notion.so/1fb79d4c71bb8032b722c82305b63a00` | Stage 1: URL extraction |
| Notion URL (with slug) | `https://notion.so/My-Page-1fb79d4c71bb8032b722c82305b63a00` | Stage 1: URL extraction |
| Notion URL (workspace) | `https://notion.so/workspace/Page-1fb79d4c71bb8032b722c82305b63a00` | Stage 1: URL extraction |
| Page name (via cache/API) | `"Meeting Notes"` | Stage 3/4: Cache → API search |

**Tip:** The easiest way to get a page ID is to open the page in Notion, click "Share", and copy the link. Pass the entire URL directly to `browse`.

---

## Combining with Other Commands

The `browse` command is designed for human exploration. For automation workflows, use it alongside the non-interactive commands:

### Discover structure, then query

```bash
# Step 1: Browse to find the database you need
notion-cli browse https://notion.so/My-Workspace-abc123
# Navigate around, find "[DB] Sprint Backlog", note its ID from the Notion URL

# Step 2: Query the database non-interactively
notion-cli db query <database-id> --json
```

### Preview structure before deep retrieval

```bash
# Quick interactive look at what's inside a page
notion-cli browse <page-id>

# Then retrieve the full content of a specific child
notion-cli page retrieve <child-page-id> --raw
```

---

## For AI Agents: Non-Interactive Alternatives

The `browse` command requires a TTY and is **not suitable for AI agents or automation**. Use these non-interactive alternatives instead:

| Goal | Command | Output |
|---|---|---|
| See child pages/databases of a page | `notion-cli page retrieve PAGE_ID --map` | JSON with `{title, icon, structure: [...]}` |
| Retrieve full page tree recursively | `notion-cli page retrieve PAGE_ID --recursive --compact-json` | Nested JSON, configurable depth (1-10) |
| Find a page by name | `notion-cli search "page name" --json` | JSON list of matching pages/databases |
| Get block-level content | `notion-cli block retrieve:children PAGE_ID --raw` | JSON array of block objects |

### Example: Programmatic Structure Discovery

```bash
# Get the same data browse uses, but as JSON
notion-cli page retrieve <page-id> --map --compact-json

# Example output:
# {"id":"abc123","title":"Project Hub","icon":"📁","structure":[
#   {"type":"child_page","id":"def456","title":"Design Docs"},
#   {"type":"child_database","id":"ghi789","title":"Task Tracker"},
#   {"type":"paragraph","id":"jkl012","text":"Welcome to the project hub."}
# ]}
```

The `structure` array contains the same data that `browse` filters for `child_page` and `child_database` entries. An AI agent can filter this JSON programmatically instead of navigating interactively.

---

## Limitations

| Limitation | Reason | Alternative |
|---|---|---|
| **TTY required** | Uses `@inquirer/select` for arrow-key input | Use `page retrieve --map` for non-interactive access |
| **One level at a time** | Each screen shows direct children only | Use `page retrieve --recursive` for full tree |
| **No output flags** | Purely interactive command | Use `page retrieve --map --json` for JSON output |
| **No block content** | Shows page/database titles only | Use `block retrieve:children` for block content |
| **No filtering** | All children listed; no search within the list | Use `search` to find specific pages by name |
| **API rate limits apply** | Each navigation step makes 2 API calls | Results are cached in memory for the session |

---

## Troubleshooting

### "browse requires an interactive terminal (TTY)"

**Cause:** You ran the command in a non-interactive context (piped, CI, cron job, or inside another program's subprocess).

**Fix:** Run `notion-cli browse` directly in your terminal emulator (Terminal.app, iTerm2, Windows Terminal, etc.).

**Error source:** [`src/utils/interactive-navigator.ts:110`](../../src/utils/interactive-navigator.ts)

### "Page not found" or 404 error

**Cause:** The integration does not have access to the page.

**Fix:**
1. Open the page in Notion.
2. Click the `...` menu in the top right.
3. Under "Connections", add your integration.
4. Retry the command.

**Error source:** [`src/commands/browse.ts:35`](../../src/commands/browse.ts) → `wrapNotionError()`

### "Invalid input: expected a page name, ID, or URL"

**Cause:** The `PAGE_ID` argument could not be parsed as a valid Notion identifier.

**Fix:** Ensure you are passing one of the [accepted input formats](#accepted-input-formats). The most reliable method is copying the full URL from Notion's "Share" menu.

**Error source:** [`src/utils/notion-resolver.ts:65`](../../src/utils/notion-resolver.ts)

### Navigation seems slow

**Cause:** Each navigation step fetches page metadata and block children from the Notion API (2 requests). Network latency adds up.

**Note:** Results are cached in memory for the duration of the session. Navigating back to a previously visited page does **not** make additional API calls if the cache has not expired. See [`src/notion.ts:634`](../../src/notion.ts) (`mapPageStructure` parallel fetch) and [Caching Architecture](../architecture/caching.md).

---

**Last Updated**: 2026-02-20
**Guide Status**: Production
**Machine-Readable**: YAML frontmatter with prerequisites, related commands
**Source**: [`src/commands/browse.ts`](../../src/commands/browse.ts), [`src/utils/interactive-navigator.ts`](../../src/utils/interactive-navigator.ts)

---

## Related Documentation

- **[Command Reference](../browse.md)** — flags, arguments, and error codes
- **[Interactive Navigator Architecture](../architecture/interactive-navigator.md)** — internal design and data flow
- **[Page Commands](../page.md)** — non-interactive page retrieval
- **[AI Agent Guide](ai-agent-guide.md)** — comprehensive automation patterns
- **[AI Agent Cookbook](ai-agent-cookbook.md)** — practical recipes for programmatic access
- **[Smart ID Resolution](../architecture/smart-id-resolution.md)** — how input formats are resolved
