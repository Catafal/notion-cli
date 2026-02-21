import { Command, Flags } from '@oclif/core'
import { tableFlags, formatTable } from '../../utils/table-formatter'
import * as notion from '../../notion'
import * as fs from 'fs'
import * as path from 'path'
import { markdownToBlocks } from '../../utils/markdown-to-blocks'
import {
  CreatePageParameters,
  PageObjectResponse,
  BlockObjectRequest,
} from '@notionhq/client/build/src/api-endpoints'
import { getPageTitle, outputRawJson } from '../../helper'
import { resolveNotionId } from '../../utils/notion-resolver'
import { AutomationFlags } from '../../base-flags'
import {
  NotionCLIError,
  wrapNotionError
} from '../../errors'
import { expandSimpleProperties } from '../../utils/property-expander'

export default class PageCreate extends Command {
  static description = 'Create a page'

  static aliases: string[] = ['page:c']

  static examples = [
    {
      description: 'Create a page via interactive mode',
      command: `$ notion-cli page create`,
    },
    {
      description: 'Create a page with a specific parent_page_id',
      command: `$ notion-cli page create -p PARENT_PAGE_ID`,
    },
    {
      description: 'Create a page with a parent page URL',
      command: `$ notion-cli page create -p https://notion.so/PARENT_PAGE_ID`,
    },
    {
      description: 'Create a page with a specific parent_db_id',
      command: `$ notion-cli page create -d PARENT_DB_ID`,
    },
    {
      description: 'Create a page with simple properties (recommended for AI agents)',
      command: `$ notion-cli page create -d DATA_SOURCE_ID -S --properties '{"Name": "My Task", "Status": "In Progress", "Due Date": "2025-12-31"}'`,
    },
    {
      description: 'Create a page with simple properties using relative dates',
      command: `$ notion-cli page create -d DATA_SOURCE_ID -S --properties '{"Name": "Review", "Due Date": "tomorrow", "Priority": "High"}'`,
    },
    {
      description: 'Create a page with simple properties and multi-select',
      command: `$ notion-cli page create -d DATA_SOURCE_ID -S --properties '{"Name": "Bug Fix", "Tags": ["urgent", "bug"], "Status": "Done"}'`,
    },
    {
      description: 'Create a page with a specific source markdown file and parent_page_id',
      command: `$ notion-cli page create -f ./path/to/source.md -p PARENT_PAGE_ID`,
    },
    {
      description: 'Create a page with a specific source markdown file and parent_db_id',
      command: `$ notion-cli page create -f ./path/to/source.md -d PARENT_DB_ID`,
    },
    {
      description:
        'Create a page with a specific source markdown file and output raw json with parent_page_id',
      command: `$ notion-cli page create -f ./path/to/source.md -p PARENT_PAGE_ID -r`,
    },
    {
      description: 'Create a page and output JSON for automation',
      command: `$ notion-cli page create -p PARENT_PAGE_ID --json`,
    },
  ]

  static flags = {
    parent_page_id: Flags.string({
      char: 'p',
      description: 'Parent page ID or URL (to create a sub-page)',
    }),
    parent_data_source_id: Flags.string({
      char: 'd',
      description: 'Parent data source ID or URL (to create a page in a table)',
    }),
    file_path: Flags.string({
      char: 'f',
      description: 'Path to a source markdown file',
    }),
    title_property: Flags.string({
      char: 't',
      description: 'Title property name (auto-detected: "title" for sub-pages, "Name" for databases)',
    }),
    properties: Flags.string({
      description: 'Page properties as JSON string',
    }),
    'simple-properties': Flags.boolean({
      char: 'S',
      description: 'Use simplified property format (flat key-value pairs, recommended for AI agents)',
      default: false,
    }),
    raw: Flags.boolean({
      char: 'r',
      description: 'output raw json',
    }),
    ...tableFlags,
    ...AutomationFlags,
  }

  public async run(): Promise<void> {
    const { flags } = await this.parse(PageCreate)

    try {
      let pageProps: CreatePageParameters
      let pageParent: CreatePageParameters['parent']

      if (flags.parent_page_id) {
        // Resolve parent page ID from URL, direct ID, or name (future)
        const parentPageId = await resolveNotionId(flags.parent_page_id, 'page')
        pageParent = {
          page_id: parentPageId,
        }
      } else {
        // Resolve parent database ID from URL, direct ID, or name (future)
        const parentDataSourceId = await resolveNotionId(flags.parent_data_source_id!, 'database')
        pageParent = {
          data_source_id: parentDataSourceId,
        }
      }

      // Auto-detect title property: sub-pages use "title", database pages use "Name"
      // User can override with -t flag
      const titleProperty = flags.title_property ?? (flags.parent_page_id ? 'title' : 'Name')

      // Build properties object
      let properties: any = {}

      // Handle properties flag
      if (flags.properties) {
        try {
          const parsedProps = JSON.parse(flags.properties)

          if (flags['simple-properties']) {
            if (flags.parent_page_id) {
              // Sub-pages only have a title property — expand it directly without schema
              const titleValue = parsedProps[titleProperty] || parsedProps['title'] || parsedProps['Title']
              if (titleValue && typeof titleValue === 'string') {
                properties[titleProperty] = {
                  title: [{ text: { content: titleValue } }]
                }
              } else {
                throw new Error(
                  'Sub-page creation with -S requires a title property.\n' +
                  `Example: --properties '{"${titleProperty}": "My Page"}'`
                )
              }
            } else if (flags.parent_data_source_id) {
              // Database pages — use schema-based expansion
              const parentDataSourceId = await resolveNotionId(flags.parent_data_source_id, 'database')
              const dbSchema = await notion.retrieveDataSource(parentDataSourceId)
              properties = await expandSimpleProperties(parsedProps, dbSchema.properties)
            } else {
              throw new Error(
                'The --simple-properties flag requires either -p (sub-page) or -d (database) to be set.'
              )
            }
          } else {
            // Use raw Notion format
            properties = parsedProps
          }
        } catch (error: any) {
          if (error.message.includes('Unexpected token') || error.message.includes('JSON')) {
            throw new Error(
              `Invalid JSON in --properties flag: ${error.message}\n` +
              `Example: --properties '{"Name": "Task", "Status": "Done"}'`
            )
          }
          throw error
        }
      }

      if (flags.file_path) {
        // Resolve path and prevent directory traversal outside cwd
        const basePath = path.resolve('./')
        const p = path.resolve(basePath, flags.file_path)
        if (!p.startsWith(basePath)) {
          throw new Error(`Invalid file path: must be within current directory`)
        }
        const fileName = path.basename(flags.file_path)
        const md = fs.readFileSync(p, { encoding: 'utf-8' })
        const blocks = markdownToBlocks(md)

        // Extract title from H1 heading or use filename without extension
        const extractTitle = (markdown: string, filename: string): string => {
          const h1Match = markdown.match(/^#\s+(.+)$/m)
          if (h1Match && h1Match[1]) {
            return h1Match[1].trim()
          }
          // Fallback: use filename without extension
          return filename.replace(/\.md$/, '')
        }

        const pageTitle = extractTitle(md, fileName)

        // If no properties were provided via flag, use extracted title
        if (!flags.properties) {
          properties = {
            [titleProperty]: {
              title: [{ text: { content: pageTitle } }],
            },
          }
        } else {
          // Merge with existing properties, but ensure title is set
          if (!properties[titleProperty]) {
            properties[titleProperty] = {
              title: [{ text: { content: pageTitle } }],
            }
          }
        }

        pageProps = {
          parent: pageParent,
          properties,
          children: blocks as BlockObjectRequest[],
        }
      } else {
        pageProps = {
          parent: pageParent,
          properties,
        }
      }

      const res = await notion.createPage(pageProps)

      // Handle JSON output for automation
      if (flags.json) {
        this.log(JSON.stringify({
          success: true,
          data: res,
          timestamp: new Date().toISOString()
        }, null, 2))
        process.exit(0)
        return
      }

      // Handle raw JSON output (legacy)
      if (flags.raw) {
        outputRawJson(res)
        process.exit(0)
        return
      }

      // Handle table output
      const columns = {
        title: {
          get: (row: PageObjectResponse) => {
            return getPageTitle(row)
          },
        },
        object: {},
        id: {},
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
            endpoint: 'pages.create'
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
