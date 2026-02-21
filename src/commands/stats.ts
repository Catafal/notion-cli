/**
 * Stats Dashboard Command
 *
 * Shows a bird's-eye view of the Notion workspace: database count, user count,
 * property type breakdown, and per-database details. Data comes primarily from
 * the workspace cache (fast), with optional --live flag for page counts (slower).
 *
 *   notion-cli stats              # fast dashboard from cache
 *   notion-cli stats --live       # also fetch page counts per DB
 *   notion-cli stats --json       # JSON output for automation
 */

import { Command, Flags } from '@oclif/core'
import { loadCache } from '../utils/workspace-cache'
import { AutomationFlags } from '../base-flags'
import { NotionCLIError, NotionCLIErrorFactory, wrapNotionError } from '../errors'
import * as notion from '../notion'

export default class Stats extends Command {
  static description = 'Show workspace statistics dashboard'

  static aliases: string[] = ['dashboard']

  static examples = [
    {
      description: 'Show workspace statistics',
      command: '$ notion-cli stats',
    },
    {
      description: 'Include page counts per database (slower)',
      command: '$ notion-cli stats --live',
    },
    {
      description: 'JSON output for automation',
      command: '$ notion-cli stats --json',
    },
  ]

  static flags = {
    ...AutomationFlags,
    live: Flags.boolean({
      description: 'Fetch page counts per database (requires API calls)',
      default: false,
    }),
  }

  public async run(): Promise<void> {
    const { flags } = await this.parse(Stats)

    try {
      // 1. Load workspace cache — the primary data source (free, no API calls)
      const cache = await loadCache()
      if (!cache || cache.databases.length === 0) {
        throw NotionCLIErrorFactory.workspaceNotSynced('')
      }

      // 2. Fetch workspace info + users (cached API calls, fast)
      //    Both calls can fail if the token lacks permissions — handle gracefully.
      let workspaceName = 'Unknown'
      let userCount: number | null = null

      try {
        const botInfo = await notion.botUser()
        workspaceName = (botInfo as any)?.bot?.workspace_name || 'Unknown'
      } catch { /* bot info unavailable — non-critical */ }

      try {
        const usersResponse = await notion.listUser()
        userCount = usersResponse.results.length
      } catch { /* users endpoint needs extra permissions — skip gracefully */ }

      // 3. Aggregate property types across all databases (from cache, no API)
      const propertyTypeCounts: Record<string, number> = {}
      const dbDetails: Array<{ title: string; shortId: string; propertyCount: number; pages?: number }> = []

      for (const db of cache.databases) {
        const propCount = db.properties ? Object.keys(db.properties).length : 0
        dbDetails.push({ title: db.title, shortId: db.id.slice(0, 8), propertyCount: propCount })

        // Count each property type across the workspace
        if (db.properties) {
          for (const prop of Object.values(db.properties)) {
            const type = (prop as any).type || 'unknown'
            propertyTypeCounts[type] = (propertyTypeCounts[type] || 0) + 1
          }
        }
      }

      // Sort databases by property count (most complex first)
      dbDetails.sort((a, b) => b.propertyCount - a.propertyCount)

      // 4. Optional: fetch page counts per database (expensive, behind --live flag)
      let totalPages: number | undefined
      if (flags.live) {
        totalPages = 0
        for (const db of cache.databases) {
          try {
            const pages = await notion.fetchAllPagesInDS(db.id)
            const count = pages.length
            totalPages += count
            // Update the matching entry in dbDetails
            const detail = dbDetails.find(d => d.title === db.title)
            if (detail) detail.pages = count
          } catch {
            // If a DB query fails (permissions, deleted), skip it gracefully
            const detail = dbDetails.find(d => d.title === db.title)
            if (detail) detail.pages = -1
          }
        }
        // Re-sort by page count when live data is available
        dbDetails.sort((a, b) => (b.pages ?? 0) - (a.pages ?? 0))
      }

      // 5. Calculate cache age for display
      const cacheAgeMs = Date.now() - new Date(cache.lastSync).getTime()
      const cacheAgeLabel = this.formatAge(cacheAgeMs)

      // 6. Sort property types by count (most used first)
      const sortedTypes = Object.entries(propertyTypeCounts)
        .sort(([, a], [, b]) => b - a)

      // --- Output ---

      if (flags.json) {
        this.log(JSON.stringify({
          success: true,
          data: {
            workspace: workspaceName,
            databases: {
              count: cache.databases.length,
              items: dbDetails,
            },
            ...(userCount !== null && { users: { count: userCount } }),
            property_types: propertyTypeCounts,
            ...(totalPages !== undefined && { pages: { total: totalPages } }),
            cache: {
              last_sync: cache.lastSync,
              age_ms: cacheAgeMs,
            },
          },
          timestamp: new Date().toISOString(),
        }, null, 2))
        process.exit(0)
        return
      }

      // Human-readable dashboard
      this.log('')
      const userLabel = userCount !== null ? ` | Users: ${userCount}` : ''
      const summary = totalPages !== undefined
        ? `Databases: ${cache.databases.length}${userLabel} | Total Pages: ${totalPages}`
        : `Databases: ${cache.databases.length}${userLabel}`
      this.log(`Workspace: ${workspaceName}`)
      this.log(summary)

      // Database table — includes short ID to disambiguate duplicate names
      this.log('\nDatabases')
      this.log('─'.repeat(65))
      const nameWidth = 36
      const header = flags.live
        ? `${'Name'.padEnd(nameWidth)}  ${'ID'.padEnd(8)}  ${'Props'.padStart(5)}  ${'Pages'.padStart(5)}`
        : `${'Name'.padEnd(nameWidth)}  ${'ID'.padEnd(8)}  ${'Props'.padStart(5)}`
      this.log(header)

      for (const db of dbDetails) {
        const name = db.title.length > nameWidth
          ? db.title.slice(0, nameWidth - 1) + '…'
          : db.title.padEnd(nameWidth)
        const props = String(db.propertyCount).padStart(5)
        if (flags.live) {
          const pages = db.pages === -1 ? '  err' : String(db.pages ?? '-').padStart(5)
          this.log(`${name}  ${db.shortId}  ${props}  ${pages}`)
        } else {
          this.log(`${name}  ${db.shortId}  ${props}`)
        }
      }

      // Property type breakdown
      this.log('\nProperty Types')
      this.log('─'.repeat(30))
      for (const [type, count] of sortedTypes) {
        this.log(`${type.padEnd(20)}  ${String(count).padStart(4)}`)
      }

      // Footer
      this.log(`\nCache: synced ${cacheAgeLabel}`)
      if (!flags.live) {
        this.log('Tip: Run with --live to fetch page counts per database.')
      }

      process.exit(0)
    } catch (error) {
      const cliError = error instanceof NotionCLIError
        ? error
        : wrapNotionError(error, {
            endpoint: 'workspace.stats',
            resourceType: 'workspace',
          })

      if (flags.json) {
        this.log(JSON.stringify(cliError.toJSON(), null, 2))
      } else {
        this.error(cliError.toHumanString())
      }
      process.exit(1)
    }
  }

  /** Convert milliseconds to a human-friendly age string (e.g. "2h ago"). */
  private formatAge(ms: number): string {
    const minutes = Math.floor(ms / 60_000)
    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }
}
