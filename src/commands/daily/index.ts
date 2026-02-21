/**
 * Daily Command
 *
 * Zero-friction daily journal entries. After one-time setup:
 *   `notion-cli daily`             → create (or find) today's entry
 *   `notion-cli daily "My note"`   → create with body, or append if entry exists
 *
 * Queries the configured database by date to detect existing entries,
 * so you never get duplicate pages for the same day.
 */

import { Args, Command } from '@oclif/core'
import * as dayjs from 'dayjs'
import * as notion from '../../notion'
import { loadDailyConfig } from '../../utils/daily-config'
import { markdownToBlocks } from '../../utils/markdown-to-blocks'
import { AutomationFlags } from '../../base-flags'
import { NotionCLIError, wrapNotionError } from '../../errors'
import { BlockObjectRequest } from '@notionhq/client/build/src/api-endpoints'

export default class Daily extends Command {
  static description = 'Create or open today\'s daily journal entry'

  static aliases: string[] = ['d']

  static examples = [
    {
      description: 'Create today\'s entry',
      command: '$ notion-cli daily',
    },
    {
      description: 'Create entry with body content',
      command: '$ notion-cli daily "Had a productive standup"',
    },
    {
      description: 'First-time setup (see `daily setup --help`)',
      command: '$ notion-cli daily setup DB_ID',
    },
  ]

  static args = {
    content: Args.string({
      required: false,
      description: 'Text to add to today\'s entry (appended if entry already exists)',
    }),
  }

  static flags = {
    ...AutomationFlags,
  }

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(Daily)

    try {
      // 1. Load config — fail fast if not set up
      const config = await loadDailyConfig()
      if (!config) {
        this.error(
          'Daily journal not configured yet.\n' +
          'Run setup first:\n' +
          '  notion-cli daily setup DB_ID          (existing database)\n' +
          '  notion-cli daily setup --auto PAGE_ID  (auto-create database)'
        )
        process.exit(1)
        return
      }

      // 2. Today's date — used for both the entry title and the date filter
      const today = dayjs()
      const todayISO = today.format('YYYY-MM-DD')
      const title = today.format(config.title_format)

      // 3. Check if today's entry already exists (query by date property)
      const existingPages = await notion.fetchAllPagesInDS(config.database_id, {
        property: config.date_property,
        date: { equals: todayISO },
      })

      // 4. Build content blocks from the positional arg (if provided)
      const children = args.content
        ? markdownToBlocks(args.content) as BlockObjectRequest[]
        : undefined

      if (existingPages.length > 0) {
        // Entry exists — append content or just show the link
        const page = existingPages[0] as any

        if (children && children.length > 0) {
          await notion.appendBlockChildren({ block_id: page.id, children })
        }

        if (flags.json) {
          this.log(JSON.stringify({
            success: true,
            action: children ? 'appended' : 'found',
            data: page,
            timestamp: new Date().toISOString()
          }, null, 2))
        } else {
          this.log(children ? `Appended to: ${title}` : `Today's entry: ${title}`)
          this.log(page.url)
        }
      } else {
        // No entry for today — create one
        const properties: any = {
          [config.title_property]: {
            title: [{ text: { content: title } }],
          },
          [config.date_property]: {
            date: { start: todayISO },
          },
        }

        const res = await notion.createPage({
          parent: { data_source_id: config.database_id },
          properties,
          ...(children && { children }),
        })

        if (flags.json) {
          this.log(JSON.stringify({
            success: true,
            action: 'created',
            data: res,
            timestamp: new Date().toISOString()
          }, null, 2))
        } else {
          this.log(`Created: ${title}`)
          this.log((res as any).url)
        }
      }

      process.exit(0)
    } catch (error) {
      const cliError = error instanceof NotionCLIError
        ? error
        : wrapNotionError(error, { endpoint: 'daily', resourceType: 'page' })

      if (flags.json) {
        this.log(JSON.stringify(cliError.toJSON(), null, 2))
      } else {
        this.error(cliError.toHumanString())
      }
      process.exit(1)
    }
  }
}
