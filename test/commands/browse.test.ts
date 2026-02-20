import { expect } from 'chai'
import Browse from '../../src/commands/browse'

describe('browse command', () => {
  it('should have correct description', () => {
    expect(Browse.description.toLowerCase()).to.contain('interactively navigate')
  })

  it('should have nav alias', () => {
    expect(Browse.aliases).to.include('nav')
  })

  it('should require page_id argument', () => {
    expect(Browse.args.page_id).to.exist
    expect(Browse.args.page_id.required).to.be.true
  })

  it('should have examples', () => {
    expect(Browse.examples).to.be.an('array').with.length.greaterThan(0)
  })
})
