"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@oclif/core");
const bookmarks_1 = require("../../utils/bookmarks");
const notion_resolver_1 = require("../../utils/notion-resolver");
const notion = require("../../notion");
const base_flags_1 = require("../../base-flags");
const errors_1 = require("../../errors");
/**
 * Save a bookmark — a named shortcut to a Notion page or database.
 * Once saved, the name works anywhere an ID or URL does.
 */
class BookmarkSet extends core_1.Command {
    async run() {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        const { args, flags } = await this.parse(BookmarkSet);
        const resourceType = flags.type;
        try {
            // Resolve target to a valid Notion ID (validates it exists)
            const resolvedId = await (0, notion_resolver_1.resolveNotionId)(args.target, resourceType);
            // Fetch resource to confirm access and get title for display
            let title = 'Untitled';
            if (resourceType === 'database') {
                const db = await notion.retrieveDataSource(resolvedId);
                title = ((_b = (_a = db.title) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.plain_text) || 'Untitled';
            }
            else {
                const page = await notion.retrievePage({ page_id: resolvedId });
                title = ((_f = (_e = (_d = (_c = page.properties) === null || _c === void 0 ? void 0 : _c.title) === null || _d === void 0 ? void 0 : _d.title) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.plain_text) ||
                    ((_k = (_j = (_h = (_g = page.properties) === null || _g === void 0 ? void 0 : _g.Name) === null || _h === void 0 ? void 0 : _h.title) === null || _j === void 0 ? void 0 : _j[0]) === null || _k === void 0 ? void 0 : _k.plain_text) || 'Untitled';
            }
            // Save bookmark
            await (0, bookmarks_1.setBookmark)(args.name, resolvedId, resourceType);
            // Set as default if requested
            if (flags.default) {
                await (0, bookmarks_1.setDefaultBookmark)(args.name);
            }
            if (flags.json) {
                this.log(JSON.stringify({
                    success: true,
                    data: { name: args.name, id: resolvedId, type: resourceType, title, default: flags.default },
                    timestamp: new Date().toISOString()
                }, null, 2));
            }
            else {
                this.log(`Saved bookmark "${args.name}" → ${title} (${resourceType})`);
                if (flags.default) {
                    this.log(`Set as default bookmark for quick capture.`);
                }
            }
            process.exit(0);
        }
        catch (error) {
            const cliError = error instanceof errors_1.NotionCLIError
                ? error
                : (0, errors_1.wrapNotionError)(error, { endpoint: 'bookmark.set', resourceType });
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
BookmarkSet.description = 'Save a named shortcut to a Notion page or database';
BookmarkSet.aliases = ['bm:set'];
BookmarkSet.examples = [
    {
        description: 'Bookmark a database as "inbox" and set it as default',
        command: '$ notion-cli bookmark set inbox DB_ID_OR_URL --default',
    },
    {
        description: 'Bookmark a page',
        command: '$ notion-cli bookmark set notes PAGE_URL --type page',
    },
];
BookmarkSet.args = {
    name: core_1.Args.string({ required: true, description: 'Bookmark name (e.g. "inbox", "tasks")' }),
    target: core_1.Args.string({ required: true, description: 'Notion ID, URL, or database name' }),
};
BookmarkSet.flags = {
    type: core_1.Flags.string({
        char: 't',
        description: 'Resource type',
        options: ['database', 'page'],
        default: 'database',
    }),
    default: core_1.Flags.boolean({
        description: 'Also set as the default bookmark (used by `quick` command)',
        default: false,
    }),
    ...base_flags_1.AutomationFlags,
};
exports.default = BookmarkSet;
