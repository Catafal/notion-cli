import { Args, Command } from '@oclif/core'
import { resolveNotionId } from '../utils/notion-resolver'
import { NotionCLIError, wrapNotionError } from '../errors'
import { startNavigator } from '../utils/interactive-navigator'

export default class Browse extends Command {
  static description = 'Interactively navigate a Notion page tree with arrow keys'

  static aliases: string[] = ['nav']

  static examples = [
    {
      description: 'Browse a page by ID',
      command: '$ notion-cli browse PAGE_ID',
    },
    {
      description: 'Browse a page by URL',
      command: '$ notion-cli browse https://notion.so/My-Page-abc123',
    },
  ]

  static args = {
    page_id: Args.string({
      required: true,
      description: 'Page ID, URL, or name to start browsing from',
    }),
  }

  public async run(): Promise<void> {
    const { args } = await this.parse(Browse)

    try {
      const pageId = await resolveNotionId(args.page_id, 'page')
      await startNavigator(pageId, this.log.bind(this))
    } catch (error) {
      const cliError = error instanceof NotionCLIError
        ? error
        : wrapNotionError(error, {
            resourceType: 'page',
            attemptedId: args.page_id,
            endpoint: 'browse',
          })
      this.error(cliError.toHumanString())
    }
  }
}
