"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@oclif/core");
const bookmarks_1 = require("../../utils/bookmarks");
const table_formatter_1 = require("../../utils/table-formatter");
const base_flags_1 = require("../../base-flags");
/**
 * List all saved bookmarks.
 * Shows name, type, ID, and which one is the default.
 */
class BookmarkList extends core_1.Command {
    async run() {
        const { flags } = await this.parse(BookmarkList);
        const data = await (0, bookmarks_1.loadBookmarks)();
        const entries = Object.entries(data.bookmarks);
        if (flags.json) {
            this.log(JSON.stringify({
                success: true,
                data: { bookmarks: data.bookmarks, default: data.default },
                timestamp: new Date().toISOString()
            }, null, 2));
            process.exit(0);
            return;
        }
        if (entries.length === 0) {
            this.log('No bookmarks saved yet.');
            this.log('Create one with: notion-cli bookmark set <name> <ID_OR_URL>');
            process.exit(0);
            return;
        }
        // Build rows for table display
        const rows = entries.map(([name, bm]) => ({
            name,
            type: bm.type,
            id: bm.id,
            default: name === data.default ? '*' : '',
        }));
        const columns = {
            name: {},
            type: {},
            id: {},
            default: {},
        };
        (0, table_formatter_1.formatTable)(rows, columns, { printLine: this.log.bind(this), ...flags });
        process.exit(0);
    }
}
BookmarkList.description = 'List all saved bookmarks';
BookmarkList.aliases = ['bm:ls'];
BookmarkList.examples = [
    {
        description: 'List bookmarks',
        command: '$ notion-cli bookmark list',
    },
];
BookmarkList.flags = {
    ...table_formatter_1.tableFlags,
    ...base_flags_1.AutomationFlags,
};
exports.default = BookmarkList;
