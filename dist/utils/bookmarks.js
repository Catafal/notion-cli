"use strict";
/**
 * Bookmarks Utility
 *
 * User-defined shortcuts to frequently-used Notion pages and databases.
 * Stored at ~/.notion-cli/bookmarks.json alongside the workspace cache.
 *
 * Bookmarks integrate into the resolver — once saved, a bookmark name
 * works anywhere an ID or URL does (e.g. `notion-cli db query inbox`).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadBookmarks = loadBookmarks;
exports.saveBookmarks = saveBookmarks;
exports.getBookmark = getBookmark;
exports.setBookmark = setBookmark;
exports.removeBookmark = removeBookmark;
exports.getDefaultBookmark = getDefaultBookmark;
exports.setDefaultBookmark = setDefaultBookmark;
const fs = require("fs/promises");
const path = require("path");
const workspace_cache_1 = require("./workspace-cache");
// -- Constants --
const BOOKMARKS_FILE = 'bookmarks.json';
const BOOKMARKS_VERSION = '1.0.0';
function getBookmarksPath() {
    return path.join((0, workspace_cache_1.getCacheDir)(), BOOKMARKS_FILE);
}
// -- Core operations --
/** Load bookmarks from disk. Returns empty structure if file doesn't exist. */
async function loadBookmarks() {
    try {
        const content = await fs.readFile(getBookmarksPath(), 'utf-8');
        const data = JSON.parse(content);
        // Validate structure
        if (!data.version || typeof data.bookmarks !== 'object') {
            return createEmpty();
        }
        return data;
    }
    catch (error) {
        if (error.code === 'ENOENT')
            return createEmpty();
        return createEmpty();
    }
}
/** Save bookmarks to disk (atomic write via tmp + rename). */
async function saveBookmarks(data) {
    await (0, workspace_cache_1.ensureCacheDir)();
    const filePath = getBookmarksPath();
    const tmpPath = `${filePath}.tmp`;
    await fs.writeFile(tmpPath, JSON.stringify(data, null, 2), { encoding: 'utf-8', mode: 0o600 });
    await fs.rename(tmpPath, filePath);
}
/** Get a single bookmark by name. Returns null if not found. */
async function getBookmark(name) {
    var _a;
    const data = await loadBookmarks();
    return (_a = data.bookmarks[name.toLowerCase()]) !== null && _a !== void 0 ? _a : null;
}
/** Save or update a bookmark. */
async function setBookmark(name, id, type) {
    const data = await loadBookmarks();
    data.bookmarks[name.toLowerCase()] = { id, type };
    await saveBookmarks(data);
}
/** Remove a bookmark. Returns true if it existed. */
async function removeBookmark(name) {
    const data = await loadBookmarks();
    const key = name.toLowerCase();
    if (!(key in data.bookmarks))
        return false;
    delete data.bookmarks[key];
    // Clear default if it pointed to the removed bookmark
    if (data.default === key) {
        data.default = null;
    }
    await saveBookmarks(data);
    return true;
}
/** Get the default bookmark name (used by `quick` command). */
async function getDefaultBookmark() {
    const data = await loadBookmarks();
    return data.default;
}
/** Set the default bookmark name. Throws if bookmark doesn't exist. */
async function setDefaultBookmark(name) {
    const data = await loadBookmarks();
    const key = name.toLowerCase();
    if (!(key in data.bookmarks)) {
        throw new Error(`Bookmark "${name}" does not exist. Create it first with: bookmark set ${name} <ID>`);
    }
    data.default = key;
    await saveBookmarks(data);
}
// -- Helpers --
function createEmpty() {
    return { version: BOOKMARKS_VERSION, default: null, bookmarks: {} };
}
