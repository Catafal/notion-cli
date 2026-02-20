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
import { mapPageStructure } from '../notion';
/** A navigable item extracted from page structure */
export interface NavigableItem {
    id: string;
    title: string;
    type: 'child_page' | 'child_database';
}
/** A choice for the select prompt */
export interface NavigatorChoice {
    name: string;
    value: string;
}
export declare const NAV_BACK = "__nav_back__";
export declare const NAV_QUIT = "__nav_quit__";
/**
 * Extract navigable items (child pages and databases) from page structure.
 * Pure function — no side effects.
 *
 * @param structure - The structure array from mapPageStructure()
 * @returns Filtered list of navigable items
 */
export declare function extractNavigableItems(structure: Array<{
    type: string;
    id: string;
    title?: string;
}>): NavigableItem[];
/**
 * Build choices array for @inquirer/select.
 * Pure function — no side effects.
 *
 * @param items - Navigable items to display
 * @param hasParent - Whether to show ".. Back" option
 * @returns Choices array with navigation items, Back, and Quit
 */
export declare function buildChoices(items: NavigableItem[], hasParent: boolean): NavigatorChoice[];
/** Dependencies injectable for testing */
export interface NavigatorDeps {
    selectFn: (config: {
        message: string;
        choices: NavigatorChoice[];
    }) => Promise<string>;
    fetchStructure: (pageId: string) => ReturnType<typeof mapPageStructure>;
}
/**
 * Main interactive navigation loop.
 * Fetches page structure, displays select prompt, navigates on selection.
 *
 * @param startPageId - The page ID to start navigating from
 * @param log - Logging function (typically this.log from oclif)
 * @param deps - Injectable dependencies (for testing)
 */
export declare function startNavigator(startPageId: string, log: (msg: string) => void, deps?: NavigatorDeps): Promise<void>;
