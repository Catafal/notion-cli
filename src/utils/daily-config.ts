/**
 * Daily Config Utility
 *
 * Persistent configuration for the `daily` command.
 * Stored at ~/.notion-cli/daily.json alongside bookmarks and workspace cache.
 *
 * Follows the same atomic-write pattern as bookmarks.ts:
 * write to .tmp first, then rename (safe against mid-write crashes).
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import { getCacheDir, ensureCacheDir } from './workspace-cache'

// -- Types --

export interface DailyConfig {
  version: string
  database_id: string       // data_source_id of the daily journal database
  title_property: string    // property name for the entry title (e.g. "Name")
  date_property: string     // property name for the date column (e.g. "Date")
  title_format: string      // dayjs format string for entry titles (e.g. "YYYY-MM-DD")
}

// -- Constants --

const DAILY_FILE = 'daily.json'
const DAILY_VERSION = '1.0.0'
const DEFAULT_TITLE_FORMAT = 'YYYY-MM-DD'

function getDailyConfigPath(): string {
  return path.join(getCacheDir(), DAILY_FILE)
}

// -- Core operations --

/** Load daily config from disk. Returns null if not yet configured. */
export async function loadDailyConfig(): Promise<DailyConfig | null> {
  try {
    const content = await fs.readFile(getDailyConfigPath(), 'utf-8')
    const data = JSON.parse(content)

    // Validate: must have the essential fields to be usable
    if (!data.version || !data.database_id || !data.date_property) {
      return null
    }
    return data as DailyConfig
  } catch (error: any) {
    if (error.code === 'ENOENT') return null
    return null
  }
}

/** Save daily config to disk (atomic write via tmp + rename). */
export async function saveDailyConfig(config: DailyConfig): Promise<void> {
  await ensureCacheDir()
  const filePath = getDailyConfigPath()
  const tmpPath = `${filePath}.tmp`

  await fs.writeFile(tmpPath, JSON.stringify(config, null, 2), { encoding: 'utf-8', mode: 0o600 })
  await fs.rename(tmpPath, filePath)
}

/** Factory: create a DailyConfig with sensible defaults. */
export function createDailyConfig(
  databaseId: string,
  titleProperty: string,
  dateProperty: string,
  titleFormat: string = DEFAULT_TITLE_FORMAT
): DailyConfig {
  return {
    version: DAILY_VERSION,
    database_id: databaseId,
    title_property: titleProperty,
    date_property: dateProperty,
    title_format: titleFormat,
  }
}
