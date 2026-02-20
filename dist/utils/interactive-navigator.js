"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.NAV_QUIT = exports.NAV_BACK = void 0;
exports.extractNavigableItems = extractNavigableItems;
exports.buildChoices = buildChoices;
exports.startNavigator = startNavigator;
const select_1 = require("@inquirer/select");
const notion_1 = require("../notion");
const errors_1 = require("../errors");
// Sentinel values for navigation actions
exports.NAV_BACK = '__nav_back__';
exports.NAV_QUIT = '__nav_quit__';
/**
 * Extract navigable items (child pages and databases) from page structure.
 * Pure function — no side effects.
 *
 * @param structure - The structure array from mapPageStructure()
 * @returns Filtered list of navigable items
 */
function extractNavigableItems(structure) {
    return structure
        .filter((item) => item.type === 'child_page' || item.type === 'child_database')
        .map((item) => ({
        id: item.id,
        title: item.title || 'Untitled',
        type: item.type,
    }));
}
/**
 * Build choices array for @inquirer/select.
 * Pure function — no side effects.
 *
 * @param items - Navigable items to display
 * @param hasParent - Whether to show ".. Back" option
 * @returns Choices array with navigation items, Back, and Quit
 */
function buildChoices(items, hasParent) {
    const choices = [];
    // Back option at top when not at root
    if (hasParent) {
        choices.push({ name: '.. Back', value: exports.NAV_BACK });
    }
    // Child pages and databases
    for (const item of items) {
        const prefix = item.type === 'child_database' ? '[DB] ' : '';
        choices.push({ name: `${prefix}${item.title}`, value: item.id });
    }
    // Quit at bottom
    choices.push({ name: '[Quit]', value: exports.NAV_QUIT });
    return choices;
}
// Default deps use real implementations
const defaultDeps = {
    selectFn: (config) => (0, select_1.default)(config),
    fetchStructure: notion_1.mapPageStructure,
};
/**
 * Main interactive navigation loop.
 * Fetches page structure, displays select prompt, navigates on selection.
 *
 * @param startPageId - The page ID to start navigating from
 * @param log - Logging function (typically this.log from oclif)
 * @param deps - Injectable dependencies (for testing)
 */
async function startNavigator(startPageId, log, deps = defaultDeps) {
    // Guard: must be interactive terminal
    if (!process.stdin.isTTY) {
        throw new errors_1.NotionCLIError(errors_1.NotionCLIErrorCode.VALIDATION_ERROR, 'browse requires an interactive terminal (TTY)', [{ description: 'Run this command in a terminal, not piped or in CI' }]);
    }
    // Navigation history stack — push on enter, pop on back
    const history = [];
    let currentPageId = startPageId;
    // Navigation loop
    while (true) {
        let pageData;
        try {
            pageData = await deps.fetchStructure(currentPageId);
        }
        catch (error) {
            throw error instanceof errors_1.NotionCLIError ? error : (0, errors_1.wrapNotionError)(error, {
                resourceType: 'page',
                attemptedId: currentPageId,
                endpoint: 'pages.retrieve',
            });
        }
        const items = extractNavigableItems(pageData.structure);
        const icon = pageData.icon || '';
        const header = `${icon}${icon ? ' ' : ''}${pageData.title}  (${items.length} children)`;
        log(`\n${header}`);
        const choices = buildChoices(items, history.length > 0);
        // Nothing to navigate if no children and no parent
        if (items.length === 0 && history.length === 0) {
            log('No child pages or databases found.');
            return;
        }
        const selected = await deps.selectFn({
            message: 'Navigate to:',
            choices,
        });
        if (selected === exports.NAV_QUIT) {
            return;
        }
        if (selected === exports.NAV_BACK) {
            // Pop from history to go back
            currentPageId = history.pop();
            continue;
        }
        // Navigate into selected page
        history.push(currentPageId);
        currentPageId = selected;
    }
}
