import { Args, Command, Flags } from '@oclif/core'
import * as fs from 'fs'
import * as path from 'path'
import * as notion from '../../notion'
import { NotionToMarkdown } from 'notion-to-md'
import { resolveNotionId } from '../../utils/notion-resolver'
import { stripMetadata } from '../../helper'
import { AutomationFlags } from '../../base-flags'
import { NotionCLIError, wrapNotionError } from '../../errors'

/**
 * Export a Notion page to a local file (markdown or JSON).
 *
 * This is the reverse of `page create -f`: instead of reading a local file
 * and pushing it to Notion, it pulls a Notion page and writes it locally.
 *
 * Markdown is the default format because it's human-readable and round-trips
 * well with `page create -f`. JSON is available via --json for automation
 * or lossless backups.
 */
export default class PageExport extends Command {
  static description = 'Export a Notion page to markdown or JSON'

  static aliases: string[] = ['page:e']

  static examples = [
    {
      description: 'Export page as markdown to stdout',
      command: '$ notion-cli page export PAGE_ID',
    },
    {
      description: 'Export page as markdown to a file',
      command: '$ notion-cli page export PAGE_ID -o notes.md',
    },
    {
      description: 'Export page as JSON to a file',
      command: '$ notion-cli page export PAGE_ID --json -o page.json',
    },
    {
      description: 'Export using a Notion URL',
      command: '$ notion-cli page export "https://notion.so/My-Page-abc123" -o notes.md',
    },
    {
      description: 'Pipe markdown to another command',
      command: '$ notion-cli page export PAGE_ID | head -20',
    },
  ]

  static args = {
    page_id: Args.string({
      required: true,
      description: 'Page ID or full Notion URL',
    }),
  }

  static flags = {
    output: Flags.string({
      char: 'o',
      description: 'File path to write (omit for stdout)',
    }),
    ...AutomationFlags,
  }

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(PageExport)

    try {
      const pageId = await resolveNotionId(args.page_id, 'page')

      // Choose format: JSON for structured data, markdown for human-readable
      let content: string
      if (flags.json) {
        let page = await notion.retrievePage({ page_id: pageId })
        if (flags.minimal) {
          page = stripMetadata(page)
        }
        content = JSON.stringify(page, null, 2)
      } else {
        // notion-to-md handles all block fetching and conversion internally
        const n2m = new NotionToMarkdown({ notionClient: notion.client })
        const mdBlocks = await n2m.pageToMarkdown(pageId)
        content = n2m.toMarkdownString(mdBlocks).parent
      }

      // Write to file or stdout
      if (flags.output) {
        const resolvedPath = this.validateOutputPath(flags.output)
        fs.writeFileSync(resolvedPath, content, 'utf-8')
        this.log(`Exported to ${flags.output}`)
      } else {
        this.log(content)
      }

      process.exit(0)
    } catch (error) {
      const cliError = error instanceof NotionCLIError
        ? error
        : wrapNotionError(error, {
            resourceType: 'page',
            attemptedId: args.page_id,
            endpoint: 'page.export'
          })

      if (flags.json) {
        this.log(JSON.stringify(cliError.toJSON(), null, 2))
      } else {
        this.error(cliError.toHumanString())
      }
      process.exit(1)
    }
  }

  /**
   * Validate output path to prevent directory traversal attacks.
   * Ensures the resolved path stays within the current working directory.
   */
  private validateOutputPath(filePath: string): string {
    const basePath = path.resolve('./')
    const resolved = path.resolve(basePath, filePath)
    if (!resolved.startsWith(basePath)) {
      throw new NotionCLIError(
        'VALIDATION_ERROR' as any,
        'Invalid output path: must be within current directory',
        [{ description: 'Use a relative path', command: 'notion-cli page export PAGE_ID -o ./output.md' }]
      )
    }
    return resolved
  }
}
