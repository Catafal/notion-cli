"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@oclif/core");
const bookmarks_1 = require("../../utils/bookmarks");
const base_flags_1 = require("../../base-flags");
/**
 * Remove a saved bookmark by name.
 * If the removed bookmark was the default, the default is cleared.
 */
class BookmarkRemove extends core_1.Command {
    async run() {
        const { args, flags } = await this.parse(BookmarkRemove);
        const existed = await (0, bookmarks_1.removeBookmark)(args.name);
        if (flags.json) {
            this.log(JSON.stringify({
                success: existed,
                data: { name: args.name, removed: existed },
                timestamp: new Date().toISOString()
            }, null, 2));
            process.exit(0);
            return;
        }
        if (existed) {
            this.log(`Removed bookmark "${args.name}"`);
        }
        else {
            this.log(`Bookmark "${args.name}" not found.`);
            this.log('Run `notion-cli bookmark list` to see saved bookmarks.');
        }
        process.exit(0);
    }
}
BookmarkRemove.description = 'Remove a saved bookmark';
BookmarkRemove.aliases = ['bm:rm'];
BookmarkRemove.examples = [
    {
        description: 'Remove a bookmark',
        command: '$ notion-cli bookmark remove inbox',
    },
];
BookmarkRemove.args = {
    name: core_1.Args.string({ required: true, description: 'Bookmark name to remove' }),
};
BookmarkRemove.flags = {
    ...base_flags_1.AutomationFlags,
};
exports.default = BookmarkRemove;
