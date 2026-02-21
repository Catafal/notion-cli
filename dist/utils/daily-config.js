"use strict";
/**
 * Daily Config Utility
 *
 * Persistent configuration for the `daily` command.
 * Stored at ~/.notion-cli/daily.json alongside bookmarks and workspace cache.
 *
 * Follows the same atomic-write pattern as bookmarks.ts:
 * write to .tmp first, then rename (safe against mid-write crashes).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadDailyConfig = loadDailyConfig;
exports.saveDailyConfig = saveDailyConfig;
exports.createDailyConfig = createDailyConfig;
const fs = require("fs/promises");
const path = require("path");
const workspace_cache_1 = require("./workspace-cache");
// -- Constants --
const DAILY_FILE = 'daily.json';
const DAILY_VERSION = '1.0.0';
const DEFAULT_TITLE_FORMAT = 'YYYY-MM-DD';
function getDailyConfigPath() {
    return path.join((0, workspace_cache_1.getCacheDir)(), DAILY_FILE);
}
// -- Core operations --
/** Load daily config from disk. Returns null if not yet configured. */
async function loadDailyConfig() {
    try {
        const content = await fs.readFile(getDailyConfigPath(), 'utf-8');
        const data = JSON.parse(content);
        // Validate: must have the essential fields to be usable
        if (!data.version || !data.database_id || !data.date_property) {
            return null;
        }
        return data;
    }
    catch (error) {
        if (error.code === 'ENOENT')
            return null;
        return null;
    }
}
/** Save daily config to disk (atomic write via tmp + rename). */
async function saveDailyConfig(config) {
    await (0, workspace_cache_1.ensureCacheDir)();
    const filePath = getDailyConfigPath();
    const tmpPath = `${filePath}.tmp`;
    await fs.writeFile(tmpPath, JSON.stringify(config, null, 2), { encoding: 'utf-8', mode: 0o600 });
    await fs.rename(tmpPath, filePath);
}
/** Factory: create a DailyConfig with sensible defaults. */
function createDailyConfig(databaseId, titleProperty, dateProperty, titleFormat = DEFAULT_TITLE_FORMAT) {
    return {
        version: DAILY_VERSION,
        database_id: databaseId,
        title_property: titleProperty,
        date_property: dateProperty,
        title_format: titleFormat,
    };
}
