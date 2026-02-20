---
command:
  name: browse
  aliases: [nav]
  type: interactive
  status: production
  version: "1.0"
  requires_tty: true

component:
  source_files:
    - src/commands/browse.ts             # oclif command entry point
    - src/utils/interactive-navigator.ts # navigation logic + UI loop
  test_files:
    - test/commands/browse.test.ts
    - test/utils/interactive-navigator.test.ts
  entry_point: Browse.run()
  dependency: "@inquirer/select"

arguments:
  page_id:
    required: true
    description: "Page ID, URL, or name to start browsing from"
    resolver: resolveNotionId(input, 'page')
    accepted_formats:
      - raw_hex_id          # 1fb79d4c71bb8032b722c82305b63a00
      - dashed_uuid         # 1fb79d4c-71bb-8032-b722-c82305b63a00
      - notion_url_bare     # https://notion.so/1fb79d4c71bb8032b722c82305b63a00
      - notion_url_slug     # https://notion.so/My-Page-1fb79d4c71bb8032b722c82305b63a00
      - notion_url_workspace # https://notion.so/workspace/Page-1fb79d4c71bb8032b722c82305b63a00
      - page_name           # "Meeting Notes" (via cache or API search)

flags: none  # interactive-only command, no output/automation flags

api_calls_per_step: 2  # pages.retrieve + blocks.children.list (parallel)

errors:
  - code: VALIDATION_ERROR
    trigger: "Not a TTY (piped / CI)"
    message: "browse requires an interactive terminal (TTY)"
    retryable: false
  - code: RESOURCE_NOT_FOUND
    trigger: "Page not found (404)"
    message: "Integration may not have access"
    retryable: false
  - code: VALIDATION_ERROR
    trigger: "Invalid page ID / URL"
    message: "Invalid input: expected a page name, ID, or URL"
    retryable: false
  - code: UNAUTHORIZED
    trigger: "Invalid or missing token"
    message: "Authentication failed"
    retryable: false
---

`notion-cli browse`
====================

Interactively navigate a Notion page tree with arrow keys

* [`notion-cli browse PAGE_ID`](#notion-cli-browse-page_id)

## `notion-cli browse PAGE_ID`

Interactively navigate a Notion page tree with arrow keys

```
USAGE
  $ notion-cli browse PAGE_ID

ARGUMENTS
  PAGE_ID  Page ID, URL, or name to start browsing from

DESCRIPTION
  Opens an interactive terminal UI that displays the child pages and child
  databases of a Notion page. Use arrow keys to highlight an item and press
  Enter to navigate into it. A history stack lets you go back to the parent.

  This command requires an interactive terminal (TTY). It will not work when
  piped, redirected, or run in CI environments.

  Input formats accepted for PAGE_ID:
    - Raw hex ID:      1fb79d4c71bb8032b722c82305b63a00
    - Dashed UUID:     1fb79d4c-71bb-8032-b722-c82305b63a00
    - Notion URL:      https://notion.so/My-Page-1fb79d4c71bb8032b722c82305b63a00
    - Page name:       "Meeting Notes" (via cache or API search)

ALIASES
  $ notion-cli nav

EXAMPLES
  Browse a page by ID

    $ notion-cli browse 1fb79d4c71bb8032b722c82305b63a00

  Browse a page by URL

    $ notion-cli browse https://notion.so/My-Page-abc123

  Browse using the short alias

    $ notion-cli nav 1fb79d4c71bb8032b722c82305b63a00
```

### Interactive Controls

Once inside the navigator, you interact with the terminal UI:

| Key | Action |
|---|---|
| `Up` / `Down` arrow | Move highlight between items |
| `Enter` | Navigate into the highlighted page or database |
| Select `.. Back` | Return to the parent page |
| Select `[Quit]` | Exit the navigator |

### Display Format

Each screen shows:

```
<icon> <page title>  (<N> children)
? Navigate to:
  .. Back
  Child Page One
  Child Page Two
  [DB] Tasks Database
  [Quit]
```

- **`.. Back`** appears only when you have navigated at least one level deep (not at the starting page). [`src/utils/interactive-navigator.ts:68`](../src/utils/interactive-navigator.ts)
- Child databases are prefixed with **`[DB]`** to distinguish them from child pages. [`src/utils/interactive-navigator.ts:74`](../src/utils/interactive-navigator.ts)
- Pages without a title display as **Untitled**. [`src/utils/interactive-navigator.ts:48`](../src/utils/interactive-navigator.ts)
- The header shows the page icon (emoji), title, and total count of navigable children. [`src/utils/interactive-navigator.ts:137`](../src/utils/interactive-navigator.ts)

### Error Handling

| Scenario | Error Code | Message | Retryable | Recovery |
|---|---|---|---|---|
| Invalid page ID / URL | `VALIDATION_ERROR` | "Invalid input: expected a page name, ID, or URL" | No | Use a valid [input format](#notion-cli-browse-page_id) |
| Page not found (404) | `RESOURCE_NOT_FOUND` | "Integration may not have access" | No | Open page in Notion → "..." → "Add connections" |
| Not a TTY (piped / CI) | `VALIDATION_ERROR` | "browse requires an interactive terminal (TTY)" | No | Run directly in a terminal emulator |
| API authentication failure | `UNAUTHORIZED` | "Authentication failed" | No | Run `notion-cli init <token>` |
| Empty page (no children, root) | (none) | "No child pages or databases found." | n/a | Page has no navigable children; use `page retrieve --map` to see all block types |

### Differences from Other Commands

| Aspect | `browse` | `page retrieve --map` |
|---|---|---|
| **Mode** | Interactive (arrow keys) | Non-interactive (flag-driven) |
| **Output** | Terminal UI | JSON / table |
| **Use case** | Human exploration | Automation / AI agents |
| **TTY required** | Yes | No |
| **Depth** | Unlimited (manual drill-down) | Single level |
| **Flags** | None | `--json`, `--raw`, `--compact-json`, etc. |

**For AI agents:** This command is interactive-only. Use `page retrieve --map` or `page retrieve --recursive` for programmatic workspace exploration.

## Executable Commands

### Test Command Loads

```bash
# Verify the command and alias register correctly
notion-cli browse --help
notion-cli nav --help
```

### Run Unit Tests

```bash
# Navigator logic (pure functions + integration mocks)
npm test -- --grep "interactive-navigator"

# Command metadata
npm test -- --grep "browse command"

# Both
npm test -- --grep "interactive-navigator|browse command"
```

### Validate Build

```bash
npm run build && npm test && npm run lint
```

### Debug

```bash
# Enable debug logging to trace ID resolution and API calls
export DEBUG=notion-cli:*
notion-cli browse <page_id>
```

---

**Last Updated**: 2026-02-20
**Command Status**: Production
**Machine-Readable**: YAML frontmatter with arguments, errors, API call count
**Source**: [`src/commands/browse.ts`](../src/commands/browse.ts), [`src/utils/interactive-navigator.ts`](../src/utils/interactive-navigator.ts)

---

### Related Documentation

- **[Page Commands](page.md)** — non-interactive page retrieval and manipulation
- **[Interactive Browsing Guide](user-guides/interactive-browsing.md)** — step-by-step walkthrough with real examples
- **[Interactive Navigator Architecture](architecture/interactive-navigator.md)** — internal design and data flow
- **[Smart ID Resolution](architecture/smart-id-resolution.md)** — how PAGE_ID input is resolved
- **[Caching](architecture/caching.md)** — how `mapPageStructure()` results are cached
