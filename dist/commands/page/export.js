"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@oclif/core");
const fs = require("fs");
const path = require("path");
const notion = require("../../notion");
const notion_to_md_1 = require("notion-to-md");
const notion_resolver_1 = require("../../utils/notion-resolver");
const helper_1 = require("../../helper");
const base_flags_1 = require("../../base-flags");
const errors_1 = require("../../errors");
/**
 * Export a Notion page to a local file (markdown or JSON).
 *
 * This is the reverse of `page create -f`: instead of reading a local file
 * and pushing it to Notion, it pulls a Notion page and writes it locally.
 *
 * Markdown is the default format because it's human-readable and round-trips
 * well with `page create -f`. JSON is available via --json for automation
 * or lossless backups.
 */
class PageExport extends core_1.Command {
    async run() {
        const { args, flags } = await this.parse(PageExport);
        try {
            const pageId = await (0, notion_resolver_1.resolveNotionId)(args.page_id, 'page');
            // Choose format: JSON for structured data, markdown for human-readable
            let content;
            if (flags.json) {
                let page = await notion.retrievePage({ page_id: pageId });
                if (flags.minimal) {
                    page = (0, helper_1.stripMetadata)(page);
                }
                content = JSON.stringify(page, null, 2);
            }
            else {
                // notion-to-md handles all block fetching and conversion internally
                const n2m = new notion_to_md_1.NotionToMarkdown({ notionClient: notion.client });
                const mdBlocks = await n2m.pageToMarkdown(pageId);
                content = n2m.toMarkdownString(mdBlocks).parent;
            }
            // Write to file or stdout
            if (flags.output) {
                const resolvedPath = this.validateOutputPath(flags.output);
                fs.writeFileSync(resolvedPath, content, 'utf-8');
                this.log(`Exported to ${flags.output}`);
            }
            else {
                this.log(content);
            }
            process.exit(0);
        }
        catch (error) {
            const cliError = error instanceof errors_1.NotionCLIError
                ? error
                : (0, errors_1.wrapNotionError)(error, {
                    resourceType: 'page',
                    attemptedId: args.page_id,
                    endpoint: 'page.export'
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
    /**
     * Validate output path to prevent directory traversal attacks.
     * Ensures the resolved path stays within the current working directory.
     */
    validateOutputPath(filePath) {
        const basePath = path.resolve('./');
        const resolved = path.resolve(basePath, filePath);
        if (!resolved.startsWith(basePath)) {
            throw new errors_1.NotionCLIError('VALIDATION_ERROR', 'Invalid output path: must be within current directory', [{ description: 'Use a relative path', command: 'notion-cli page export PAGE_ID -o ./output.md' }]);
        }
        return resolved;
    }
}
PageExport.description = 'Export a Notion page to markdown or JSON';
PageExport.aliases = ['page:e'];
PageExport.examples = [
    {
        description: 'Export page as markdown to stdout',
        command: '$ notion-cli page export PAGE_ID',
    },
    {
        description: 'Export page as markdown to a file',
        command: '$ notion-cli page export PAGE_ID -o notes.md',
    },
    {
        description: 'Export page as JSON to a file',
        command: '$ notion-cli page export PAGE_ID --json -o page.json',
    },
    {
        description: 'Export using a Notion URL',
        command: '$ notion-cli page export "https://notion.so/My-Page-abc123" -o notes.md',
    },
    {
        description: 'Pipe markdown to another command',
        command: '$ notion-cli page export PAGE_ID | head -20',
    },
];
PageExport.args = {
    page_id: core_1.Args.string({
        required: true,
        description: 'Page ID or full Notion URL',
    }),
};
PageExport.flags = {
    output: core_1.Flags.string({
        char: 'o',
        description: 'File path to write (omit for stdout)',
    }),
    ...base_flags_1.AutomationFlags,
};
exports.default = PageExport;
