import { Args, Command, Flags } from '@oclif/core'
import * as notion from '../notion'
import { resolveNotionId } from '../utils/notion-resolver'
import { getDefaultBookmark } from '../utils/bookmarks'
import { getTemplate } from '../utils/templates'
import { expandSimpleProperties } from '../utils/property-expander'
import { markdownToBlocks } from '../utils/markdown-to-blocks'
import { AutomationFlags } from '../base-flags'
import { NotionCLIError, wrapNotionError } from '../errors'
import { BlockObjectRequest } from '@notionhq/client/build/src/api-endpoints'

/**
 * Zero-friction page creation for quick thoughts and notes.
 *
 * Uses the default bookmark (or --to flag) to know which database to target.
 * Title is the first line; remaining lines become page body as markdown blocks.
 *
 * Supports stdin piping: echo "notes" | notion-cli quick --title "From pipe"
 */
export default class Quick extends Command {
  static description = 'Quick-capture a page to a bookmarked database'

  static aliases: string[] = ['q']

  static examples = [
    {
      description: 'Add a quick note to default database',
      command: '$ notion-cli quick "Buy groceries"',
    },
    {
      description: 'Add to a specific bookmark',
      command: '$ notion-cli quick "Fix login bug" --to tasks',
    },
    {
      description: 'Pipe content from stdin',
      command: '$ echo "Meeting notes here" | notion-cli quick --title "Standup"',
    },
  ]

  static args = {
    content: Args.string({ required: false, description: 'Page content (first line = title, rest = body)' }),
  }

  static flags = {
    to: Flags.string({
      description: 'Target bookmark name, database name, or ID (defaults to default bookmark)',
    }),
    title: Flags.string({
      char: 't',
      description: 'Override title (useful with stdin piping)',
    }),
    template: Flags.string({
      description: 'Apply a saved template (properties and content)',
    }),
    ...AutomationFlags,
  }

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(Quick)

    try {
      // 1. Get content — from arg or stdin
      let content = args.content || ''
      if (!content && !process.stdin.isTTY) {
        content = await this.readStdin()
      }
      if (!content && !flags.title) {
        this.error('Provide content as argument or pipe via stdin.\n' +
          'Usage: notion-cli quick "My note"\n' +
          '   or: echo "notes" | notion-cli quick --title "Title"')
        process.exit(1)
        return
      }

      // 2. Determine target database
      const target = flags.to || await getDefaultBookmark()
      if (!target) {
        this.error('No target database specified and no default bookmark set.\n' +
          'Set a default: notion-cli bookmark set inbox DB_ID --default\n' +
          '   or specify: notion-cli quick "note" --to DB_NAME_OR_ID')
        process.exit(1)
        return
      }
      const dbId = await resolveNotionId(target, 'database')

      // 3. Get database schema to find the title property name
      const schema = await notion.retrieveDataSource(dbId)
      const titlePropName = findTitleProperty(schema)

      // 4. Split content into title + body
      const lines = content.split('\n')
      const pageTitle = flags.title || lines[0].trim()
      const body = flags.title ? content : lines.slice(1).join('\n').trim()

      // 5. Build page properties (merge template properties if provided)
      let properties: any = {
        [titlePropName]: {
          title: [{ text: { content: pageTitle } }]
        }
      }

      // 5a. If a template is specified, expand its properties and merge
      let templateIcon: string | undefined
      let templateContent: string | undefined
      if (flags.template) {
        const tmpl = await getTemplate(flags.template)
        if (!tmpl) {
          this.error(`Template "${flags.template}" not found.\nRun \`notion-cli template list\` to see saved templates.`)
          process.exit(1)
          return
        }
        if (tmpl.properties && Object.keys(tmpl.properties).length > 0) {
          const merged = { ...tmpl.properties, [titlePropName]: pageTitle }
          properties = await expandSimpleProperties(merged, schema.properties)
        }
        templateIcon = tmpl.icon
        templateContent = tmpl.content
      }

      // 6. Build children blocks — body from arg takes precedence over template content
      const contentForBlocks = body || templateContent
      const children = contentForBlocks ? markdownToBlocks(contentForBlocks) as BlockObjectRequest[] : undefined

      // 7. Create page
      const res = await notion.createPage({
        parent: { data_source_id: dbId },
        properties,
        ...(children && { children }),
        ...(templateIcon && { icon: { emoji: templateIcon } }),
      })

      // 8. Output
      if (flags.json) {
        this.log(JSON.stringify({
          success: true,
          data: res,
          timestamp: new Date().toISOString()
        }, null, 2))
      } else {
        this.log(`Created: ${pageTitle}`)
        this.log((res as any).url)
      }

      process.exit(0)
    } catch (error) {
      const cliError = error instanceof NotionCLIError
        ? error
        : wrapNotionError(error, { endpoint: 'pages.create', resourceType: 'page' })

      if (flags.json) {
        this.log(JSON.stringify(cliError.toJSON(), null, 2))
      } else {
        this.error(cliError.toHumanString())
      }
      process.exit(1)
    }
  }

  /** Read all data from stdin (for piped input). */
  private readStdin(): Promise<string> {
    return new Promise((resolve) => {
      const chunks: Buffer[] = []
      process.stdin.on('data', (chunk) => chunks.push(chunk))
      process.stdin.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8').trim()))
    })
  }
}

/**
 * Find the title property name in a database schema.
 * Notion databases always have exactly one title property, but its name varies.
 */
function findTitleProperty(schema: any): string {
  if (schema.properties) {
    for (const [name, prop] of Object.entries(schema.properties)) {
      if ((prop as any).type === 'title') return name
    }
  }
  // Fallback — most common default
  return 'Name'
}
