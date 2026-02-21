# Fuzzy Search Guide

Find databases and pages by name even when you misspell them. The CLI uses Levenshtein distance (edit distance) to tolerate typos in two places: the name resolver and the `list` command filter.

## When to Use This

- You misspell a database name and want the CLI to figure out what you meant
- You want to filter the `list` output to find databases quickly
- You use the CLI in scripts where exact spelling is not guaranteed
- You work with databases that have long or hard-to-type names

## Prerequisites

- Notion CLI installed and configured (`notion-cli whoami` works)
- Workspace synced (`notion-cli sync`) so database names are cached locally

---

## Filter the Database List

The `list` command accepts a `--filter` (or `-f`) flag that narrows results using fuzzy matching. Databases whose titles contain the query as a substring appear first, followed by databases where a word in the title is within edit distance of the query.

### Exact substring match

```bash
notion-cli list --filter "daily"
```

Returns all databases with "daily" anywhere in the title: "5-Minute Daily Log", "Daily Finance Lecture", "Daily Psychology Lecture", etc.

### Typo-tolerant match

```bash
notion-cli list --filter "daly"
```

"daly" is one edit away from "daily", so the same databases appear. The CLI splits each title into words and checks the Levenshtein distance of the query against each word individually.

### Short flag

```bash
notion-cli list -f "knowldge"
```

Finds "Knowledge Hub" — "knowldge" is one edit away from "knowledge".

### Combined with output formats

```bash
notion-cli list --filter "tasks" --json
notion-cli list -f "tasks" --markdown
notion-cli list -f "tasks" --pretty
```

The filter applies before any output formatting, so `--json`, `--markdown`, and `--pretty` all work.

---

## Typo-Tolerant Name Resolution

Every command that accepts a database or page name (not just `list`) runs through the resolver. The resolver now has four stages before falling back to the Notion API:

1. **Exact title** — "Knowledge Hub" matches "Knowledge Hub"
2. **Alias** — "kh" matches "Knowledge Hub" (aliases generated during sync)
3. **Substring** — "knowledge" matches "Knowledge Hub"
4. **Fuzzy** — "knowldge hub" matches "Knowledge Hub" (1 edit distance)

This means you can use a slightly misspelled name in any command:

```bash
# These all resolve to "Knowledge Hub"
notion-cli db schema "Knowledge Hub"       # exact
notion-cli db schema "kh"                  # alias
notion-cli db schema "knowledge"           # substring
notion-cli db schema "knowldge hub"        # fuzzy (1 typo)
```

```bash
# Works in any command that accepts a name
notion-cli db query "donna developmnet"    # resolves "Donna Development"
notion-cli open "5-minite daily log"       # resolves "5-Minute Daily Log"
```

### When fuzzy resolution is skipped

The fuzzy stage only runs when the first three stages (exact, alias, substring) all fail. If any of them match, the resolver returns immediately without computing edit distances. This keeps the common case fast.

If the fuzzy stage also fails (the typo is too far from any known name), the resolver falls through to the Notion API search, which does its own server-side matching.

---

## How the Threshold Works

The CLI uses a dynamic threshold to decide how many typos are allowed:

```
threshold = max(2, floor(query_length / 4))
```

| Query length | Threshold | Example |
|-------------|-----------|---------|
| 1-8 chars | 2 edits | "task" (4 chars) → up to 2 typos |
| 9-11 chars | 2 edits | "knowledge" (9 chars) → up to 2 typos |
| 12-15 chars | 3 edits | "daily finance" (13 chars) → up to 3 typos |
| 16-19 chars | 4 edits | "donna development" (17 chars) → up to 4 typos |
| 20+ chars | 5+ edits | Scales at ~25% of query length |

Short names are strict (to avoid false positives). Longer names allow more tolerance.

---

## How Filtering Differs from Resolution

| Behavior | `list --filter` | Name resolver |
|----------|----------------|---------------|
| **Purpose** | Narrow a list | Find one database |
| **Compares against** | Individual words in title | Full title + all aliases |
| **Returns** | All matches, sorted by relevance | Single best match |
| **Used by** | `list` command only | Every command that accepts a name |

The `list` filter splits each database title into words (by spaces, hyphens, underscores) and checks the query against each word. This means `--filter "daly"` finds "5-Minute **Daily** Log" because "daly" is 1 edit from the word "daily".

The resolver compares the full query against the full title and every alias. This means `"knowldge hub"` matches `"knowledge hub"` (1 edit on the full string). It does not split into words — it treats the input as a complete name.

---

## Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| Filter returns no results | Typo is too far from any title word | Try a shorter or more specific query |
| Wrong database resolved | Two databases have similar names | Use the full exact name or the database ID |
| `Workspace not synced` error | No cache exists | Run `notion-cli sync` first |
| Stale results | Cache is outdated | Run `notion-cli sync` to refresh |

---

## Related Documentation

- **[Smart ID Resolution](../architecture/smart-id-resolution.md)** — Full resolver pipeline architecture
- **[Caching](../architecture/caching.md)** — How the workspace cache works
- **[Output Formats](output-formats.md)** — JSON, CSV, YAML, and table output options
