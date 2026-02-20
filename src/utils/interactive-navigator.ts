/**
 * Interactive Page Navigator
 *
 * Provides arrow-key navigation through Notion page trees.
 * Reuses mapPageStructure() for cached, parallel data fetching.
 *
 * Exported functions:
 * - extractNavigableItems(): filters child_page/child_database from structure (pure)
 * - buildChoices(): builds @inquirer/select choices array (pure)
 * - startNavigator(): main navigation loop (side-effectful)
 */

import select from '@inquirer/select'
import { mapPageStructure } from '../notion'
import { NotionCLIError, NotionCLIErrorCode, wrapNotionError } from '../errors'

/** A navigable item extracted from page structure */
export interface NavigableItem {
  id: string
  title: string
  type: 'child_page' | 'child_database'
}

/** A choice for the select prompt */
export interface NavigatorChoice {
  name: string
  value: string
}

// Sentinel values for navigation actions
export const NAV_BACK = '__nav_back__'
export const NAV_QUIT = '__nav_quit__'

/**
 * Extract navigable items (child pages and databases) from page structure.
 * Pure function — no side effects.
 *
 * @param structure - The structure array from mapPageStructure()
 * @returns Filtered list of navigable items
 */
export function extractNavigableItems(
  structure: Array<{ type: string; id: string; title?: string }>
): NavigableItem[] {
  return structure
    .filter((item) => item.type === 'child_page' || item.type === 'child_database')
    .map((item) => ({
      id: item.id,
      title: item.title || 'Untitled',
      type: item.type as 'child_page' | 'child_database',
    }))
}

/**
 * Build choices array for @inquirer/select.
 * Pure function — no side effects.
 *
 * @param items - Navigable items to display
 * @param hasParent - Whether to show ".. Back" option
 * @returns Choices array with navigation items, Back, and Quit
 */
export function buildChoices(
  items: NavigableItem[],
  hasParent: boolean
): NavigatorChoice[] {
  const choices: NavigatorChoice[] = []

  // Back option at top when not at root
  if (hasParent) {
    choices.push({ name: '.. Back', value: NAV_BACK })
  }

  // Child pages and databases
  for (const item of items) {
    const prefix = item.type === 'child_database' ? '[DB] ' : ''
    choices.push({ name: `${prefix}${item.title}`, value: item.id })
  }

  // Quit at bottom
  choices.push({ name: '[Quit]', value: NAV_QUIT })

  return choices
}

/** Dependencies injectable for testing */
export interface NavigatorDeps {
  selectFn: (config: { message: string; choices: NavigatorChoice[] }) => Promise<string>
  fetchStructure: (pageId: string) => ReturnType<typeof mapPageStructure>
}

// Default deps use real implementations
const defaultDeps: NavigatorDeps = {
  selectFn: (config) => select(config),
  fetchStructure: mapPageStructure,
}

/**
 * Main interactive navigation loop.
 * Fetches page structure, displays select prompt, navigates on selection.
 *
 * @param startPageId - The page ID to start navigating from
 * @param log - Logging function (typically this.log from oclif)
 * @param deps - Injectable dependencies (for testing)
 */
export async function startNavigator(
  startPageId: string,
  log: (msg: string) => void,
  deps: NavigatorDeps = defaultDeps
): Promise<void> {
  // Guard: must be interactive terminal
  if (!process.stdin.isTTY) {
    throw new NotionCLIError(
      NotionCLIErrorCode.VALIDATION_ERROR,
      'browse requires an interactive terminal (TTY)',
      [{ description: 'Run this command in a terminal, not piped or in CI' }]
    )
  }

  // Navigation history stack — push on enter, pop on back
  const history: string[] = []
  let currentPageId = startPageId

  // Navigation loop
  while (true) {
    let pageData
    try {
      pageData = await deps.fetchStructure(currentPageId)
    } catch (error) {
      throw error instanceof NotionCLIError ? error : wrapNotionError(error, {
        resourceType: 'page',
        attemptedId: currentPageId,
        endpoint: 'pages.retrieve',
      })
    }

    const items = extractNavigableItems(pageData.structure)
    const icon = pageData.icon || ''
    const header = `${icon}${icon ? ' ' : ''}${pageData.title}  (${items.length} children)`
    log(`\n${header}`)

    const choices = buildChoices(items, history.length > 0)

    // Nothing to navigate if no children and no parent
    if (items.length === 0 && history.length === 0) {
      log('No child pages or databases found.')
      return
    }

    const selected = await deps.selectFn({
      message: 'Navigate to:',
      choices,
    })

    if (selected === NAV_QUIT) {
      return
    }

    if (selected === NAV_BACK) {
      // Pop from history to go back
      currentPageId = history.pop()!
      continue
    }

    // Navigate into selected page
    history.push(currentPageId)
    currentPageId = selected
  }
}
