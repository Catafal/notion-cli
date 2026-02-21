import { Args, Command, Flags } from '@oclif/core'
import { setBookmark, setDefaultBookmark } from '../../utils/bookmarks'
import { resolveNotionId } from '../../utils/notion-resolver'
import * as notion from '../../notion'
import { AutomationFlags } from '../../base-flags'
import { NotionCLIError, wrapNotionError } from '../../errors'

/**
 * Save a bookmark — a named shortcut to a Notion page or database.
 * Once saved, the name works anywhere an ID or URL does.
 */
export default class BookmarkSet extends Command {
  static description = 'Save a named shortcut to a Notion page or database'

  static aliases: string[] = ['bm:set']

  static examples = [
    {
      description: 'Bookmark a database as "inbox" and set it as default',
      command: '$ notion-cli bookmark set inbox DB_ID_OR_URL --default',
    },
    {
      description: 'Bookmark a page',
      command: '$ notion-cli bookmark set notes PAGE_URL --type page',
    },
  ]

  static args = {
    name: Args.string({ required: true, description: 'Bookmark name (e.g. "inbox", "tasks")' }),
    target: Args.string({ required: true, description: 'Notion ID, URL, or database name' }),
  }

  static flags = {
    type: Flags.string({
      char: 't',
      description: 'Resource type',
      options: ['database', 'page'],
      default: 'database',
    }),
    default: Flags.boolean({
      description: 'Also set as the default bookmark (used by `quick` command)',
      default: false,
    }),
    ...AutomationFlags,
  }

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(BookmarkSet)
    const resourceType = flags.type as 'database' | 'page'

    try {
      // Resolve target to a valid Notion ID (validates it exists)
      const resolvedId = await resolveNotionId(args.target, resourceType)

      // Fetch resource to confirm access and get title for display
      let title = 'Untitled'
      if (resourceType === 'database') {
        const db = await notion.retrieveDataSource(resolvedId)
        title = (db as any).title?.[0]?.plain_text || 'Untitled'
      } else {
        const page = await notion.retrievePage({ page_id: resolvedId })
        title = (page as any).properties?.title?.title?.[0]?.plain_text ||
                (page as any).properties?.Name?.title?.[0]?.plain_text || 'Untitled'
      }

      // Save bookmark
      await setBookmark(args.name, resolvedId, resourceType)

      // Set as default if requested
      if (flags.default) {
        await setDefaultBookmark(args.name)
      }

      if (flags.json) {
        this.log(JSON.stringify({
          success: true,
          data: { name: args.name, id: resolvedId, type: resourceType, title, default: flags.default },
          timestamp: new Date().toISOString()
        }, null, 2))
      } else {
        this.log(`Saved bookmark "${args.name}" → ${title} (${resourceType})`)
        if (flags.default) {
          this.log(`Set as default bookmark for quick capture.`)
        }
      }

      process.exit(0)
    } catch (error) {
      const cliError = error instanceof NotionCLIError
        ? error
        : wrapNotionError(error, { endpoint: 'bookmark.set', resourceType })

      if (flags.json) {
        this.log(JSON.stringify(cliError.toJSON(), null, 2))
      } else {
        this.error(cliError.toHumanString())
      }
      process.exit(1)
    }
  }
}
