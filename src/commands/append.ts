/**
 * Append Shortcut Command
 *
 * Quick-append content to any existing Notion page by name, URL, ID, or bookmark.
 * Combines resolveNotionId (name → page ID) with appendBlockChildren (content → blocks).
 *
 * This is the "write to existing page" counterpart of `quick` (which creates new pages).
 *
 *   notion-cli append "Daily Log" "New note"
 *   notion-cli append PAGE_URL "## Heading\n\nBody"
 *   echo "piped text" | notion-cli append "Daily Log"
 */

import { Args, Command } from '@oclif/core'
import * as notion from '../notion'
import { resolveNotionId } from '../utils/notion-resolver'
import { markdownToBlocks } from '../utils/markdown-to-blocks'
import { AutomationFlags } from '../base-flags'
import { NotionCLIError, wrapNotionError } from '../errors'
import { BlockObjectRequest } from '@notionhq/client/build/src/api-endpoints'

export default class Append extends Command {
  static description = 'Append content to an existing page by name, URL, or ID'

  static aliases: string[] = ['a']

  static examples = [
    {
      description: 'Append text to a page by name',
      command: '$ notion-cli append "Daily Log" "New note to add"',
    },
    {
      description: 'Append markdown content',
      command: '$ notion-cli append "Knowledge Hub" "## Section\\n\\nSome content"',
    },
    {
      description: 'Pipe content from stdin',
      command: '$ echo "Piped content" | notion-cli append "Daily Log"',
    },
    {
      description: 'Use page URL or ID directly',
      command: '$ notion-cli append PAGE_ID "Quick fix note" --json',
    },
  ]

  static args = {
    target: Args.string({
      required: true,
      description: 'Page name, bookmark, URL, or ID',
    }),
    content: Args.string({
      required: false,
      description: 'Markdown content to append',
    }),
  }

  static flags = {
    ...AutomationFlags,
  }

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(Append)

    // 1. Get content — from arg or stdin (checked before try/catch so oclif
    //    error() isn't accidentally caught by the NotionCLIError handler)
    let content = args.content || ''
    if (!content && !process.stdin.isTTY) {
      content = await this.readStdin()
    }
    if (!content) {
      this.log(
        'No content provided.\n' +
        'Usage: notion-cli append "Page Name" "content to add"\n' +
        '   or: echo "content" | notion-cli append "Page Name"'
      )
      process.exit(1)
      return
    }

    try {
      // 2. Resolve target page — supports names, URLs, IDs, bookmarks, fuzzy
      const pageId = await resolveNotionId(args.target, 'page')

      // 3. Convert markdown content to Notion blocks
      const children = markdownToBlocks(content) as BlockObjectRequest[]

      // 4. Append blocks to the page
      const res = await notion.appendBlockChildren({
        block_id: pageId,
        children,
      })

      // 5. Output
      if (flags.json) {
        this.log(JSON.stringify({
          success: true,
          data: res,
          timestamp: new Date().toISOString(),
        }, null, 2))
      } else {
        this.log(`Appended to: ${args.target}`)
        this.log(`${res.results.length} block(s) added`)
      }

      process.exit(0)
    } catch (error) {
      const cliError = error instanceof NotionCLIError
        ? error
        : wrapNotionError(error, {
            endpoint: 'blocks.children.append',
            resourceType: 'page',
            attemptedId: args.target,
          })

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
