---
agent:
  name: InteractiveNavigator
  type: utility
  status: production
  version: "1.0"

component:
  source_files:
    - src/utils/interactive-navigator.ts  # navigation logic, UI loop, data extraction
    - src/commands/browse.ts              # oclif command shell, arg parsing, error boundary
  test_files:
    - test/utils/interactive-navigator.test.ts  # 19 tests: pure functions + mocked integration
    - test/commands/browse.test.ts              # 4 tests: command metadata
  entry_point: startNavigator()
  dependency: "@inquirer/select"

execution:
  api_calls_per_step: 2                 # pages.retrieve + blocks.children.list (parallel)
  parallelizable: true                  # Promise.all in mapPageStructure()
  caching: in-memory                    # benefits from CacheManager TTL
  requires_tty: true

navigation:
  input_formats:
    - raw_hex_id           # 1fb79d4c71bb8032b722c82305b63a00
    - dashed_uuid          # 1fb79d4c-71bb-8032-b722-c82305b63a00
    - notion_url_bare      # https://notion.so/1fb79d4c71bb8032b722c82305b63a00
    - notion_url_slug      # https://notion.so/My-Page-1fb79d4c71bb8032b722c82305b63a00
    - notion_url_workspace # https://notion.so/workspace/Page-1fb79d4c71bb8032b722c82305b63a00
    - page_name            # "Meeting Notes" (via cache or API search)
  resolver: resolveNotionId(input, 'page')  # src/utils/notion-resolver.ts:60
  data_source: mapPageStructure()           # src/notion.ts:634
  history_model: stack                      # string[] — push on enter, pop on back
  navigable_types:
    - child_page
    - child_database

exports:
  functions:
    - name: extractNavigableItems
      location: "src/utils/interactive-navigator.ts:41"
      pure: true
      description: "Filters child_page and child_database from mapPageStructure() structure array"
    - name: buildChoices
      location: "src/utils/interactive-navigator.ts:61"
      pure: true
      description: "Builds @inquirer/select choices array with .. Back, items, and [Quit]"
    - name: startNavigator
      location: "src/utils/interactive-navigator.ts:104"
      pure: false
      description: "Main event loop: fetch → display → prompt → navigate"
  interfaces:
    - name: NavigableItem
      location: "src/utils/interactive-navigator.ts:18"
      fields: [id, title, type]
    - name: NavigatorChoice
      location: "src/utils/interactive-navigator.ts:25"
      fields: [name, value]
    - name: NavigatorDeps
      location: "src/utils/interactive-navigator.ts:85"
      fields: [selectFn, fetchStructure]
      purpose: "Dependency injection for testing (ESM modules cannot be sinon-stubbed)"
  constants:
    - name: NAV_BACK
      location: "src/utils/interactive-navigator.ts:31"
      value: "__nav_back__"
    - name: NAV_QUIT
      location: "src/utils/interactive-navigator.ts:32"
      value: "__nav_quit__"

errors:
  - code: VALIDATION_ERROR
    trigger: "process.stdin.isTTY is false"
    source: "src/utils/interactive-navigator.ts:110"
    message: "browse requires an interactive terminal (TTY)"
    retryable: false
  - code: RESOURCE_NOT_FOUND
    trigger: "Notion API 404"
    source: "src/utils/interactive-navigator.ts:128"
    message: "Wrapped via wrapNotionError()"
    retryable: false
  - code: UNAUTHORIZED
    trigger: "Notion API 401"
    source: "src/commands/browse.ts:35"
    message: "Wrapped via wrapNotionError()"
    retryable: false
---

# Interactive Navigator Architecture

This document describes the internal design of the `browse` command and its supporting utility `interactive-navigator.ts`. It covers the component structure, data flow, navigation model, and testing strategy.

---

## Component Overview

The feature is split into two files following the Single Responsibility Principle:

```
src/commands/browse.ts               ← oclif command shell (arg parsing, error boundary)
src/utils/interactive-navigator.ts   ← navigation logic (UI loop, data extraction)
```

**`browse.ts`** [`src/commands/browse.ts:6`](../../src/commands/browse.ts) is a thin command. It resolves the page ID via `resolveNotionId()`, calls `startNavigator()`, and catches errors. It has no business logic of its own.

**`interactive-navigator.ts`** [`src/utils/interactive-navigator.ts`](../../src/utils/interactive-navigator.ts) exports three functions, three interfaces, and two constants:

| Export | Kind | Pure? | Location | Purpose |
|---|---|---|---|---|
| `extractNavigableItems(structure)` | Function | Yes | [`:41`](../../src/utils/interactive-navigator.ts) | Filters `child_page` and `child_database` from a `mapPageStructure()` result |
| `buildChoices(items, hasParent)` | Function | Yes | [`:61`](../../src/utils/interactive-navigator.ts) | Builds the `@inquirer/select` choices array with `.. Back` and `[Quit]` |
| `startNavigator(pageId, log, deps?)` | Function | No | [`:104`](../../src/utils/interactive-navigator.ts) | Main event loop: fetch → display → prompt → navigate |
| `NavigableItem` | Interface | — | [`:18`](../../src/utils/interactive-navigator.ts) | `{ id: string, title: string, type: 'child_page' \| 'child_database' }` |
| `NavigatorChoice` | Interface | — | [`:25`](../../src/utils/interactive-navigator.ts) | `{ name: string, value: string }` |
| `NavigatorDeps` | Interface | — | [`:85`](../../src/utils/interactive-navigator.ts) | `{ selectFn, fetchStructure }` — injectable dependencies for testing |
| `NAV_BACK` | Constant | — | [`:31`](../../src/utils/interactive-navigator.ts) | `'__nav_back__'` — sentinel value for back navigation |
| `NAV_QUIT` | Constant | — | [`:32`](../../src/utils/interactive-navigator.ts) | `'__nav_quit__'` — sentinel value for quit action |

---

## Data Flow

```
User runs: notion-cli browse <input>
    │
    ▼
browse.ts:30 — this.parse(Browse)
    │
    ▼
browse.ts:33 — resolveNotionId(args.page_id, 'page')
    │  Resolves URL / ID / name → clean 32-hex ID
    │  Source: src/utils/notion-resolver.ts:60
    │
    ▼
browse.ts:34 — startNavigator(pageId, this.log.bind(this))
    │
    ▼
┌─────────────── Navigation Loop ───────────────┐
│  Source: src/utils/interactive-navigator.ts:123│
│                                                │
│  1. deps.fetchStructure(currentPageId)  [:126] │
│     └─ mapPageStructure() → { title, icon,     │
│        structure: [{type, id, title}, ...] }   │
│     └─ Source: src/notion.ts:634               │
│     └─ Makes 2 parallel API calls:             │
│        pages.retrieve + blocks.children.list   │
│                                                │
│  2. extractNavigableItems(structure)    [:135] │
│     └─ Filters to child_page + child_database  │
│     └─ Defaults empty titles to "Untitled"     │
│                                                │
│  3. buildChoices(items, history.length > 0)    │
│                                          [:140]│
│     └─ Prepends ".. Back" if not at root       │
│     └─ Prefixes databases with "[DB]"          │
│     └─ Appends "[Quit]" at the end             │
│                                                │
│  4. Display header                      [:138] │
│     "<icon> <title>  (N children)"             │
│                                                │
│  5. deps.selectFn(choices)              [:148] │
│     User picks an item via arrow keys          │
│     ├─ NAV_QUIT  → return (exit loop)   [:153] │
│     ├─ NAV_BACK  → pop history          [:158] │
│     └─ page ID   → push current to      [:164] │
│                     history, continue          │
│                                                │
│  6. Special case: 0 items AND no history [:143]│
│     └─ Print "No child pages..." and return    │
│                                                │
└────────────────────────────────────────────────┘
```

### API Usage Per Navigation Step

Each iteration of the loop calls `mapPageStructure()` [`src/notion.ts:634`](../../src/notion.ts), which internally makes **two parallel API requests**:

1. `pages.retrieve(pageId)` — page metadata (title, icon, properties)
2. `blocks.children.list(pageId)` — block children (structure items)

These run in `Promise.all` [`src/notion.ts:647`](../../src/notion.ts) and benefit from the existing in-memory cache. Navigating back to a previously visited page within the cache TTL window does not trigger new API calls.

---

## Navigation Model

The navigator uses a **stack-based history** model [`src/utils/interactive-navigator.ts:119`](../../src/utils/interactive-navigator.ts):

```typescript
const history: string[] = []   // stack of page IDs
let currentPageId = startPageId
```

| User action | Stack operation | Code location | Result |
|---|---|---|---|
| Enter a child page | `history.push(currentPageId)` | [`:164`](../../src/utils/interactive-navigator.ts) | Dive deeper |
| Select `.. Back` | `currentPageId = history.pop()` | [`:159`](../../src/utils/interactive-navigator.ts) | Return to parent |
| Select `[Quit]` | (none) | [`:154`](../../src/utils/interactive-navigator.ts) | Exit function |

This is simpler than maintaining a full tree model. The stack grows by one entry per level navigated, so memory usage is negligible even for deeply nested pages.

### Sentinel Values

Two string constants act as sentinel values in the choices array to distinguish navigation actions from page IDs:

```typescript
// src/utils/interactive-navigator.ts:31-32
export const NAV_BACK = '__nav_back__'
export const NAV_QUIT = '__nav_quit__'
```

These cannot collide with real Notion IDs because Notion IDs are 32-character lowercase hex strings (`[a-f0-9]{32}`). The sentinels contain underscores and alphabetic characters outside hex range.

---

## TTY Guard

The navigator checks `process.stdin.isTTY` [`src/utils/interactive-navigator.ts:110`](../../src/utils/interactive-navigator.ts) before entering the loop. If `false`, it throws a `NotionCLIError` with code `VALIDATION_ERROR` and a suggestion to run the command in a terminal.

This prevents cryptic errors from `@inquirer/select` when stdin is not a terminal (piped input, CI runners, cron jobs).

---

## Dependency Injection for Testing

`@inquirer/select` is an ES Module. ES Module exports are read-only bindings per the ECMAScript spec, which means sinon cannot stub them. Instead of complex workarounds (like `proxyquire` or `esmock`), the navigator accepts an optional `deps` parameter [`src/utils/interactive-navigator.ts:107`](../../src/utils/interactive-navigator.ts):

```typescript
// src/utils/interactive-navigator.ts:85-88
export interface NavigatorDeps {
  selectFn: (config: { message: string; choices: NavigatorChoice[] }) => Promise<string>
  fetchStructure: (pageId: string) => ReturnType<typeof mapPageStructure>
}

// src/utils/interactive-navigator.ts:104-108
export async function startNavigator(
  startPageId: string,
  log: (msg: string) => void,
  deps: NavigatorDeps = defaultDeps   // defaults to real implementations
): Promise<void> { ... }
```

In production, callers omit `deps` and get the real `select` + `mapPageStructure`. In tests, callers inject mock functions that return predetermined responses. See [`test/utils/interactive-navigator.test.ts:120-133`](../../test/utils/interactive-navigator.test.ts) for the `makeDeps()` test helper.

### Test Coverage

| Test file | Tests | What it covers |
|---|---|---|
| [`test/utils/interactive-navigator.test.ts`](../../test/utils/interactive-navigator.test.ts) | 19 | `extractNavigableItems` (5): filter, empty, default title. `buildChoices` (6): back/quit placement, DB prefix, empty lists. `startNavigator` (8): quit, enter, back, empty page, icon display, TTY guard, API error, child count |
| [`test/commands/browse.test.ts`](../../test/commands/browse.test.ts) | 4 | Command metadata: description, alias, required arg, examples |

---

## Error Handling

Errors are handled at two levels:

**Level 1 — `startNavigator()`** [`src/utils/interactive-navigator.ts:127-132`](../../src/utils/interactive-navigator.ts):
Wraps API errors from `fetchStructure()` using `wrapNotionError()`, converting Notion API errors into `NotionCLIError` instances with human-readable messages and suggestions. Also throws `VALIDATION_ERROR` if not in TTY.

**Level 2 — `browse.ts`** [`src/commands/browse.ts:35-43`](../../src/commands/browse.ts):
Catches any error from `startNavigator()` or `resolveNotionId()`. If the error is already a `NotionCLIError`, it is used directly. Otherwise, it is wrapped with `wrapNotionError()`. The command outputs `cliError.toHumanString()` and exits with code 1.

### Error Code Reference

| Code | Trigger | Source Location | Message | Retryable |
|---|---|---|---|---|
| `VALIDATION_ERROR` | `process.stdin.isTTY === false` | [`interactive-navigator.ts:110`](../../src/utils/interactive-navigator.ts) | "browse requires an interactive terminal (TTY)" | No |
| `VALIDATION_ERROR` | Invalid PAGE_ID format | [`notion-resolver.ts:65`](../../src/utils/notion-resolver.ts) | "Invalid input: expected a page name, ID, or URL" | No |
| `RESOURCE_NOT_FOUND` | Notion API 404 | [`interactive-navigator.ts:128`](../../src/utils/interactive-navigator.ts) | "Integration may not have access" | No |
| `UNAUTHORIZED` | Notion API 401 | [`browse.ts:35`](../../src/commands/browse.ts) | "Authentication failed" | No |
| `RATE_LIMITED` | Notion API 429 | `wrapNotionError()` | "Rate limit exceeded" | Yes (auto-retry if `--retry` used in other commands; browse does not support `--retry`) |

This two-level approach means the navigator utility is reusable outside the oclif command without losing error context.

---

## Executable Commands

### Run All Tests

```bash
# Navigator logic (pure functions + integration mocks)
npm test -- --grep "interactive-navigator"

# Command metadata
npm test -- --grep "browse command"

# Both together
npm test -- --grep "interactive-navigator|browse command"
```

### Validate Build

```bash
npm run build && npm test && npm run lint
```

### Lint Only New Files

```bash
npx eslint src/commands/browse.ts src/utils/interactive-navigator.ts \
  test/commands/browse.test.ts test/utils/interactive-navigator.test.ts
```

### Verify Command Registers

```bash
# Both the primary name and alias should show help
notion-cli browse --help
notion-cli nav --help
```

### Debug Navigation

```bash
# Enable debug logging to trace ID resolution, API calls, and cache behavior
export DEBUG=notion-cli:*
notion-cli browse <page_id>
# Look for: resolution stage logs, mapPageStructure calls, cache hit/miss
```

---

**Last Updated**: 2026-02-20
**Component Status**: Production
**Evidence Citations**: 25+ file:line references
**Machine-Readable**: YAML frontmatter with exports, errors, execution metadata
**Source**: [`src/utils/interactive-navigator.ts`](../../src/utils/interactive-navigator.ts), [`src/commands/browse.ts`](../../src/commands/browse.ts)

---

## Related Documentation

- **[Command Reference](../browse.md)** — usage, arguments, error table, executable commands
- **[Interactive Browsing Guide](../user-guides/interactive-browsing.md)** — user-facing walkthrough with examples
- **[Smart ID Resolution](smart-id-resolution.md)** — how `resolveNotionId()` handles all input formats
- **[Caching](caching.md)** — how `mapPageStructure()` results are cached in memory
- **[Error Handling](error-handling.md)** — `NotionCLIError`, `wrapNotionError()`, error code system
