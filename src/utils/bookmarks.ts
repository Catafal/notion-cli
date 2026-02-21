/**
 * Bookmarks Utility
 *
 * User-defined shortcuts to frequently-used Notion pages and databases.
 * Stored at ~/.notion-cli/bookmarks.json alongside the workspace cache.
 *
 * Bookmarks integrate into the resolver — once saved, a bookmark name
 * works anywhere an ID or URL does (e.g. `notion-cli db query inbox`).
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import { getCacheDir, ensureCacheDir } from './workspace-cache'

// -- Types --

export interface Bookmark {
  id: string
  type: 'database' | 'page'
}

export interface BookmarksData {
  version: string
  default: string | null
  bookmarks: Record<string, Bookmark>
}

// -- Constants --

const BOOKMARKS_FILE = 'bookmarks.json'
const BOOKMARKS_VERSION = '1.0.0'

function getBookmarksPath(): string {
  return path.join(getCacheDir(), BOOKMARKS_FILE)
}

// -- Core operations --

/** Load bookmarks from disk. Returns empty structure if file doesn't exist. */
export async function loadBookmarks(): Promise<BookmarksData> {
  try {
    const content = await fs.readFile(getBookmarksPath(), 'utf-8')
    const data = JSON.parse(content)

    // Validate structure
    if (!data.version || typeof data.bookmarks !== 'object') {
      return createEmpty()
    }
    return data as BookmarksData
  } catch (error: any) {
    if (error.code === 'ENOENT') return createEmpty()
    return createEmpty()
  }
}

/** Save bookmarks to disk (atomic write via tmp + rename). */
export async function saveBookmarks(data: BookmarksData): Promise<void> {
  await ensureCacheDir()
  const filePath = getBookmarksPath()
  const tmpPath = `${filePath}.tmp`

  await fs.writeFile(tmpPath, JSON.stringify(data, null, 2), { encoding: 'utf-8', mode: 0o600 })
  await fs.rename(tmpPath, filePath)
}

/** Get a single bookmark by name. Returns null if not found. */
export async function getBookmark(name: string): Promise<Bookmark | null> {
  const data = await loadBookmarks()
  return data.bookmarks[name.toLowerCase()] ?? null
}

/** Save or update a bookmark. */
export async function setBookmark(name: string, id: string, type: 'database' | 'page'): Promise<void> {
  const data = await loadBookmarks()
  data.bookmarks[name.toLowerCase()] = { id, type }
  await saveBookmarks(data)
}

/** Remove a bookmark. Returns true if it existed. */
export async function removeBookmark(name: string): Promise<boolean> {
  const data = await loadBookmarks()
  const key = name.toLowerCase()
  if (!(key in data.bookmarks)) return false

  delete data.bookmarks[key]

  // Clear default if it pointed to the removed bookmark
  if (data.default === key) {
    data.default = null
  }
  await saveBookmarks(data)
  return true
}

/** Get the default bookmark name (used by `quick` command). */
export async function getDefaultBookmark(): Promise<string | null> {
  const data = await loadBookmarks()
  return data.default
}

/** Set the default bookmark name. Throws if bookmark doesn't exist. */
export async function setDefaultBookmark(name: string): Promise<void> {
  const data = await loadBookmarks()
  const key = name.toLowerCase()
  if (!(key in data.bookmarks)) {
    throw new Error(`Bookmark "${name}" does not exist. Create it first with: bookmark set ${name} <ID>`)
  }
  data.default = key
  await saveBookmarks(data)
}

// -- Helpers --

function createEmpty(): BookmarksData {
  return { version: BOOKMARKS_VERSION, default: null, bookmarks: {} }
}
