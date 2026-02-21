"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@oclif/core");
const notion = require("../notion");
const notion_resolver_1 = require("../utils/notion-resolver");
const bookmarks_1 = require("../utils/bookmarks");
const markdown_to_blocks_1 = require("../utils/markdown-to-blocks");
const base_flags_1 = require("../base-flags");
const errors_1 = require("../errors");
/**
 * Zero-friction page creation for quick thoughts and notes.
 *
 * Uses the default bookmark (or --to flag) to know which database to target.
 * Title is the first line; remaining lines become page body as markdown blocks.
 *
 * Supports stdin piping: echo "notes" | notion-cli quick --title "From pipe"
 */
class Quick extends core_1.Command {
    async run() {
        const { args, flags } = await this.parse(Quick);
        try {
            // 1. Get content — from arg or stdin
            let content = args.content || '';
            if (!content && !process.stdin.isTTY) {
                content = await this.readStdin();
            }
            if (!content && !flags.title) {
                this.error('Provide content as argument or pipe via stdin.\n' +
                    'Usage: notion-cli quick "My note"\n' +
                    '   or: echo "notes" | notion-cli quick --title "Title"');
                process.exit(1);
                return;
            }
            // 2. Determine target database
            const target = flags.to || await (0, bookmarks_1.getDefaultBookmark)();
            if (!target) {
                this.error('No target database specified and no default bookmark set.\n' +
                    'Set a default: notion-cli bookmark set inbox DB_ID --default\n' +
                    '   or specify: notion-cli quick "note" --to DB_NAME_OR_ID');
                process.exit(1);
                return;
            }
            const dbId = await (0, notion_resolver_1.resolveNotionId)(target, 'database');
            // 3. Get database schema to find the title property name
            const schema = await notion.retrieveDataSource(dbId);
            const titlePropName = findTitleProperty(schema);
            // 4. Split content into title + body
            const lines = content.split('\n');
            const pageTitle = flags.title || lines[0].trim();
            const body = flags.title ? content : lines.slice(1).join('\n').trim();
            // 5. Build page properties
            const properties = {
                [titlePropName]: {
                    title: [{ text: { content: pageTitle } }]
                }
            };
            // 6. Build children blocks from body markdown (if any)
            const children = body ? (0, markdown_to_blocks_1.markdownToBlocks)(body) : undefined;
            // 7. Create page
            const res = await notion.createPage({
                parent: { data_source_id: dbId },
                properties,
                ...(children && { children }),
            });
            // 8. Output
            if (flags.json) {
                this.log(JSON.stringify({
                    success: true,
                    data: res,
                    timestamp: new Date().toISOString()
                }, null, 2));
            }
            else {
                this.log(`Created: ${pageTitle}`);
                this.log(res.url);
            }
            process.exit(0);
        }
        catch (error) {
            const cliError = error instanceof errors_1.NotionCLIError
                ? error
                : (0, errors_1.wrapNotionError)(error, { endpoint: 'pages.create', resourceType: 'page' });
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
Quick.description = 'Quick-capture a page to a bookmarked database';
Quick.aliases = ['q'];
Quick.examples = [
    {
        description: 'Add a quick note to default database',
        command: '$ notion-cli quick "Buy groceries"',
    },
    {
        description: 'Add to a specific bookmark',
        command: '$ notion-cli quick "Fix login bug" --to tasks',
    },
    {
        description: 'Pipe content from stdin',
        command: '$ echo "Meeting notes here" | notion-cli quick --title "Standup"',
    },
];
Quick.args = {
    content: core_1.Args.string({ required: false, description: 'Page content (first line = title, rest = body)' }),
};
Quick.flags = {
    to: core_1.Flags.string({
        description: 'Target bookmark name, database name, or ID (defaults to default bookmark)',
    }),
    title: core_1.Flags.string({
        char: 't',
        description: 'Override title (useful with stdin piping)',
    }),
    ...base_flags_1.AutomationFlags,
};
exports.default = Quick;
/**
 * Find the title property name in a database schema.
 * Notion databases always have exactly one title property, but its name varies.
 */
function findTitleProperty(schema) {
    if (schema.properties) {
        for (const [name, prop] of Object.entries(schema.properties)) {
            if (prop.type === 'title')
                return name;
        }
    }
    // Fallback — most common default
    return 'Name';
}
