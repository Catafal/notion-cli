import { Args, Command } from '@oclif/core'
import { execFile } from 'child_process'
import { resolveNotionId } from '../utils/notion-resolver'
import * as notion from '../notion'
import { getPageTitle } from '../helper'
import { AutomationFlags } from '../base-flags'
import { NotionCLIError, wrapNotionError } from '../errors'
import { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints'

/**
 * Search for a Notion page or database and open it in the browser.
 * Accepts bookmark names, database names, IDs, URLs, or search queries.
 *
 * Uses execFile (not exec) to prevent shell injection — URL is passed
 * as an argument array, never interpolated into a shell string.
 */
export default class Open extends Command {
  static description = 'Open a Notion page or database in your browser'

  static aliases: string[] = ['o']

  static examples = [
    {
      description: 'Open a bookmarked database',
      command: '$ notion-cli open inbox',
    },
    {
      description: 'Search and open a page',
      command: '$ notion-cli open "weekly meeting"',
    },
    {
      description: 'Open by ID or URL',
      command: '$ notion-cli open PAGE_ID',
    },
  ]

  static args = {
    target: Args.string({ required: true, description: 'Bookmark name, page/database name, ID, or URL' }),
  }

  static flags = {
    ...AutomationFlags,
  }

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(Open)

    try {
      // Try resolving as database first, then as page
      let url: string | undefined
      let title = 'Untitled'

      try {
        const id = await resolveNotionId(args.target, 'database')
        const db = await notion.retrieveDataSource(id)
        url = (db as any).url
        title = (db as any).title?.[0]?.plain_text || 'Untitled'
      } catch {
        // Not a database — try as page
        const id = await resolveNotionId(args.target, 'page')
        const page = await notion.retrievePage({ page_id: id })
        url = (page as any).url
        title = getPageTitle(page as PageObjectResponse)
      }

      if (!url) {
        this.error('Could not find a URL for the resolved resource.')
        process.exit(1)
        return
      }

      // Open in browser using execFile (safe — no shell injection)
      const opener = process.platform === 'darwin' ? 'open' : 'xdg-open'
      execFile(opener, [url], (err) => {
        if (err && !flags.json) {
          this.warn(`Could not open browser: ${err.message}`)
          this.log(`URL: ${url}`)
        }
      })

      if (flags.json) {
        this.log(JSON.stringify({
          success: true,
          data: { title, url },
          timestamp: new Date().toISOString()
        }, null, 2))
      } else {
        this.log(`Opened: ${title}`)
        this.log(url!)
      }

      process.exit(0)
    } catch (error) {
      const cliError = error instanceof NotionCLIError
        ? error
        : wrapNotionError(error, { endpoint: 'open', resourceType: 'page' })

      if (flags.json) {
        this.log(JSON.stringify(cliError.toJSON(), null, 2))
      } else {
        this.error(cliError.toHumanString())
      }
      process.exit(1)
    }
  }
}
