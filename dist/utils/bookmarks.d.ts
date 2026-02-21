/**
 * Bookmarks Utility
 *
 * User-defined shortcuts to frequently-used Notion pages and databases.
 * Stored at ~/.notion-cli/bookmarks.json alongside the workspace cache.
 *
 * Bookmarks integrate into the resolver — once saved, a bookmark name
 * works anywhere an ID or URL does (e.g. `notion-cli db query inbox`).
 */
export interface Bookmark {
    id: string;
    type: 'database' | 'page';
}
export interface BookmarksData {
    version: string;
    default: string | null;
    bookmarks: Record<string, Bookmark>;
}
/** Load bookmarks from disk. Returns empty structure if file doesn't exist. */
export declare function loadBookmarks(): Promise<BookmarksData>;
/** Save bookmarks to disk (atomic write via tmp + rename). */
export declare function saveBookmarks(data: BookmarksData): Promise<void>;
/** Get a single bookmark by name. Returns null if not found. */
export declare function getBookmark(name: string): Promise<Bookmark | null>;
/** Save or update a bookmark. */
export declare function setBookmark(name: string, id: string, type: 'database' | 'page'): Promise<void>;
/** Remove a bookmark. Returns true if it existed. */
export declare function removeBookmark(name: string): Promise<boolean>;
/** Get the default bookmark name (used by `quick` command). */
export declare function getDefaultBookmark(): Promise<string | null>;
/** Set the default bookmark name. Throws if bookmark doesn't exist. */
export declare function setDefaultBookmark(name: string): Promise<void>;
