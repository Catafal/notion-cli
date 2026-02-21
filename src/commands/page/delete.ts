import { Args, Command, Flags } from '@oclif/core'
import * as notion from '../../notion'
import { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints'
import { getPageTitle, outputRawJson } from '../../helper'
import { resolveNotionId } from '../../utils/notion-resolver'
import { tableFlags, formatTable } from '../../utils/table-formatter'
import { AutomationFlags } from '../../base-flags'
import {
  NotionCLIError,
  wrapNotionError
} from '../../errors'

/**
 * Convenience alias for archiving (soft-deleting) a Notion page.
 * Equivalent to: notion-cli page update PAGE_ID -a
 *
 * Notion API does not support hard deletes — archiving is the only delete operation.
 */
export default class PageDelete extends Command {
  static description = 'Archive (soft-delete) a Notion page'

  static aliases: string[] = ['page:d']

  static examples = [
    {
      description: 'Delete (archive) a page by ID',
      command: '$ notion-cli page delete PAGE_ID',
    },
    {
      description: 'Delete (archive) a page by URL',
      command: '$ notion-cli page delete https://notion.so/PAGE_ID',
    },
    {
      description: 'Delete and output JSON for automation',
      command: '$ notion-cli page delete PAGE_ID --json',
    },
  ]

  static args = {
    page_id: Args.string({
      required: true,
      description: 'Page ID or full Notion URL',
    }),
  }

  static flags = {
    raw: Flags.boolean({
      char: 'r',
      description: 'Output raw JSON',
    }),
    ...tableFlags,
    ...AutomationFlags,
  }

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(PageDelete)

    try {
      const pageId = await resolveNotionId(args.page_id, 'page')

      // Archive the page (Notion's soft-delete)
      const res = await notion.updatePageProps({
        page_id: pageId,
        archived: true,
      })

      // JSON output for automation
      if (flags.json) {
        this.log(JSON.stringify({
          success: true,
          data: res,
          timestamp: new Date().toISOString()
        }, null, 2))
        process.exit(0)
        return
      }

      // Raw JSON output (legacy)
      if (flags.raw) {
        outputRawJson(res)
        process.exit(0)
        return
      }

      // Table output (default)
      const columns = {
        title: {
          get: (row: PageObjectResponse) => getPageTitle(row),
        },
        object: {},
        id: {},
        archived: {},
        url: {},
      }
      const options = {
        printLine: this.log.bind(this),
        ...flags,
      }
      formatTable([res], columns, options)
      process.exit(0)
    } catch (error) {
      const cliError = error instanceof NotionCLIError
        ? error
        : wrapNotionError(error, {
            resourceType: 'page',
            attemptedId: args.page_id,
            endpoint: 'pages.update'
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
