"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@oclif/core");
const child_process_1 = require("child_process");
const notion_resolver_1 = require("../utils/notion-resolver");
const notion = require("../notion");
const helper_1 = require("../helper");
const base_flags_1 = require("../base-flags");
const errors_1 = require("../errors");
/**
 * Search for a Notion page or database and open it in the browser.
 * Accepts bookmark names, database names, IDs, URLs, or search queries.
 *
 * Uses execFile (not exec) to prevent shell injection — URL is passed
 * as an argument array, never interpolated into a shell string.
 */
class Open extends core_1.Command {
    async run() {
        var _a, _b;
        const { args, flags } = await this.parse(Open);
        try {
            // Try resolving as database first, then as page
            let url;
            let title = 'Untitled';
            try {
                const id = await (0, notion_resolver_1.resolveNotionId)(args.target, 'database');
                const db = await notion.retrieveDataSource(id);
                url = db.url;
                title = ((_b = (_a = db.title) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.plain_text) || 'Untitled';
            }
            catch {
                // Not a database — try as page
                const id = await (0, notion_resolver_1.resolveNotionId)(args.target, 'page');
                const page = await notion.retrievePage({ page_id: id });
                url = page.url;
                title = (0, helper_1.getPageTitle)(page);
            }
            if (!url) {
                this.error('Could not find a URL for the resolved resource.');
                process.exit(1);
                return;
            }
            // Open in browser using execFile (safe — no shell injection)
            const opener = process.platform === 'darwin' ? 'open' : 'xdg-open';
            (0, child_process_1.execFile)(opener, [url], (err) => {
                if (err && !flags.json) {
                    this.warn(`Could not open browser: ${err.message}`);
                    this.log(`URL: ${url}`);
                }
            });
            if (flags.json) {
                this.log(JSON.stringify({
                    success: true,
                    data: { title, url },
                    timestamp: new Date().toISOString()
                }, null, 2));
            }
            else {
                this.log(`Opened: ${title}`);
                this.log(url);
            }
            process.exit(0);
        }
        catch (error) {
            const cliError = error instanceof errors_1.NotionCLIError
                ? error
                : (0, errors_1.wrapNotionError)(error, { endpoint: 'open', resourceType: 'page' });
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
Open.description = 'Open a Notion page or database in your browser';
Open.aliases = ['o'];
Open.examples = [
    {
        description: 'Open a bookmarked database',
        command: '$ notion-cli open inbox',
    },
    {
        description: 'Search and open a page',
        command: '$ notion-cli open "weekly meeting"',
    },
    {
        description: 'Open by ID or URL',
        command: '$ notion-cli open PAGE_ID',
    },
];
Open.args = {
    target: core_1.Args.string({ required: true, description: 'Bookmark name, page/database name, ID, or URL' }),
};
Open.flags = {
    ...base_flags_1.AutomationFlags,
};
exports.default = Open;
