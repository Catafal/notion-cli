"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@oclif/core");
const notion = require("../../notion");
const helper_1 = require("../../helper");
const notion_resolver_1 = require("../../utils/notion-resolver");
const table_formatter_1 = require("../../utils/table-formatter");
const base_flags_1 = require("../../base-flags");
const errors_1 = require("../../errors");
/**
 * Convenience alias for archiving (soft-deleting) a Notion page.
 * Equivalent to: notion-cli page update PAGE_ID -a
 *
 * Notion API does not support hard deletes — archiving is the only delete operation.
 */
class PageDelete extends core_1.Command {
    async run() {
        const { args, flags } = await this.parse(PageDelete);
        try {
            const pageId = await (0, notion_resolver_1.resolveNotionId)(args.page_id, 'page');
            // Archive the page (Notion's soft-delete)
            const res = await notion.updatePageProps({
                page_id: pageId,
                archived: true,
            });
            // JSON output for automation
            if (flags.json) {
                this.log(JSON.stringify({
                    success: true,
                    data: res,
                    timestamp: new Date().toISOString()
                }, null, 2));
                process.exit(0);
                return;
            }
            // Raw JSON output (legacy)
            if (flags.raw) {
                (0, helper_1.outputRawJson)(res);
                process.exit(0);
                return;
            }
            // Table output (default)
            const columns = {
                title: {
                    get: (row) => (0, helper_1.getPageTitle)(row),
                },
                object: {},
                id: {},
                archived: {},
                url: {},
            };
            const options = {
                printLine: this.log.bind(this),
                ...flags,
            };
            (0, table_formatter_1.formatTable)([res], columns, options);
            process.exit(0);
        }
        catch (error) {
            const cliError = error instanceof errors_1.NotionCLIError
                ? error
                : (0, errors_1.wrapNotionError)(error, {
                    resourceType: 'page',
                    attemptedId: args.page_id,
                    endpoint: 'pages.update'
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
}
PageDelete.description = 'Archive (soft-delete) a Notion page';
PageDelete.aliases = ['page:d'];
PageDelete.examples = [
    {
        description: 'Delete (archive) a page by ID',
        command: '$ notion-cli page delete PAGE_ID',
    },
    {
        description: 'Delete (archive) a page by URL',
        command: '$ notion-cli page delete https://notion.so/PAGE_ID',
    },
    {
        description: 'Delete and output JSON for automation',
        command: '$ notion-cli page delete PAGE_ID --json',
    },
];
PageDelete.args = {
    page_id: core_1.Args.string({
        required: true,
        description: 'Page ID or full Notion URL',
    }),
};
PageDelete.flags = {
    raw: core_1.Flags.boolean({
        char: 'r',
        description: 'Output raw JSON',
    }),
    ...table_formatter_1.tableFlags,
    ...base_flags_1.AutomationFlags,
};
exports.default = PageDelete;
