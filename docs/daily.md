`notion-cli daily`
==================

Create or open today's daily journal entry. After one-time setup, this command creates a new page in your configured database with today's date — or finds the existing entry if you already have one for today. No duplicate entries, no arguments needed.

* [`notion-cli daily [CONTENT]`](#notion-cli-daily-content)
* [`notion-cli daily setup [TARGET]`](#notion-cli-daily-setup-target)

## `notion-cli daily [CONTENT]`

Create or open today's daily journal entry.

Queries the configured database by date to check if today's entry exists. If it does, the command returns the existing page URL. If you provide content and the entry already exists, the content is appended to the existing page (not duplicated). If no entry exists, a new page is created with today's date.

```
USAGE
  $ notion-cli daily [CONTENT] [-j] [--page-size <value>] [--retry]
    [--timeout <value>] [--no-cache] [-v] [--minimal]

ARGUMENTS
  [CONTENT]  Text to add to today's entry (appended if entry already exists)

FLAGS
  -j, --json               Output as JSON (recommended for automation)
  -v, --verbose            Enable verbose logging to stderr
      --minimal            Strip unnecessary metadata
      --no-cache           Bypass cache and force fresh API calls
      --page-size=<value>  [default: 100] Items per page (1-100)
      --retry              Auto-retry on rate limit
      --timeout=<value>    [default: 30000] Request timeout in milliseconds

ALIASES
  $ notion-cli d

DESCRIPTION
  Zero-friction daily journal. Requires one-time setup via `notion-cli daily setup`.

  The command follows three possible paths:
  1. No entry for today → creates a new page with today's date and optional content
  2. Entry exists, no content arg → prints the existing entry URL
  3. Entry exists, content provided → appends content to the existing entry

  Entry titles use YYYY-MM-DD format by default (e.g., "2026-02-21").

EXAMPLES
  Create today's entry (empty)

    $ notion-cli daily

  Create today's entry with body content

    $ notion-cli daily "Had a productive standup meeting"

  Append a thought to today's existing entry

    $ notion-cli daily "Finished the API refactor"

  Create entry with JSON output (for automation)

    $ notion-cli daily --json

  Create entry with body and JSON output

    $ notion-cli daily "Deploy went smoothly" --json

  Use the short alias

    $ notion-cli d

  Use the short alias with content

    $ notion-cli d "Quick thought before lunch"
```

### How It Works

1. Loads config from `~/.notion-cli/daily.json` (created by `daily setup`)
2. Queries the database for a page where the date property equals today (`YYYY-MM-DD`)
3. If found: returns URL (and appends content if provided via `appendBlockChildren`)
4. If not found: creates a new page with title + date properties (and optional body blocks)

### Output Examples

**New entry created (human-readable):**
```
Created: 2026-02-21
https://www.notion.so/Daily-2026-02-21-abc123
```

**Content appended to existing entry:**
```
Appended to: 2026-02-21
https://www.notion.so/Daily-2026-02-21-abc123
```

**Existing entry found (no content arg):**
```
Today's entry: 2026-02-21
https://www.notion.so/Daily-2026-02-21-abc123
```

**JSON output (`--json`):**
```json
{
  "success": true,
  "action": "created",
  "data": {
    "id": "abc123...",
    "url": "https://www.notion.so/Daily-2026-02-21-abc123",
    "properties": { "..." }
  },
  "timestamp": "2026-02-21T10:30:00.000Z"
}
```

The `action` field is one of: `"created"`, `"appended"`, or `"found"`.

---

## `notion-cli daily setup [TARGET]`

Configure the daily journal command. Run this once before using `notion-cli daily`.

Two modes are available:

- **Manual mode** — point to an existing Notion database that has a Date property
- **Auto mode** — create a new "Daily Journal" database automatically under a parent page

```
USAGE
  $ notion-cli daily setup [TARGET] [--auto <value>] [-j] [--page-size <value>]
    [--retry] [--timeout <value>] [--no-cache] [-v] [--minimal]

ARGUMENTS
  [TARGET]  Existing database ID or URL (manual mode)

FLAGS
      --auto=<value>       Auto-create database under this parent page (pass page ID or URL)
  -j, --json               Output as JSON (recommended for automation)
  -v, --verbose            Enable verbose logging to stderr
      --minimal            Strip unnecessary metadata
      --no-cache           Bypass cache and force fresh API calls
      --page-size=<value>  [default: 100] Items per page (1-100)
      --retry              Auto-retry on rate limit
      --timeout=<value>    [default: 30000] Request timeout in milliseconds

DESCRIPTION
  One-time configuration for the daily journal.

  Manual mode: resolves the database, reads its schema, and auto-detects the
  title and date properties. Fails with a helpful message if the database has no
  date-type property.

  Auto mode: creates a new database called "Daily Journal" under the specified
  parent page with two properties — Name (title) and Date (date). Both are the
  minimum needed for daily entries.

  Config is saved to ~/.notion-cli/daily.json. Re-running setup overwrites the
  previous config (useful for switching databases).

EXAMPLES
  Manual: point to an existing database by ID

    $ notion-cli daily setup abc123def456

  Manual: point to an existing database by URL

    $ notion-cli daily setup "https://notion.so/My-Journal-abc123def456"

  Manual: point to an existing database by cached name

    $ notion-cli daily setup "My Journal"

  Auto: create a new Daily Journal database under a page

    $ notion-cli daily setup --auto PAGE_ID

  Auto: create using a page URL

    $ notion-cli daily setup --auto "https://notion.so/My-Workspace-abc123"

  Setup with JSON output

    $ notion-cli daily setup abc123def456 --json
```

### Setup Output

**Manual mode (human-readable):**
```
Daily journal configured!
  Database:       abc123def456
  Title property: Name
  Date property:  Date

Run "notion-cli daily" to create today's entry.
```

**Auto mode (human-readable):**
```
Daily journal configured!
  Database:       new_db_id_here
  Title property: Name
  Date property:  Date

Run "notion-cli daily" to create today's entry.
```

### Config File

Setup saves configuration to `~/.notion-cli/daily.json`:

```json
{
  "version": "1.0.0",
  "database_id": "abc123def456",
  "title_property": "Name",
  "date_property": "Date",
  "title_format": "YYYY-MM-DD"
}
```

| Field | Description |
|-------|-------------|
| `version` | Config format version |
| `database_id` | The data_source_id of the target database |
| `title_property` | Name of the title-type property in the database schema |
| `date_property` | Name of the date-type property used to track entry dates |
| `title_format` | [dayjs](https://day.js.org/docs/en/display/format) format string for page titles |

### Requirements

**Manual mode:**
- The database must have at least one date-type property
- Your Notion integration must have access to the database

**Auto mode:**
- Your Notion integration must have access to the parent page
- The page must allow child databases

---

## Error Messages

| Error | Cause | Fix |
|-------|-------|-----|
| `Daily journal not configured yet` | No `~/.notion-cli/daily.json` exists | Run `notion-cli daily setup` first |
| `This database has no Date property` | Manual setup pointed to a DB without a date column | Add a Date property in Notion, then re-run setup |
| `Provide a database ID (manual) or --auto PAGE_ID` | Neither target nor `--auto` flag was provided | Choose a setup mode — see examples above |
| `Cannot use both target database and --auto` | Both a target argument and `--auto` flag were provided | Use one mode, not both |

---

## Related

- [`notion-cli quick`](../docs/quick.md) — Quick-capture a page to a bookmarked database
- [`notion-cli bookmark`](../docs/bookmark.md) — Save named shortcuts to databases and pages
- [`notion-cli open`](../docs/open.md) — Open a page or database in the browser
- [`notion-cli db create`](../docs/db-create.md) — Create a database manually
- [Daily Journal Setup Guide](user-guides/daily-journal-setup.md) — Step-by-step walkthrough
