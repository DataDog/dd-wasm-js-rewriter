/**
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache-2.0 License.
 * This product includes software developed at Datadog (https://www.datadoghq.com/). Copyright 2022 Datadog, Inc.
 **/

'use strict'

const { SourceMap } = require('../js/source-map/node_source_map')

describe('SourceMap', () => {
  it('should find entries of a sectioned map whose sections are out of order', () => {
    const sourceMap = new SourceMap({
      version: 3,
      sections: [
        { offset: { line: 2, column: 0 }, map: { version: 3, sources: ['b.ts'], names: ['later'], mappings: 'AAAAA' } },
        { offset: { line: 0, column: 0 }, map: { version: 3, sources: ['a.ts'], mappings: 'AAAA,KAAK' } }
      ]
    })

    expect(sourceMap.findEntry(0, 7)).to.eql({
      generatedLine: 0,
      generatedColumn: 5,
      originalSource: 'a.ts',
      originalLine: 0,
      originalColumn: 5,
      name: undefined
    })
    expect(sourceMap.findEntry(2, 4)).to.eql({
      generatedLine: 2,
      generatedColumn: 0,
      originalSource: 'b.ts',
      originalLine: 0,
      originalColumn: 0,
      name: 'later'
    })
  })

  it('should find entries of a map whose segments are not ordered by column', () => {
    const sourceMap = new SourceMap({ version: 3, sources: ['a.ts'], names: ['n'], mappings: 'KAAC,DAAAA' })

    expect(sourceMap.findEntry(0, 2)).to.eql({})
    expect(sourceMap.findEntry(0, 4)).to.eql({
      generatedLine: 0,
      generatedColumn: 4,
      originalSource: 'a.ts',
      originalLine: 0,
      originalColumn: 1,
      name: 'n'
    })
    expect(sourceMap.findEntry(0, 6)).to.eql({
      generatedLine: 0,
      generatedColumn: 5,
      originalSource: 'a.ts',
      originalLine: 0,
      originalColumn: 1,
      name: undefined
    })
  })

  it('should return no original position for a segment without one', () => {
    const sourceMap = new SourceMap({ version: 3, sources: ['a.ts'], mappings: 'AAAA,E,CAAC' })

    expect(sourceMap.findEntry(0, 2)).to.eql({
      generatedLine: 0,
      generatedColumn: 2,
      originalSource: undefined,
      originalLine: undefined,
      originalColumn: undefined,
      name: undefined
    })
  })

  it('should list the sources of the map', () => {
    const sourceMap = new SourceMap({
      version: 3,
      sources: ['a.ts', 'b.ts'],
      sourcesContent: ['const a = 1', 'const b = 2'],
      mappings: 'AAAA,ECAA'
    })

    expect(Object.keys(sourceMap._sources)).to.eql(['a.ts', 'b.ts'])
  })
})
