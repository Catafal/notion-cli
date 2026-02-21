# Daily Journal Setup Guide

Set up zero-friction daily journal entries in Notion from the command line.

After following this guide, running `notion-cli daily` will create today's journal entry (or find it if it already exists) — no arguments, no IDs, no clicking around in Notion.

## When to Use This

- You want a daily notes habit powered by a Notion database
- You want to capture thoughts from the terminal without opening a browser
- You run a standup and want to log notes instantly
- You want to pipe output from other tools into today's journal entry

## Prerequisites

- Notion CLI installed and configured (`notion-cli whoami` works)
- A Notion integration token with access to your workspace
- **For manual mode:** An existing database with a Date property
- **For auto mode:** A page where the CLI can create a new database

---

## Choose Your Setup Mode

There are two ways to configure the daily command:

| Mode | When to Use | What Happens |
|------|-------------|-------------|
| **Manual** | You already have a journal/daily database in Notion | Points the CLI at your existing database. Auto-detects the title and date properties from the schema. |
| **Auto** | You want the CLI to create everything for you | Creates a new "Daily Journal" database with `Name` (title) and `Date` (date) properties under a page you specify. |

---

## Option A: Manual Setup (Existing Database)

Use this if you already have a database in Notion that you use for daily entries.

### Step 1: Find Your Database

Your database needs at least one **Date-type property**. Open it in Notion and grab the ID or URL.

Ways to identify your database:
- **URL**: Copy from the browser address bar (e.g., `https://notion.so/My-Journal-abc123`)
- **ID**: The 32-character hex string at the end of the URL
- **Name**: If you've run `notion-cli sync`, use the database name directly

### Step 2: Run Setup

```bash
# Using a database URL
notion-cli daily setup "https://notion.so/My-Journal-abc123def456"

# Using a database ID
notion-cli daily setup abc123def456

# Using a cached database name (after running `notion-cli sync`)
notion-cli daily setup "My Journal"
```

The command reads the database schema and auto-detects:
- The **title property** (the one with `type: "title"` — usually "Name")
- The **date property** (the first one with `type: "date"`)

### Step 3: Verify

```bash
notion-cli daily
```

You should see:
```
Created: 2026-02-21
https://www.notion.so/2026-02-21-abc123
```

### Troubleshooting: "This database has no Date property"

Your database must have at least one property with type `date`. To fix:
1. Open the database in Notion
2. Click `+` to add a property
3. Choose **Date** as the type
4. Name it anything (e.g., "Date", "Entry Date", "Created")
5. Re-run `notion-cli daily setup YOUR_DB_ID`

---

## Option B: Auto Setup (Create New Database)

Use this if you don't have a daily database yet and want the CLI to create one for you.

### Step 1: Choose a Parent Page

The CLI creates the database as a child of a Notion page. Pick any page in your workspace where you want the "Daily Journal" database to live.

Get the page ID or URL:
- **URL**: Copy from the browser (e.g., `https://notion.so/My-Workspace-abc123`)
- **ID**: The 32-character hex string at the end

### Step 2: Run Auto Setup

```bash
# Using a page URL
notion-cli daily setup --auto "https://notion.so/My-Workspace-abc123"

# Using a page ID
notion-cli daily setup --auto abc123def456
```

This creates a database called **"Daily Journal"** with two properties:
- **Name** (title) — the entry title (defaults to `YYYY-MM-DD`)
- **Date** (date) — the date of the entry

### Step 3: Verify

```bash
notion-cli daily
```

You should see:
```
Created: 2026-02-21
https://www.notion.so/2026-02-21-abc123
```

Open the URL to see your new database and first entry in Notion.

---

## Using the Daily Command

Once setup is complete, the daily command has three behaviors:

### Create today's entry

```bash
notion-cli daily
```

Output:
```
Created: 2026-02-21
https://www.notion.so/2026-02-21-abc123
```

### Create with body content

```bash
notion-cli daily "Had a productive standup. Discussed API redesign."
```

The first run creates the page with the text as the body. The text is converted to Notion paragraph blocks.

### Append to an existing entry

Run the command again later in the day with more content:

```bash
notion-cli daily "Finished the migration script. All tests passing."
```

Output:
```
Appended to: 2026-02-21
https://www.notion.so/2026-02-21-abc123
```

The new text is appended as additional blocks to the **same page** — no duplicates.

### Check today's entry without adding content

```bash
notion-cli daily
```

If the entry already exists and you don't provide content:
```
Today's entry: 2026-02-21
https://www.notion.so/2026-02-21-abc123
```

---

## Automation Examples

### JSON output for scripts

```bash
notion-cli daily --json
```

```json
{
  "success": true,
  "action": "created",
  "data": { "id": "...", "url": "..." },
  "timestamp": "2026-02-21T10:30:00.000Z"
}
```

The `action` field tells you what happened: `"created"`, `"appended"`, or `"found"`.

### Shell alias for even faster capture

Add to your `~/.zshrc` or `~/.bashrc`:

```bash
alias dn="notion-cli daily"
```

Then:
```bash
dn "Quick thought"
```

### Combine with other commands

```bash
# Log git commits to today's journal
git log --oneline -5 | xargs -I{} notion-cli daily "{}"

# Pipe command output as a daily note
echo "Deploy completed at $(date)" | xargs notion-cli daily
```

---

## Switching Databases

To point the daily command at a different database, re-run setup:

```bash
# Switch to a different existing database
notion-cli daily setup NEW_DB_ID

# Or create a new one
notion-cli daily setup --auto NEW_PAGE_ID
```

The new config overwrites the previous `~/.notion-cli/daily.json`.

---

## How It Prevents Duplicates

The daily command queries the configured database with a date filter before creating:

```
filter: { property: "Date", date: { equals: "2026-02-21" } }
```

If any page matches today's date, the command treats it as "entry exists" and skips creation. This means:

- Running `notion-cli daily` 10 times in one day creates exactly **1 page**
- Subsequent runs with content **append** to the existing page
- Subsequent runs without content just **print the URL**

---

## Config File Reference

Location: `~/.notion-cli/daily.json`

```json
{
  "version": "1.0.0",
  "database_id": "abc123def456",
  "title_property": "Name",
  "date_property": "Date",
  "title_format": "YYYY-MM-DD"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `version` | string | Config format version (currently `"1.0.0"`) |
| `database_id` | string | The data_source_id of the target database |
| `title_property` | string | Schema property name used for the page title |
| `date_property` | string | Schema property name used for the entry date |
| `title_format` | string | [dayjs format string](https://day.js.org/docs/en/display/format) for page titles |

The file is created by `daily setup` and read by `daily` on every invocation.

---

## Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| `Daily journal not configured yet` | No config file exists | Run `notion-cli daily setup` |
| `This database has no Date property` | Database lacks a date-type column | Add a Date property in Notion, re-run setup |
| Entry created but no date filled | Wrong date property detected | Re-run setup; the CLI picks the first date property it finds |
| Permission error on setup | Integration lacks database access | Share the database with your Notion integration |
| `notion-cli d` doesn't work | Alias not recognized | Use `notion-cli daily` (alias `d` requires oclif manifest regeneration via `npm run build`) |

---

## Related Documentation

- **[Daily Command Reference](../daily.md)** — Full command syntax, flags, and output format
- **[Quick Capture](../quick.md)** — Capture notes to any bookmarked database
- **[Bookmarks](../bookmark.md)** — Save shortcuts to frequently-used databases
- **[Simple Properties](simple-properties.md)** — Flat JSON format for page properties
- **[Authentication Setup](authentication-setup.md)** — Get your token and configure the CLI
