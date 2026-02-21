/**
 * Template Use Command
 *
 * Creates a page from a saved template. The template's simple properties
 * are expanded against the target database schema at runtime, making
 * templates portable across different databases.
 *
 * Target database can be specified via --to flag or defaults to the
 * default bookmark (same resolution as `quick` command).
 */

import { Args, Command, Flags } from '@oclif/core'
import * as notion from '../../notion'
import { getTemplate } from '../../utils/templates'
import { getDefaultBookmark } from '../../utils/bookmarks'
import { resolveNotionId } from '../../utils/notion-resolver'
import { expandSimpleProperties } from '../../utils/property-expander'
import { markdownToBlocks } from '../../utils/markdown-to-blocks'
import { AutomationFlags } from '../../base-flags'
import { NotionCLIError, wrapNotionError } from '../../errors'
import { BlockObjectRequest } from '@notionhq/client/build/src/api-endpoints'

export default class TemplateUse extends Command {
  static description = 'Create a page from a saved template'

  static aliases: string[] = ['tpl:use']

  static examples = [
    {
      description: 'Create a page from a template',
      command: '$ notion-cli template use "meeting" --to tasks --title "Sprint Planning"',
    },
    {
      description: 'Use default bookmark as target',
      command: '$ notion-cli template use "task" --title "Fix login bug"',
    },
  ]

  static args = {
    name: Args.string({ required: true, description: 'Template name to use' }),
  }

  static flags = {
    to: Flags.string({
      description: 'Target bookmark name, database name, or ID (defaults to default bookmark)',
    }),
    title: Flags.string({
      char: 't',
      description: 'Page title (overrides any title in template properties)',
      required: true,
    }),
    ...AutomationFlags,
  }

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(TemplateUse)

    try {
      // 1. Load template
      const template = await getTemplate(args.name)
      if (!template) {
        this.error(`Template "${args.name}" not found.\nRun \`notion-cli template list\` to see saved templates.`)
        process.exit(1)
        return
      }

      // 2. Resolve target database
      const target = flags.to || await getDefaultBookmark()
      if (!target) {
        this.error(
          'No target database specified and no default bookmark set.\n' +
          'Specify: notion-cli template use "name" --to DB_NAME_OR_ID --title "Title"\n' +
          '   or set a default: notion-cli bookmark set inbox DB_ID --default'
        )
        process.exit(1)
        return
      }
      const dbId = await resolveNotionId(target, 'database')

      // 3. Get database schema to find title property and expand simple props
      const schema = await notion.retrieveDataSource(dbId)
      const titlePropName = findTitleProperty(schema)

      // 4. Build properties — merge template props with title
      let expandedProperties: Record<string, any> = {}
      if (template.properties && Object.keys(template.properties).length > 0) {
        // Inject title into simple properties before expanding
        const merged = { ...template.properties, [titlePropName]: flags.title }
        expandedProperties = await expandSimpleProperties(merged, schema.properties)
      } else {
        // No template properties — just set title
        expandedProperties = {
          [titlePropName]: {
            title: [{ text: { content: flags.title } }]
          }
        }
      }

      // 5. Convert template content to blocks (if exists)
      const children = template.content
        ? markdownToBlocks(template.content) as BlockObjectRequest[]
        : undefined

      // 6. Build page params
      const pageParams: any = {
        parent: { data_source_id: dbId },
        properties: expandedProperties,
        ...(children && { children }),
        ...(template.icon && { icon: { emoji: template.icon } }),
      }

      // 7. Create page
      const res = await notion.createPage(pageParams)

      // 8. Output
      if (flags.json) {
        this.log(JSON.stringify({
          success: true,
          data: res,
          template: args.name,
          timestamp: new Date().toISOString()
        }, null, 2))
      } else {
        this.log(`Created from template "${args.name}": ${flags.title}`)
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
  return 'Name'
}
