import { expect } from 'chai'
import * as sinon from 'sinon'
import {
  extractNavigableItems,
  buildChoices,
  startNavigator,
  NAV_BACK,
  NAV_QUIT,
  NavigatorDeps,
} from '../../src/utils/interactive-navigator'

describe('interactive-navigator', () => {
  // ==================== extractNavigableItems ====================

  describe('extractNavigableItems', () => {
    it('should filter child_page and child_database items', () => {
      const structure = [
        { type: 'child_page', id: 'page-1', title: 'Page One' },
        { type: 'paragraph', id: 'para-1', text: 'some text' },
        { type: 'child_database', id: 'db-1', title: 'My Database' },
        { type: 'heading_1', id: 'h1-1', text: 'Header' },
      ]

      const result = extractNavigableItems(structure)

      expect(result).to.have.lengthOf(2)
      expect(result[0]).to.deep.equal({ id: 'page-1', title: 'Page One', type: 'child_page' })
      expect(result[1]).to.deep.equal({ id: 'db-1', title: 'My Database', type: 'child_database' })
    })

    it('should return empty array when no navigable items', () => {
      const structure = [
        { type: 'paragraph', id: 'p-1' },
        { type: 'heading_1', id: 'h-1' },
      ]

      const result = extractNavigableItems(structure)
      expect(result).to.have.lengthOf(0)
    })

    it('should handle empty structure', () => {
      const result = extractNavigableItems([])
      expect(result).to.have.lengthOf(0)
    })

    it('should default title to "Untitled" when missing', () => {
      const structure = [
        { type: 'child_page', id: 'page-1' },
        { type: 'child_database', id: 'db-1', title: undefined },
      ]

      const result = extractNavigableItems(structure)

      expect(result[0].title).to.equal('Untitled')
      expect(result[1].title).to.equal('Untitled')
    })

    it('should preserve existing titles', () => {
      const structure = [
        { type: 'child_page', id: 'page-1', title: 'My Page' },
      ]

      const result = extractNavigableItems(structure)
      expect(result[0].title).to.equal('My Page')
    })
  })

  // ==================== buildChoices ====================

  describe('buildChoices', () => {
    const items = [
      { id: 'page-1', title: 'Page One', type: 'child_page' as const },
      { id: 'db-1', title: 'Tasks DB', type: 'child_database' as const },
    ]

    it('should include Back option when hasParent is true', () => {
      const choices = buildChoices(items, true)

      expect(choices[0]).to.deep.equal({ name: '.. Back', value: NAV_BACK })
    })

    it('should not include Back option when hasParent is false', () => {
      const choices = buildChoices(items, false)

      expect(choices[0].value).to.not.equal(NAV_BACK)
    })

    it('should always include Quit as last option', () => {
      const choices = buildChoices(items, false)
      const last = choices[choices.length - 1]

      expect(last).to.deep.equal({ name: '[Quit]', value: NAV_QUIT })
    })

    it('should prefix database items with [DB]', () => {
      const choices = buildChoices(items, false)

      // First item is a page — no prefix
      expect(choices[0].name).to.equal('Page One')
      // Second item is a database — [DB] prefix
      expect(choices[1].name).to.equal('[DB] Tasks DB')
    })

    it('should handle empty items list with parent', () => {
      const choices = buildChoices([], true)

      expect(choices).to.have.lengthOf(2) // Back + Quit
      expect(choices[0].value).to.equal(NAV_BACK)
      expect(choices[1].value).to.equal(NAV_QUIT)
    })

    it('should handle empty items list without parent', () => {
      const choices = buildChoices([], false)

      expect(choices).to.have.lengthOf(1) // Quit only
      expect(choices[0].value).to.equal(NAV_QUIT)
    })
  })

  // ==================== startNavigator ====================

  describe('startNavigator', () => {
    let logSpy: sinon.SinonSpy
    let originalIsTTY: boolean | undefined

    const mockPageData = (title: string, children: Array<{ type: string; id: string; title?: string }>, icon?: string) => ({
      id: 'test-page-id',
      title,
      type: 'page',
      icon,
      structure: children,
    })

    // Helper to create injectable deps with a sequence of select responses
    function makeDeps(
      fetchResponses: Array<ReturnType<typeof mockPageData>>,
      selectResponses: string[]
    ): NavigatorDeps {
      let fetchIndex = 0
      let selectIndex = 0
      return {
        fetchStructure: async () => {
          return fetchResponses[fetchIndex++] as any
        },
        selectFn: async () => {
          return selectResponses[selectIndex++]
        },
      }
    }

    beforeEach(() => {
      // Ensure TTY is simulated
      originalIsTTY = process.stdin.isTTY
      ;(process.stdin as any).isTTY = true
      logSpy = sinon.spy()
    })

    afterEach(() => {
      ;(process.stdin as any).isTTY = originalIsTTY
    })

    it('should quit immediately when user selects Quit', async () => {
      const deps = makeDeps(
        [mockPageData('Root Page', [{ type: 'child_page', id: 'child-1', title: 'Child Page' }])],
        [NAV_QUIT]
      )

      await startNavigator('root-id', logSpy, deps)

      expect(logSpy.calledOnce).to.be.true
      expect(logSpy.firstCall.args[0]).to.contain('Root Page')
    })

    it('should navigate into a child page and quit', async () => {
      const deps = makeDeps(
        [
          mockPageData('Root', [{ type: 'child_page', id: 'child-1', title: 'Child' }]),
          mockPageData('Child', []),
        ],
        ['child-1', NAV_QUIT]
      )

      await startNavigator('root-id', logSpy, deps)

      // Should have logged headers for both pages + "No children" message
      expect(logSpy.callCount).to.be.greaterThan(1)
    })

    it('should navigate back to parent page', async () => {
      const fetchCalls: string[] = []
      const deps: NavigatorDeps = {
        fetchStructure: async (pageId: string) => {
          fetchCalls.push(pageId)
          if (pageId === 'child-1') {
            return mockPageData('Child', []) as any
          }
          return mockPageData('Root', [{ type: 'child_page', id: 'child-1', title: 'Child' }]) as any
        },
        selectFn: (() => {
          const responses = ['child-1', NAV_BACK, NAV_QUIT]
          let idx = 0
          return async () => responses[idx++]
        })(),
      }

      await startNavigator('root-id', logSpy, deps)

      // Should have fetched root -> child -> root
      expect(fetchCalls).to.deep.equal(['root-id', 'child-1', 'root-id'])
    })

    it('should exit with message when page has no children and no parent', async () => {
      const deps = makeDeps(
        [mockPageData('Empty Page', [])],
        [] // select should never be called
      )

      await startNavigator('empty-id', logSpy, deps)

      expect(logSpy.calledWith('No child pages or databases found.')).to.be.true
    })

    it('should display icon in header when present', async () => {
      const deps = makeDeps(
        [mockPageData('My Page', [{ type: 'child_page', id: 'c1', title: 'Sub' }], '📝')],
        [NAV_QUIT]
      )

      await startNavigator('test-id', logSpy, deps)

      expect(logSpy.firstCall.args[0]).to.contain('📝')
      expect(logSpy.firstCall.args[0]).to.contain('My Page')
    })

    it('should throw NotionCLIError when not in TTY', async () => {
      ;(process.stdin as any).isTTY = false

      try {
        await startNavigator('test-id', logSpy)
        expect.fail('Should have thrown')
      } catch (error: any) {
        expect(error.message).to.contain('interactive terminal')
      }
    })

    it('should wrap API errors', async () => {
      const deps: NavigatorDeps = {
        fetchStructure: async () => { throw new Error('API failed') },
        selectFn: async () => NAV_QUIT,
      }

      try {
        await startNavigator('bad-id', logSpy, deps)
        expect.fail('Should have thrown')
      } catch (error: any) {
        expect(error).to.exist
      }
    })

    it('should show child count in header', async () => {
      const deps = makeDeps(
        [mockPageData('Parent', [
          { type: 'child_page', id: 'c1', title: 'A' },
          { type: 'child_page', id: 'c2', title: 'B' },
          { type: 'child_database', id: 'db1', title: 'DB' },
          { type: 'paragraph', id: 'p1' }, // not navigable
        ])],
        [NAV_QUIT]
      )

      await startNavigator('test-id', logSpy, deps)

      // 3 navigable children (2 pages + 1 database)
      expect(logSpy.firstCall.args[0]).to.contain('3 children')
    })
  })
})
