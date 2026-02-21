"use strict";
/**
 * Append Shortcut Command
 *
 * Quick-append content to any existing Notion page by name, URL, ID, or bookmark.
 * Combines resolveNotionId (name → page ID) with appendBlockChildren (content → blocks).
 *
 * This is the "write to existing page" counterpart of `quick` (which creates new pages).
 *
 *   notion-cli append "Daily Log" "New note"
 *   notion-cli append PAGE_URL "## Heading\n\nBody"
 *   echo "piped text" | notion-cli append "Daily Log"
 */
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@oclif/core");
const notion = require("../notion");
const notion_resolver_1 = require("../utils/notion-resolver");
const markdown_to_blocks_1 = require("../utils/markdown-to-blocks");
const base_flags_1 = require("../base-flags");
const errors_1 = require("../errors");
class Append extends core_1.Command {
    async run() {
        const { args, flags } = await this.parse(Append);
        // 1. Get content — from arg or stdin (checked before try/catch so oclif
        //    error() isn't accidentally caught by the NotionCLIError handler)
        let content = args.content || '';
        if (!content && !process.stdin.isTTY) {
            content = await this.readStdin();
        }
        if (!content) {
            this.log('No content provided.\n' +
                'Usage: notion-cli append "Page Name" "content to add"\n' +
                '   or: echo "content" | notion-cli append "Page Name"');
            process.exit(1);
            return;
        }
        try {
            // 2. Resolve target page — supports names, URLs, IDs, bookmarks, fuzzy
            const pageId = await (0, notion_resolver_1.resolveNotionId)(args.target, 'page');
            // 3. Convert markdown content to Notion blocks
            const children = (0, markdown_to_blocks_1.markdownToBlocks)(content);
            // 4. Append blocks to the page
            const res = await notion.appendBlockChildren({
                block_id: pageId,
                children,
            });
            // 5. Output
            if (flags.json) {
                this.log(JSON.stringify({
                    success: true,
                    data: res,
                    timestamp: new Date().toISOString(),
                }, null, 2));
            }
            else {
                this.log(`Appended to: ${args.target}`);
                this.log(`${res.results.length} block(s) added`);
            }
            process.exit(0);
        }
        catch (error) {
            const cliError = error instanceof errors_1.NotionCLIError
                ? error
                : (0, errors_1.wrapNotionError)(error, {
                    endpoint: 'blocks.children.append',
                    resourceType: 'page',
                    attemptedId: args.target,
                });
            if (flags.json) {
                this.log(JSON.stringify(cliError.toJSON(), null, 2));
            }
            else {
                this.error(cliError.toHumanString());
            }
            process.exit(1);
        }
    }
    /** Read all data from stdin (for piped input). */
    readStdin() {
        return new Promise((resolve) => {
            const chunks = [];
            process.stdin.on('data', (chunk) => chunks.push(chunk));
            process.stdin.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8').trim()));
        });
    }
}
Append.description = 'Append content to an existing page by name, URL, or ID';
Append.aliases = ['a'];
Append.examples = [
    {
        description: 'Append text to a page by name',
        command: '$ notion-cli append "Daily Log" "New note to add"',
    },
    {
        description: 'Append markdown content',
        command: '$ notion-cli append "Knowledge Hub" "## Section\\n\\nSome content"',
    },
    {
        description: 'Pipe content from stdin',
        command: '$ echo "Piped content" | notion-cli append "Daily Log"',
    },
    {
        description: 'Use page URL or ID directly',
        command: '$ notion-cli append PAGE_ID "Quick fix note" --json',
    },
];
Append.args = {
    target: core_1.Args.string({
        required: true,
        description: 'Page name, bookmark, URL, or ID',
    }),
    content: core_1.Args.string({
        required: false,
        description: 'Markdown content to append',
    }),
};
Append.flags = {
    ...base_flags_1.AutomationFlags,
};
exports.default = Append;
