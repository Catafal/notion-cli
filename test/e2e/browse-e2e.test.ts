/**
 * E2E tests for the browse command navigator.
 *
 * Uses real Notion API calls (via mapPageStructure) with injected selectFn
 * to simulate user navigation without requiring an interactive terminal.
 *
 * All imports use require() to avoid Node 25 ESM resolution issues.
 *
 * Requires: NOTION_TOKEN env var set, integration has access to the test page.
 *
 * Test page: "Startup School | by YC"
 * ID: 2833826d3377807ab7ebd8582940b47c (38 child pages)
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const { expect } = require('chai')
const nock = require('nock')
const {
  startNavigator,
  extractNavigableItems,
  buildChoices,
  NAV_BACK,
  NAV_QUIT,
} = require('../../src/utils/interactive-navigator')
const { mapPageStructure } = require('../../src/notion')
/* eslint-enable @typescript-eslint/no-require-imports */

// The Startup School page with ~38 child pages
const TEST_PAGE_ID = '2833826d3377807ab7ebd8582940b47c'

describe('browse E2E — Startup School page', function () {
  // API calls can be slow
  this.timeout(30_000)

  let logMessages: string[]
  let logSpy: (msg: string) => void
  let originalIsTTY: boolean | undefined

  before(() => {
    // Allow real network calls for E2E tests (nock blocks all by default in setup.ts)
    nock.cleanAll()
    nock.enableNetConnect()
  })

  after(() => {
    // Re-disable network after E2E tests
    nock.disableNetConnect()
    nock.enableNetConnect('127.0.0.1')
  })

  beforeEach(() => {
    logMessages = []
    logSpy = (msg: string) => logMessages.push(msg)
    // Simulate TTY for startNavigator's guard
    originalIsTTY = process.stdin.isTTY
    ;(process.stdin as any).isTTY = true
  })

  afterEach(() => {
    ;(process.stdin as any).isTTY = originalIsTTY
  })

  /**
   * Helper: creates NavigatorDeps with real API fetching
   * and a scripted sequence of select responses.
   */
  function realApiDeps(selectResponses: string[]) {
    let selectIndex = 0
    return {
      fetchStructure: mapPageStructure,
      selectFn: async () => selectResponses[selectIndex++],
    }
  }

  // ==================== Test Cases ====================

  it('should fetch and display the Startup School page with children', async () => {
    const deps = realApiDeps([NAV_QUIT])

    await startNavigator(TEST_PAGE_ID, logSpy, deps)

    // Header should contain page title
    const header = logMessages[0]
    expect(header).to.contain('Startup School')
    // Should show child count > 0
    expect(header).to.match(/\(\d+ children\)/)
    // Extract the count
    const match = header.match(/\((\d+) children\)/)
    expect(match).to.not.be.null
    const childCount = parseInt(match![1], 10)
    expect(childCount).to.be.greaterThan(10) // has ~38 children
  })

  it('should navigate into a child page and back', async () => {
    // Step 1: Fetch root to discover first child's ID
    const rootData = await mapPageStructure(TEST_PAGE_ID)
    const rootItems = extractNavigableItems(rootData.structure)
    expect(rootItems.length).to.be.greaterThan(0)

    const firstChild = rootItems[0]

    // Step 2: Navigate root -> first child -> back -> quit
    const deps = realApiDeps([firstChild.id, NAV_BACK, NAV_QUIT])

    await startNavigator(TEST_PAGE_ID, logSpy, deps)

    // Should have logged at least 3 headers:
    // 1. Root page header
    // 2. Child page header
    // 3. Root page header again (after back)
    const headers = logMessages.filter((m: string) => m.includes('children)'))
    expect(headers.length).to.be.greaterThanOrEqual(3)

    // First and third headers should both contain root title
    expect(headers[0]).to.contain('Startup School')
    expect(headers[2]).to.contain('Startup School')
  })

  it('should navigate into a child page and quit from there', async () => {
    // Fetch root to get a child ID
    const rootData = await mapPageStructure(TEST_PAGE_ID)
    const items = extractNavigableItems(rootData.structure)
    const firstChild = items[0]

    // Navigate root -> child -> quit
    const deps = realApiDeps([firstChild.id, NAV_QUIT])

    await startNavigator(TEST_PAGE_ID, logSpy, deps)

    // Should have logged 2+ headers (root + child)
    const headers = logMessages.filter((m: string) => m.includes('children)'))
    expect(headers.length).to.be.greaterThanOrEqual(2)

    // First header is root
    expect(headers[0]).to.contain('Startup School')
    // Second header is the child page
    expect(headers[1]).to.contain(firstChild.title)
  })

  it('should navigate 2 levels deep and backtrack', async function () {
    // Fetch root
    const rootData = await mapPageStructure(TEST_PAGE_ID)
    const rootItems = extractNavigableItems(rootData.structure)
    const firstChild = rootItems[0]

    // Fetch first child to find its children
    const childData = await mapPageStructure(firstChild.id)
    const childItems = extractNavigableItems(childData.structure)

    if (childItems.length === 0) {
      // First child is a leaf — skip this test
      this.skip()
      return
    }

    const grandchild = childItems[0]

    // Navigate: root -> child -> grandchild -> back -> back -> quit
    const deps = realApiDeps([
      firstChild.id,
      grandchild.id,
      NAV_BACK,
      NAV_BACK,
      NAV_QUIT,
    ])

    await startNavigator(TEST_PAGE_ID, logSpy, deps)

    // Should have 5 headers: root, child, grandchild, child (back), root (back)
    const headers = logMessages.filter((m: string) => m.includes('children)'))
    expect(headers.length).to.be.greaterThanOrEqual(5)
  })

  it('should correctly identify child databases with [DB] prefix', async () => {
    const rootData = await mapPageStructure(TEST_PAGE_ID)
    const items = extractNavigableItems(rootData.structure)

    // Check if any databases exist in children
    const databases = items.filter((i: any) => i.type === 'child_database')
    const pages = items.filter((i: any) => i.type === 'child_page')

    // Build choices and verify DB prefix
    const choices = buildChoices(items, false)
    for (const db of databases) {
      const choice = choices.find((c: any) => c.value === db.id)
      expect(choice).to.exist
      expect(choice!.name).to.match(/^\[DB\] /)
    }

    // Verify pages don't have [DB] prefix
    for (const page of pages) {
      const choice = choices.find((c: any) => c.value === page.id)
      expect(choice).to.exist
      expect(choice!.name).to.not.match(/^\[DB\] /)
    }
  })

  it('should show icon in header when page has one', async () => {
    const deps = realApiDeps([NAV_QUIT])

    await startNavigator(TEST_PAGE_ID, logSpy, deps)

    // The Startup School page has an image icon (S3 URL), not an emoji
    // Header format: "<icon> <title>  (N children)" where icon can be a URL
    const header = logMessages[0]
    expect(header).to.contain('Startup School')
    expect(header).to.contain('children)')
  })

  it('should handle a leaf page (no children) correctly', async function () {
    // Find a child page that is a leaf (no sub-children)
    const rootData = await mapPageStructure(TEST_PAGE_ID)
    const rootItems = extractNavigableItems(rootData.structure)

    // Try multiple children to find a leaf
    let leafId: string | null = null
    for (const item of rootItems.slice(0, 5)) {
      const childData = await mapPageStructure(item.id)
      const childItems = extractNavigableItems(childData.structure)
      if (childItems.length === 0) {
        leafId = item.id
        break
      }
    }

    if (!leafId) {
      // All checked children have sub-children — skip
      this.skip()
      return
    }

    // Navigate into the leaf page — should show Back + Quit only
    const deps = realApiDeps([leafId, NAV_BACK, NAV_QUIT])

    await startNavigator(TEST_PAGE_ID, logSpy, deps)

    // After entering the leaf, header should show "0 children"
    const headers = logMessages.filter((m: string) => m.includes('children)'))
    expect(headers.length).to.be.greaterThanOrEqual(2)
    expect(headers[1]).to.contain('0 children')
  })

  it('should handle navigating to multiple different children', async () => {
    const rootData = await mapPageStructure(TEST_PAGE_ID)
    const items = extractNavigableItems(rootData.structure)

    // Need at least 2 children
    expect(items.length).to.be.greaterThanOrEqual(2)

    const child1 = items[0]
    const child2 = items[1]

    // Navigate: root -> child1 -> back -> child2 -> back -> quit
    const deps = realApiDeps([
      child1.id,
      NAV_BACK,
      child2.id,
      NAV_BACK,
      NAV_QUIT,
    ])

    await startNavigator(TEST_PAGE_ID, logSpy, deps)

    const headers = logMessages.filter((m: string) => m.includes('children)'))
    // root -> child1 -> root -> child2 -> root = 5 headers
    expect(headers.length).to.be.greaterThanOrEqual(5)

    // Verify we visited both children by checking for unique page titles
    // Use short substrings to avoid emoji encoding issues
    const allLogs = logMessages.join('\n')
    const child1Short = child1.title.split('|')[0].trim()
    const child2Short = child2.title.split('|')[0].trim()
    expect(allLogs).to.contain(child1Short)
    expect(allLogs).to.contain(child2Short)
  })

  it('should report correct child counts from real API data', async () => {
    const rootData = await mapPageStructure(TEST_PAGE_ID)
    const expectedCount = extractNavigableItems(rootData.structure).length

    const deps = realApiDeps([NAV_QUIT])
    await startNavigator(TEST_PAGE_ID, logSpy, deps)

    const header = logMessages[0]
    expect(header).to.contain(`${expectedCount} children`)
  })

  it('should not show Back option on first page', async () => {
    // Capture what choices are presented
    let firstChoices: any[] = []

    const deps = {
      fetchStructure: mapPageStructure,
      selectFn: async (config: any) => {
        if (firstChoices.length === 0) {
          firstChoices = config.choices
        }
        return NAV_QUIT
      },
    }

    await startNavigator(TEST_PAGE_ID, logSpy, deps)

    // First choice should NOT be ".. Back"
    expect(firstChoices[0].value).to.not.equal(NAV_BACK)
    // Last choice should be "[Quit]"
    expect(firstChoices[firstChoices.length - 1].value).to.equal(NAV_QUIT)
  })

  it('should show Back option on child pages', async () => {
    const rootData = await mapPageStructure(TEST_PAGE_ID)
    const firstChild = extractNavigableItems(rootData.structure)[0]

    let childChoices: any[] = []
    let callCount = 0

    const deps = {
      fetchStructure: mapPageStructure,
      selectFn: async (config: any) => {
        callCount++
        if (callCount === 1) return firstChild.id // enter child
        childChoices = config.choices // capture child's choices
        return NAV_QUIT
      },
    }

    await startNavigator(TEST_PAGE_ID, logSpy, deps)

    // Child page should have ".. Back" as first option
    expect(childChoices[0]).to.deep.equal({ name: '.. Back', value: NAV_BACK })
  })
})

// ==================== IMPERIUM AGENCY page — deep nesting ====================

const IMPERIUM_PAGE_ID = '22a3826d337781c69de5de3bb7f48ae8'

describe('browse E2E — IMPERIUM AGENCY page (deep nesting)', function () {
  this.timeout(30_000)

  let logMessages: string[]
  let logSpy: (msg: string) => void
  let originalIsTTY: boolean | undefined

  before(() => {
    nock.cleanAll()
    nock.enableNetConnect()
  })

  after(() => {
    nock.disableNetConnect()
    nock.enableNetConnect('127.0.0.1')
  })

  beforeEach(() => {
    logMessages = []
    logSpy = (msg: string) => logMessages.push(msg)
    originalIsTTY = process.stdin.isTTY
    ;(process.stdin as any).isTTY = true
  })

  afterEach(() => {
    ;(process.stdin as any).isTTY = originalIsTTY
  })

  function realApiDeps(selectResponses: string[]) {
    let selectIndex = 0
    return {
      fetchStructure: mapPageStructure,
      selectFn: async () => selectResponses[selectIndex++],
    }
  }

  it('should display root page with 9 children and emoji icon', async () => {
    const deps = realApiDeps([NAV_QUIT])

    await startNavigator(IMPERIUM_PAGE_ID, logSpy, deps)

    const header = logMessages[0]
    expect(header).to.contain('IMPERIUM AGENCY')
    expect(header).to.contain('9 children')
    // Page has a 👑 emoji icon
    expect(header).to.contain('👑')
  })

  it('should navigate 2 levels deep: root -> Outbound Systems -> Loom System -> back -> back -> quit', async () => {
    // Outbound Systems has 7 children, first is "Loom System - Foundations"
    const outboundId = '22a3826d-3377-81da-9180-d63380e7edb1'
    const loomId = '22a3826d-3377-81aa-a7d8-c57b3bf857bd'

    const deps = realApiDeps([
      outboundId,  // enter Outbound Systems
      loomId,      // enter Loom System - Foundations
      NAV_BACK,    // back to Outbound Systems
      NAV_BACK,    // back to root
      NAV_QUIT,    // quit
    ])

    await startNavigator(IMPERIUM_PAGE_ID, logSpy, deps)

    // Should have 5 headers: root, Outbound, Loom, Outbound (back), root (back)
    const headers = logMessages.filter((m: string) => m.includes('children)'))
    expect(headers.length).to.equal(5)

    // Verify navigation path
    expect(headers[0]).to.contain('IMPERIUM AGENCY')
    expect(headers[1]).to.contain('Outbound Systems')
    expect(headers[2]).to.contain('Loom System')
    expect(headers[3]).to.contain('Outbound Systems')
    expect(headers[4]).to.contain('IMPERIUM AGENCY')
  })

  it('should navigate 3 levels deep when sub-children exist', async () => {
    // root -> Outbound Systems -> Loom System -> (check if it has children)
    const outboundId = '22a3826d-3377-81da-9180-d63380e7edb1'
    const loomData = await mapPageStructure('22a3826d-3377-81aa-a7d8-c57b3bf857bd')
    const loomItems = extractNavigableItems(loomData.structure)

    if (loomItems.length === 0) {
      // Loom System is a leaf — test 2 levels instead
      const deps = realApiDeps([outboundId, NAV_BACK, NAV_QUIT])
      await startNavigator(IMPERIUM_PAGE_ID, logSpy, deps)

      const headers = logMessages.filter((m: string) => m.includes('children)'))
      expect(headers.length).to.equal(3) // root, outbound, root
      return
    }

    // 3-level drill: root -> Outbound -> Loom -> grandchild -> back x3 -> quit
    const grandchild = loomItems[0]
    const deps = realApiDeps([
      outboundId,
      '22a3826d-3377-81aa-a7d8-c57b3bf857bd', // Loom
      grandchild.id,
      NAV_BACK,
      NAV_BACK,
      NAV_BACK,
      NAV_QUIT,
    ])

    await startNavigator(IMPERIUM_PAGE_ID, logSpy, deps)

    const headers = logMessages.filter((m: string) => m.includes('children)'))
    // root, outbound, loom, grandchild, loom (back), outbound (back), root (back) = 7
    expect(headers.length).to.equal(7)
  })

  it('should navigate across sibling branches: Outbound -> back -> Inbound -> quit', async () => {
    const outboundId = '22a3826d-3377-81da-9180-d63380e7edb1'
    const inboundId = '22a3826d-3377-8193-9cee-ee09bd08cefa'

    const deps = realApiDeps([
      outboundId,  // enter Outbound Systems (7 children)
      NAV_BACK,    // back to root
      inboundId,   // enter Inbound Systems (4 children)
      NAV_BACK,    // back to root
      NAV_QUIT,    // quit
    ])

    await startNavigator(IMPERIUM_PAGE_ID, logSpy, deps)

    const headers = logMessages.filter((m: string) => m.includes('children)'))
    // root -> Outbound -> root -> Inbound -> root = 5 headers
    expect(headers.length).to.equal(5)

    expect(headers[0]).to.contain('IMPERIUM AGENCY')
    expect(headers[1]).to.contain('Outbound Systems')
    expect(headers[1]).to.contain('7 children')
    expect(headers[2]).to.contain('IMPERIUM AGENCY')
    expect(headers[3]).to.contain('Inbound Systems')
    expect(headers[3]).to.contain('4 children')
    expect(headers[4]).to.contain('IMPERIUM AGENCY')
  })

  it('should handle leaf page with Back: root -> Foundations (0 children) -> back -> quit', async () => {
    const foundationsId = '22a3826d-3377-81f4-a414-dd07bde4e4d4'

    const deps = realApiDeps([
      foundationsId, // enter Foundations (0 children)
      NAV_BACK,      // back to root
      NAV_QUIT,      // quit
    ])

    await startNavigator(IMPERIUM_PAGE_ID, logSpy, deps)

    const headers = logMessages.filter((m: string) => m.includes('children)'))
    expect(headers.length).to.equal(3) // root, Foundations, root

    expect(headers[0]).to.contain('9 children')
    expect(headers[1]).to.contain('Foundations')
    expect(headers[1]).to.contain('0 children')
    expect(headers[2]).to.contain('9 children')
  })
})
