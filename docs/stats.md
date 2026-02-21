`notion-cli stats`
==================

Show a bird's-eye view of your Notion workspace. Displays database count, user count, property type breakdown, and per-database details in a single-screen dashboard.

Data comes from the workspace cache by default, making it instant. Use `--live` to also fetch page counts per database from the API.

```
USAGE
  $ notion-cli stats [-j] [--page-size <value>] [--retry] [--timeout <value>]
    [--no-cache] [-v] [--minimal] [--live]

FLAGS
  -j, --json       Output as JSON (recommended for automation)
  -v, --verbose    Enable verbose logging to stderr
      --live       Fetch page counts per database (requires API calls)
      --minimal    Strip unnecessary metadata
      --no-cache   Bypass cache and force fresh API calls

ALIASES
  $ notion-cli dashboard

DESCRIPTION
  The command aggregates workspace data in two tiers:

  Default (fast, from cache):
  1. Loads the workspace cache (~/.notion-cli/databases.json)
  2. Fetches workspace name via botUser() and user count via listUser()
  3. Aggregates property types across all cached database schemas
  4. Displays a sorted dashboard with database names and property counts

  With --live (slower, N API calls):
  5. Queries each database to count its pages
  6. Adds a "Pages" column and "Total Pages" to the summary
  7. Re-sorts databases by page count (most pages first)

EXAMPLES
  Show workspace statistics

    $ notion-cli stats

  Include page counts per database (slower)

    $ notion-cli stats --live

  JSON output for automation

    $ notion-cli stats --json

  Use the alias

    $ notion-cli dashboard
```

---

## How It Works

```
notion-cli stats
         │
         ├─ 1. loadCache()          → databases + property schemas (no API call)
         │
         ├─ 2. botUser()            → workspace name (1 cached API call)
         │     listUser()           → user count (1 cached API call)
         │     (both fail gracefully if token lacks permissions)
         │
         ├─ 3. Aggregate            → property type counts from cached schemas
         │                          → per-database property counts
         │
         ├─ 4. --live only:
         │     fetchAllPagesInDS()  → page count per database (N API calls)
         │
         └─ 5. Output               → human-readable dashboard or JSON
```

**Data sources by tier:**

| Data | Source | API Calls | Speed |
|------|--------|-----------|-------|
| Database count | Workspace cache | 0 | Instant |
| Database names | Workspace cache | 0 | Instant |
| Property schemas | Workspace cache | 0 | Instant |
| Property type breakdown | Workspace cache | 0 | Instant |
| Cache age | Workspace cache | 0 | Instant |
| Workspace name | `botUser()` | 1 (cached) | Fast |
| User count | `listUser()` | 1 (cached) | Fast |
| Page counts per DB | `fetchAllPagesInDS()` | N (1 per DB) | Slow |

---

## Output Examples

### Human-readable (default)

```
Workspace: Acme Corp
Databases: 15

Databases
─────────────────────────────────────────────────────────────────
Name                                  ID        Props
Sprint Tasks                          a1b2c3d4     12
Knowledge Base                        e5f6a7b8     10
Meeting Notes                         c9d0e1f2      8
Projects                              f3a4b5c6      6
Projects                              d7e8f9a0      6
Bug Tracker                           b1c2d3e4      5
...

Property Types
──────────────────────────────
title                   15
select                  12
date                    10
rich_text                9
multi_select             7
checkbox                 5
...

Cache: synced 2h ago
Tip: Run with --live to fetch page counts per database.
```

The short ID column (first 8 characters of the database ID) disambiguates databases with duplicate names. Agents can use these IDs to reference specific databases in other commands.

### With `--live` flag

```
Workspace: Acme Corp
Databases: 15 | Users: 4 | Total Pages: 347

Databases
─────────────────────────────────────────────────────────────────
Name                                  ID        Props  Pages
Sprint Tasks                          a1b2c3d4     12    142
Knowledge Base                        e5f6a7b8     10     67
Meeting Notes                         c9d0e1f2      8     45
Projects                              f3a4b5c6      6     38
Projects                              d7e8f9a0      6     12
Bug Tracker                           b1c2d3e4      5     28
...

Property Types
──────────────────────────────
title                   15
select                  12
...

Cache: synced 2h ago
```

When `--live` is active, databases are sorted by page count (most pages first) instead of property count.

### JSON (`--json`)

```json
{
  "success": true,
  "data": {
    "workspace": "Acme Corp",
    "databases": {
      "count": 15,
      "items": [
        {
          "title": "Sprint Tasks",
          "shortId": "a1b2c3d4",
          "propertyCount": 12
        },
        {
          "title": "Knowledge Base",
          "shortId": "e5f6a7b8",
          "propertyCount": 10
        }
      ]
    },
    "users": { "count": 4 },
    "property_types": {
      "title": 15,
      "select": 12,
      "date": 10,
      "rich_text": 9,
      "multi_select": 7,
      "checkbox": 5
    },
    "cache": {
      "last_sync": "2026-02-21T14:00:00.000Z",
      "age_ms": 3600000
    }
  },
  "timestamp": "2026-02-21T15:00:00.000Z"
}
```

When `--live` is used, each database item includes a `pages` field, and a top-level `pages.total` is added:

```json
{
  "data": {
    "databases": {
      "items": [
        { "title": "Sprint Tasks", "shortId": "a1b2c3d4", "propertyCount": 12, "pages": 142 },
        { "title": "Knowledge Base", "shortId": "e5f6a7b8", "propertyCount": 10, "pages": 67 }
      ]
    },
    "pages": { "total": 347 }
  }
}
```

---

## Dashboard Sections

The human-readable output has four sections:

### 1. Summary Line

Shows workspace name, database count, and optionally user count and total pages.

- **Workspace name** comes from the bot's workspace info. If the token lacks permissions, it shows "Unknown".
- **User count** requires the `users.list` permission. If unavailable, the count is omitted (not an error).
- **Total Pages** only appears with `--live`.

### 2. Databases Table

Lists every cached database with its short ID (first 8 characters) and property count. Sorted by property count (most complex first) by default. With `--live`, adds a Pages column and sorts by page count instead.

- The short ID disambiguates databases with duplicate names and can be used in other commands.
- Database names longer than 36 characters are truncated with an ellipsis.
- If a database query fails during `--live` (permissions, deleted), the Pages column shows `err` for that row.

### 3. Property Types

Counts every property type across all database schemas. Sorted by frequency (most common first). This tells you which property types dominate your workspace.

Common Notion property types: `title`, `rich_text`, `select`, `multi_select`, `date`, `number`, `checkbox`, `status`, `relation`, `formula`, `rollup`, `people`, `url`, `files`, `created_time`, `last_edited_time`, `created_by`.

### 4. Footer

Shows when the workspace cache was last synced, in human-friendly format ("just now", "2h ago", "3d ago"). If `--live` is not active, shows a tip suggesting the flag.

---

## Graceful Degradation

The command handles permission and connectivity issues without crashing:

| Scenario | Behavior |
|----------|----------|
| No workspace cache | Throws `workspaceNotSynced` error with "run `sync` first" guidance |
| `botUser()` fails | Workspace name shows as "Unknown" |
| `listUser()` fails | User count is omitted from the summary line |
| A database query fails (`--live`) | That database shows `err` in the Pages column; other databases still counted |
| Token expired | Caught by the error handler, shows auth error with fix suggestions |

This means the command always shows **as much data as it can**, even if some API calls fail.

---

## Comparison with Related Commands

| Feature | `stats` | `whoami` | `list` |
|---------|---------|----------|--------|
| **Purpose** | Workspace overview | Connection health check | Database listing |
| **Database count** | Yes | Count only (in cache section) | Full list with IDs |
| **Property breakdown** | Yes (types + counts) | No | No |
| **User count** | Yes | No | No |
| **Page counts** | Yes (with `--live`) | No | No |
| **Cache hit rate** | No | Yes | No |
| **Connection latency** | No | Yes | No |
| **Fuzzy filter** | No | No | Yes (`--filter`) |
| **API calls (default)** | 0-2 | 1 | 0 |

**When to use each:**
- **`stats`** — understand your workspace at a glance (how big, how complex, what types)
- **`whoami`** — check if your token works and see cache health
- **`list`** — find a specific database by name or ID

---

## Error Messages

| Error | Cause | Fix |
|-------|-------|-----|
| `Workspace not synced` | No cache file at `~/.notion-cli/databases.json` | Run `notion-cli sync` first |
| `Authentication failed` | Token is invalid or expired | Run `notion-cli config set-token` or check [Integrations](https://www.notion.so/my-integrations) |

---

## Related

- [`notion-cli whoami`](user-guides/ai-agent-guide.md) — Connection health and cache diagnostics
- [`notion-cli list`](user-guides/ai-agent-guide.md) — Full database listing with IDs and fuzzy filter
- [`notion-cli sync`](user-guides/ai-agent-guide.md) — Refresh the workspace cache that `stats` reads from
- [Caching Architecture](architecture/caching.md) — How the workspace cache works internally
