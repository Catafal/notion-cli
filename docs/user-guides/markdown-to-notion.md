# Markdown to Notion Conversion

The CLI converts markdown text into Notion blocks whenever you provide content as a string or file. This page documents every supported markdown feature, how it maps to Notion, and what the parser does not handle.

## Where It Applies

The markdown parser runs in **five commands**:

| Command | How markdown enters |
|---------|---------------------|
| `page create -f ./file.md` | Reads a `.md` file and creates a page from its content |
| `append "Page" "markdown text"` | Converts the body argument to blocks |
| `quick "Title" --body "markdown"` | Converts the `--body` text to blocks |
| `daily "markdown text"` | Converts the journal entry to blocks |
| `template use name -d DB_ID` | Converts the template's saved content to blocks |

In all five cases, the same `markdownToBlocks()` function does the conversion. The behavior is identical everywhere.

---

## Block Types

Block types are structural elements that occupy their own line(s) in markdown. Each becomes a separate Notion block.

### Headings

```markdown
# Heading 1
## Heading 2
### Heading 3
```

| Markdown | Notion block type |
|----------|-------------------|
| `# text` | `heading_1` |
| `## text` | `heading_2` |
| `### text` | `heading_3` |

Headings support inline formatting (bold, italic, code, links, strikethrough) in the heading text. H4 and beyond (`####`) are not recognized as headings and fall through to paragraphs.

### Paragraphs

Any line that does not match another block type becomes a paragraph. Empty lines are skipped (they do not create empty paragraph blocks).

```markdown
This is a paragraph with **bold** and *italic* text.
```

### Bulleted Lists

```markdown
- Item one
- Item two
* Also a bullet item
```

Both `-` and `*` prefixes produce `bulleted_list_item` blocks. Each item supports inline formatting.

### Numbered Lists

```markdown
1. First item
2. Second item
3. Third item
```

Produces `numbered_list_item` blocks. The actual number in the markdown is ignored by Notion (it auto-numbers).

### Checkboxes

```markdown
- [ ] Unchecked task
- [x] Completed task
- [X] Also completed (uppercase X works)
```

| Markdown | Notion block | `checked` value |
|----------|-------------|-----------------|
| `- [ ] text` | `to_do` | `false` |
| `- [x] text` | `to_do` | `true` |
| `- [X] text` | `to_do` | `true` |

Checkbox content supports inline formatting. The parser detects checkboxes before bullet lists, so `- [ ] text` becomes a `to_do` block, not a `bulleted_list_item`.

### Code Blocks

````markdown
```javascript
const x = 42;
console.log(x);
```
````

Produces a `code` block with the specified language. If no language is given after the opening ` ``` `, the language defaults to `"plain text"`. Multi-line content is preserved exactly as written.

### Blockquotes

```markdown
> This is a quote
> Another quote line
```

Each `>` line becomes a separate `quote` block. Inline formatting works inside quotes.

### Tables

```markdown
| Feature    | Status |
|------------|--------|
| Checkboxes | Done   |
| Tables     | Done   |
```

Tables produce a single `table` block containing `table_row` children.

**How the parser handles tables:**

1. Collects all consecutive lines that start and end with `|`
2. Detects the separator row (`|---|---|`) to determine if the first row is a header
3. Filters out the separator row (it is structural, not data)
4. Splits each remaining row into cells by `|`
5. Applies `parseRichText` to each cell (bold, italic, code, links, and strikethrough all work inside cells)

| Markdown detail | Notion result |
|-----------------|---------------|
| Separator row present (`\|---\|`) | `has_column_header: true` |
| No separator row | `has_column_header: false` |
| Number of columns | Auto-detected from first row (`table_width`) |
| `has_row_header` | Always `false` |

**Example: table without a separator row** still renders. The rows become a table block with `has_column_header: false`:

```markdown
| A | B |
| 1 | 2 |
```

### Horizontal Rules

```markdown
---
***
___
```

Three or more `-`, `*`, or `_` characters on a line produce a `divider` block.

---

## Inline Formatting

Inline formatting applies within any block that contains text (paragraphs, headings, list items, checkboxes, blockquotes, and table cells).

| Markdown | Notion annotation | Example |
|----------|-------------------|---------|
| `**text**` | `bold: true` | **bold text** |
| `*text*` or `_text_` | `italic: true` | *italic text* |
| `~~text~~` | `strikethrough: true` | ~~struck text~~ |
| `` `text` `` | `code: true` | `inline code` |
| `[text](url)` | `link: { url }` | [link text](https://example.com) |

**Formatting priority:** The parser processes inline formatting in this order: bold (`**`), strikethrough (`~~`), italic (`*`/`_`), code (`` ` ``), links (`[]()`). The first matching delimiter wins. This means formatting nested inside a bold span (e.g., `` **bold with `code`** ``) renders the inner backticks as literal text within the bold span, not as a separate code annotation.

**Unclosed delimiters** do not crash the parser. If a `**` or `~~` is never closed, the text between the opening delimiter and end of line is treated as the annotated content.

---

## What the Parser Does Not Handle

These markdown features are not converted and fall through to paragraph blocks or are ignored:

| Feature | Reason |
|---------|--------|
| Nested lists (indented sub-items) | Requires children blocks; parser produces flat array |
| Images (`![alt](url)`) | Notion image blocks need external URLs; not implemented |
| HTML tags (`<div>`, `<br>`) | Treated as plain text |
| Footnotes (`[^1]`) | No Notion equivalent |
| H4+ headings (`####`) | Notion only supports H1-H3; falls through to paragraph |
| Definition lists | No Notion equivalent |

---

## Full Example

This markdown:

```markdown
# Project Plan

Tasks for this week:

- [x] Design the API
- [ ] Write tests
- [ ] Deploy to production

## Notes

The API uses **REST** with `JSON` responses. See the ~~old wiki~~ new docs.

| Endpoint  | Method | Status |
|-----------|--------|--------|
| /users    | GET    | Done   |
| /orders   | POST   | WIP    |

---

> Ship it when it's ready.
```

Produces these Notion blocks:

```
heading_1       → "Project Plan"
paragraph       → "Tasks for this week:"
to_do (checked) → "Design the API"
to_do           → "Write tests"
to_do           → "Deploy to production"
heading_2       → "Notes"
paragraph       → "The API uses REST with JSON responses. See the new docs."
                   (bold: "REST", code: "JSON", strikethrough: "old wiki")
table           → 2 columns, 3 rows (header + 2 data), has_column_header: true
                   cells: ["/users", "GET", "Done"], ["/orders", "POST", "WIP"]
divider         → ---
quote           → "Ship it when it's ready."
```

---

## Test Coverage

The parser has **54 tests** covering all block types, inline formatting, edge cases, and mixed content. Tests live at `test/utils/markdown-to-blocks.test.ts`.

To run them:

```bash
npm test -- --grep "markdown-to-blocks"
```

---

## Source Files

| File | Purpose |
|------|---------|
| [`src/utils/markdown-to-blocks.ts`](../../src/utils/markdown-to-blocks.ts) | Parser implementation (372 lines) |
| [`test/utils/markdown-to-blocks.test.ts`](../../test/utils/markdown-to-blocks.test.ts) | 54 tests covering all features |

## Related Documentation

- **[Page Export](../export.md)** — The reverse direction: Notion blocks to markdown
- **[Append Command](../append.md)** — Uses this parser for inline body text
- **[Templates Guide](templates-guide.md)** — Template content passes through this parser
- **[Daily Journal](daily-journal-setup.md)** — Daily entries use this parser for body content
