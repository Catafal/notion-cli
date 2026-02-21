/**
 * Converts markdown text to Notion block objects
 *
 * This is a simple, secure replacement for @tryfabric/martian's markdownToBlocks
 * to eliminate security vulnerabilities from the katex dependency chain.
 *
 * Supports:
 * - Headings (h1, h2, h3)
 * - Paragraphs
 * - Bulleted lists
 * - Numbered lists
 * - Checkboxes (to_do blocks)
 * - Code blocks
 * - Tables (with header detection)
 * - Quotes
 * - Bold, italic, strikethrough, and inline code formatting
 *
 * @param markdown - The markdown string to convert
 * @returns Array of Notion block objects
 */
export declare function markdownToBlocks(markdown: string): any[];
