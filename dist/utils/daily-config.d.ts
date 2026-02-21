/**
 * Daily Config Utility
 *
 * Persistent configuration for the `daily` command.
 * Stored at ~/.notion-cli/daily.json alongside bookmarks and workspace cache.
 *
 * Follows the same atomic-write pattern as bookmarks.ts:
 * write to .tmp first, then rename (safe against mid-write crashes).
 */
export interface DailyConfig {
    version: string;
    database_id: string;
    title_property: string;
    date_property: string;
    title_format: string;
}
/** Load daily config from disk. Returns null if not yet configured. */
export declare function loadDailyConfig(): Promise<DailyConfig | null>;
/** Save daily config to disk (atomic write via tmp + rename). */
export declare function saveDailyConfig(config: DailyConfig): Promise<void>;
/** Factory: create a DailyConfig with sensible defaults. */
export declare function createDailyConfig(databaseId: string, titleProperty: string, dateProperty: string, titleFormat?: string): DailyConfig;
