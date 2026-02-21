import { Command, Flags } from '@oclif/core'
import { loadCache, getCachePath } from '../utils/workspace-cache'
import { outputMarkdownTable, outputPrettyTable, outputCompactJson } from '../helper'
import { AutomationFlags, OutputFormatFlags } from '../base-flags'
import {
  NotionCLIError,
  NotionCLIErrorFactory,
  wrapNotionError
} from '../errors'
import { tableFlags, formatTable } from '../utils/table-formatter'
import { levenshtein } from '../utils/fuzzy'

export default class List extends Command {
  static description = 'List all cached databases from your workspace'

  static aliases: string[] = ['db:list', 'ls']

  static examples = [
    {
      description: 'List all cached databases',
      command: 'notion-cli list',
    },
    {
      description: 'Filter databases by name (fuzzy match)',
      command: 'notion-cli list --filter "tasks"',
    },
    {
      description: 'List databases in markdown format',
      command: 'notion-cli list --markdown',
    },
    {
      description: 'List databases in JSON format',
      command: 'notion-cli list --json',
    },
    {
      description: 'List databases in pretty table format',
      command: 'notion-cli list --pretty',
    },
  ]

  static flags = {
    ...tableFlags,
    ...AutomationFlags,
    ...OutputFormatFlags,
    filter: Flags.string({
      char: 'f',
      description: 'Filter databases by name (supports fuzzy/typo-tolerant matching)',
    }),
  }

  public async run(): Promise<void> {
    const { flags } = await this.parse(List)

    try {
      // Load cache
      const cache = await loadCache()

      if (!cache) {
        // Use enhanced error factory for workspace not synced
        throw NotionCLIErrorFactory.workspaceNotSynced('')
      }

      // Calculate cache age
      const lastSyncTime = new Date(cache.lastSync)
      const cacheAgeMs = Date.now() - lastSyncTime.getTime()
      const cacheAgeHours = cacheAgeMs / (1000 * 60 * 60)
      const isStale = cacheAgeHours > 24

      let databases = cache.databases

      // Apply fuzzy name filter if --filter is provided.
      // Checks substring on full title, then Levenshtein on individual words
      // so "daly" matches "Daily Psychology Lecture" via the word "daily".
      if (flags.filter) {
        const query = flags.filter.toLowerCase().trim()
        const threshold = Math.max(2, Math.floor(query.length / 4))
        databases = databases
          .map(db => {
            // Substring match on full title (cheapest check)
            if (db.titleNormalized.includes(query)) {
              return { db, dist: 0 }
            }
            // Fuzzy match on individual words in the title
            const words = db.titleNormalized.split(/[\s\-_]+/)
            let bestWordDist = Infinity
            for (const word of words) {
              const dist = levenshtein(query, word)
              if (dist < bestWordDist) bestWordDist = dist
            }
            return { db, dist: bestWordDist }
          })
          .filter(({ dist }) => dist <= threshold)
          .sort((a, b) => a.dist - b.dist)
          .map(({ db }) => db)
      }

      // Build comprehensive metadata
      const metadata = {
        cache_info: {
          last_sync: cache.lastSync,
          cache_age_ms: cacheAgeMs,
          cache_age_hours: parseFloat(cacheAgeHours.toFixed(2)),
          is_stale: isStale,
          stale_threshold_hours: 24,
          cache_version: cache.version,
          cache_location: await getCachePath(),
        },
        ttls: {
          workspace_cache: 'persists until next sync',
          recommended_sync_interval_hours: 24,
          in_memory: {
            data_source_ms: parseInt(process.env.NOTION_CLI_CACHE_DS_TTL || '600000', 10),
            page_ms: parseInt(process.env.NOTION_CLI_CACHE_PAGE_TTL || '60000', 10),
            user_ms: parseInt(process.env.NOTION_CLI_CACHE_USER_TTL || '3600000', 10),
            block_ms: parseInt(process.env.NOTION_CLI_CACHE_BLOCK_TTL || '30000', 10),
          },
        },
        stats: {
          total_databases: databases.length,
          databases_with_urls: databases.filter(db => db.url).length,
          total_aliases: databases.reduce((sum, db) => sum + db.aliases.length, 0),
        },
      }

      // Add freshness warning if stale (non-JSON mode)
      if (isStale && !flags.json && !flags['compact-json'] && !flags.markdown && !flags.pretty) {
        this.warn(`Cache is ${cacheAgeHours.toFixed(1)} hours old. Consider running: notion-cli sync`)
      }

      if (databases.length === 0) {
        if (flags.json) {
          this.log(JSON.stringify({
            success: true,
            data: {
              databases: [],
            },
            metadata,
          }, null, 2))
        } else {
          this.log('No databases found in cache.')
          this.log('Your integration may not have access to any databases.')
        }

        process.exit(0)
        return
      }

      // Define columns for table output
      const columns = {
        title: {
          header: 'Title',
          get: (row: any) => row.title,
        },
        id: {
          header: 'ID',
          get: (row: any) => row.id,
        },
        aliases: {
          header: 'Aliases (first 3)',
          get: (row: any) => row.aliases.slice(0, 3).join(', '),
        },
        url: {
          header: 'URL',
          get: (row: any) => row.url || '',
        },
      }

      // Handle compact JSON output
      if (flags['compact-json']) {
        outputCompactJson(databases)
        process.exit(0)
        return
      }

      // Handle markdown table output
      if (flags.markdown) {
        outputMarkdownTable(databases, columns)
        process.exit(0)
        return
      }

      // Handle pretty table output
      if (flags.pretty) {
        outputPrettyTable(databases, columns)
        process.exit(0)
        return
      }

      // Handle JSON output for automation
      if (flags.json) {
        this.log(JSON.stringify({
          success: true,
          data: {
            databases: databases.map(db => ({
              id: db.id,
              title: db.title,
              aliases: db.aliases,
              url: db.url,
              lastEditedTime: db.lastEditedTime,
            })),
          },
          metadata,
        }, null, 2))
        process.exit(0)
        return
      }

      // Handle table output (default)
      this.log(`\nCached Databases (${databases.length} total)`)
      this.log(`Last synced: ${lastSyncTime.toLocaleString()} (${cacheAgeHours.toFixed(1)} hours ago)`)
      if (isStale) {
        this.log(`⚠️  Cache is stale. Run: notion-cli sync`)
      }
      this.log('')

      const options = {
        printLine: this.log.bind(this),
        ...flags,
      }
      formatTable(databases, columns, options)

      this.log(`\nTip: Run "notion-cli sync" to refresh the cache.`)
      process.exit(0)
    } catch (error: any) {
      const cliError = error instanceof NotionCLIError
        ? error
        : wrapNotionError(error, {
            endpoint: 'workspace.list'
          })

      if (flags.json) {
        this.log(JSON.stringify(cliError.toJSON(), null, 2))
      } else {
        this.error(cliError.toHumanString())
      }

      process.exit(1)
    }
  }
}
