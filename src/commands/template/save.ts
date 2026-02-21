/**
 * Template Save Command
 *
 * Saves a reusable page template with properties, body content, and/or icon.
 * Templates use simple properties format (flat JSON) and are NOT tied to a
 * specific database — they're expanded against the target schema at use-time.
 */

import { Args, Command, Flags } from '@oclif/core'
import { setTemplate, Template } from '../../utils/templates'
import { AutomationFlags } from '../../base-flags'
import { NotionCLIError, NotionCLIErrorCode } from '../../errors'

export default class TemplateSave extends Command {
  static description = 'Save a reusable page template'

  static aliases: string[] = ['tpl:save']

  static examples = [
    {
      description: 'Save a template with properties',
      command: '$ notion-cli template save "meeting" --properties \'{"Status": "To Do", "Type": "Meeting"}\'',
    },
    {
      description: 'Save with properties, body content, and icon',
      command: '$ notion-cli template save "standup" --properties \'{"Status": "In Progress"}\' --content "# Standup\\n\\n## Done\\n\\n## Doing\\n\\n## Blockers" --icon "🧑‍💻"',
    },
  ]

  static args = {
    name: Args.string({ required: true, description: 'Template name (e.g. "meeting", "task")' }),
  }

  static flags = {
    properties: Flags.string({
      char: 'p',
      description: 'Properties as JSON (simple format, e.g. \'{"Status": "To Do"}\')',
    }),
    content: Flags.string({
      char: 'c',
      description: 'Markdown body content for the page',
    }),
    icon: Flags.string({
      description: 'Emoji icon (e.g. "📋")',
    }),
    ...AutomationFlags,
  }

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(TemplateSave)

    // Must provide at least one field
    if (!flags.properties && !flags.content && !flags.icon) {
      this.error(
        'Provide at least one of --properties, --content, or --icon.\n' +
        'Example: notion-cli template save "task" --properties \'{"Status": "To Do"}\''
      )
      process.exit(1)
      return
    }

    // Parse and validate properties JSON
    let properties: Record<string, any> | undefined
    if (flags.properties) {
      try {
        properties = JSON.parse(flags.properties)
        if (typeof properties !== 'object' || Array.isArray(properties) || properties === null) {
          throw new Error('Properties must be a JSON object')
        }
      } catch (error: any) {
        throw new NotionCLIError(
          NotionCLIErrorCode.INVALID_JSON,
          `Invalid properties JSON: ${error.message}`,
          [{ description: 'Properties must be a JSON object like: {"Status": "To Do", "Priority": 3}' }]
        )
      }
    }

    // Build template object — only include fields that were provided
    const template: Template = {
      ...(properties && { properties }),
      ...(flags.content && { content: flags.content }),
      ...(flags.icon && { icon: flags.icon }),
    }

    await setTemplate(args.name, template)

    if (flags.json) {
      this.log(JSON.stringify({
        success: true,
        data: { name: args.name, ...template },
        timestamp: new Date().toISOString()
      }, null, 2))
    } else {
      this.log(`Saved template "${args.name}"`)
      if (properties) this.log(`  Properties: ${Object.keys(properties).join(', ')}`)
      if (flags.content) this.log(`  Content: ${flags.content.substring(0, 60)}${flags.content.length > 60 ? '...' : ''}`)
      if (flags.icon) this.log(`  Icon: ${flags.icon}`)
    }

    process.exit(0)
  }
}
