/**
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache-2.0 License.
 * This product includes software developed at Datadog (https://www.datadoghq.com/). Copyright 2022 Datadog, Inc.
 **/

'use strict'

const fs = require('fs')
const path = require('path')
const proxyquire = require('proxyquire')

const { getPrepareStackTrace } = require('../js/stack-trace')
const { getSourcePathAndLineFromSourceMaps } = require('../js/source-map')

class CallSiteMock {
  constructor (fileName, lineNumber, columnNumber) {
    this.fileName = fileName
    this.lineNumber = lineNumber
    this.columnNumber = columnNumber
  }

  getColumnNumber () {
    return this.columnNumber
  }

  getLineNumber () {
    return this.lineNumber
  }

  getFileName () {
    return this.fileName
  }

  isNative () {
    return false
  }

  toString () {
    return `at ${this.filename}:${this.lineNumber}:${this.columnNumber}`
  }

  toLocaleString () {
    return `[LOCALE] at ${this.filename}:${this.lineNumber}:${this.columnNumber}`
  }
}

describe('V8 prepareStackTrace', () => {
  const TEST_PATH = ['test', 'packages', 'dist', 'server', 'app.js'].join(path.sep)
  const TEST_LINE = 99
  const TEST_COLUMN = 15

  it('should call original prepareStackTrace', () => {
    const originalStackTrace = sinon.spy()
    const prepareStackTrace = getPrepareStackTrace(originalStackTrace)
    const callsites = []
    callsites.push(new CallSiteMock(TEST_PATH, TEST_LINE, TEST_COLUMN))
    prepareStackTrace(null, callsites)
    // eslint-disable-next-line no-unused-expressions
    expect(originalStackTrace).to.be.calledOnce
  })

  it('should not wrap an already wrapped prepareStackTrace', () => {
    const originalStackTrace = sinon.spy()
    const prepareStackTrace = getPrepareStackTrace(originalStackTrace)
    const anotherPrepareStackTrace = getPrepareStackTrace(prepareStackTrace)
    expect(prepareStackTrace).to.be.equals(anotherPrepareStackTrace)
  })
})

const sourceMapResourcesPath = path.join(__dirname, 'resources', 'stacktrace-sourcemap')
const nodeSourceMap = require('../js/source-map/node_source_map')
const { expect } = require('chai')
const readFileSync = function (filename) {
  if (filename.indexOf('.map') > 0 || filename.indexOf('.js') > 0) {
    return fs.readFileSync(path.join(sourceMapResourcesPath, path.basename(filename)))
  }
}

describe('getFilenameFromSourceMap', () => {
  it('should return original object if file does not exist', () => {
    const originalPathAndLine = {
      path: path.join(sourceMapResourcesPath, 'does-not-exist.js'),
      line: 12
    }
    const pathAndLine = getSourcePathAndLineFromSourceMaps(originalPathAndLine.path, originalPathAndLine.line, 0)
    expect(pathAndLine.path).to.be.equals(originalPathAndLine.path)
    expect(pathAndLine.line).to.be.equals(originalPathAndLine.line)
  })

  it('should translate with map file', () => {
    const fileName = 'test-file.js'
    const originalPathAndLine = {
      path: path.join(sourceMapResourcesPath, fileName),
      line: 5
    }

    const { getSourcePathAndLineFromSourceMaps, cacheRewrittenSourceMap } = proxyquire('../js/source-map', {
      './node_source_map': nodeSourceMap,
      fs: { readFileSync }
    })

    const fileContent = fs.readFileSync(path.join(sourceMapResourcesPath, fileName)).toString()
    cacheRewrittenSourceMap(originalPathAndLine.path, fileContent)

    const pathAndLine = getSourcePathAndLineFromSourceMaps(originalPathAndLine.path, originalPathAndLine.line, 12)
    expect(pathAndLine.path).to.be.equals(path.join(sourceMapResourcesPath, 'test-file.ts'))
    expect(pathAndLine.line).to.be.equals(2)
  })

  it('should translate with inlined map', () => {
    const fileName = 'test-inline.js'
    const originalPathAndLine = {
      path: path.join(sourceMapResourcesPath, fileName),
      line: 5
    }
    const { getSourcePathAndLineFromSourceMaps, cacheRewrittenSourceMap } = proxyquire('../js/source-map', {
      './node_source_map': nodeSourceMap,
      fs: { readFileSync }
    })

    const fileContent = fs.readFileSync(path.join(sourceMapResourcesPath, fileName)).toString()
    cacheRewrittenSourceMap(originalPathAndLine.path, fileContent)

    const pathAndLine = getSourcePathAndLineFromSourceMaps(originalPathAndLine.path, originalPathAndLine.line, 10)
    expect(pathAndLine.path).to.be.equals(path.join(sourceMapResourcesPath, 'test-inline.ts'))
    expect(pathAndLine.line).to.be.equals(2)
  })

  it('should translate minified file with correct column', () => {
    const fileName = 'test-min.min.js'
    const originalPathAndLine = {
      path: path.join(sourceMapResourcesPath, fileName),
      line: 1
    }
    const { getSourcePathAndLineFromSourceMaps, cacheRewrittenSourceMap } = proxyquire('../js/source-map', {
      './node_source_map': nodeSourceMap,
      fs: { readFileSync }
    })

    const fileContent = fs.readFileSync(path.join(sourceMapResourcesPath, fileName)).toString()
    cacheRewrittenSourceMap(originalPathAndLine.path, fileContent)

    const pathAndLine = getSourcePathAndLineFromSourceMaps(originalPathAndLine.path, originalPathAndLine.line, 23)
    expect(pathAndLine.path).to.be.equals(path.join(sourceMapResourcesPath, 'test-min.js'))
    expect(pathAndLine.line).to.be.equals(2)
  })
})

describe('getOriginalPathAndLineFromSourceMapFromSourceMap', () => {
  let sourceMapsMap
  let setLRU
  let getLRU
  let getOriginalPathAndLineFromSourceMap

  beforeEach(() => {
    sourceMapsMap = new Map()
    setLRU = sinon.spy()
    getLRU = sinon.spy()
    class LRU {
      set (key, value) {
        setLRU(key, value)
        return sourceMapsMap.set(key, value)
      }

      get (key) {
        getLRU(key)
        return sourceMapsMap.get(key)
      }
    }

    const sourceMap = proxyquire('../js/source-map', {
      'lru-cache': LRU,
      './node_source_map': nodeSourceMap,
      fs: {
        readFileSync: (filename) => {
          switch (filename) {
            case 'no-sourcemap':
              return ''
            case 'error':
              throw new Error('errr')
            default:
              return readFileSync(filename)
          }
        }
      }
    })

    getOriginalPathAndLineFromSourceMap = sourceMap.getOriginalPathAndLineFromSourceMap
  })

  const fileName = 'test-inline.js'
  const originalPathAndLine = {
    path: path.join(sourceMapResourcesPath, fileName),
    line: 5
  }

  it('should add SourceMap to cache', () => {
    const pathAndLine = getOriginalPathAndLineFromSourceMap(originalPathAndLine.path, originalPathAndLine.line, 12)

    expect(setLRU).to.be.calledOnceWith(originalPathAndLine.path)
    expect(pathAndLine.path).to.be.equals(path.join(sourceMapResourcesPath, 'test-inline.ts'))
    expect(pathAndLine.line).to.be.equals(2)
  })

  it('should reuse previously cached SourceMap', () => {
    const pathAndLine = getOriginalPathAndLineFromSourceMap(originalPathAndLine.path, originalPathAndLine.line, 12)

    getOriginalPathAndLineFromSourceMap(originalPathAndLine.path, originalPathAndLine.line, 12)
    getOriginalPathAndLineFromSourceMap(originalPathAndLine.path, originalPathAndLine.line, 12)

    expect(setLRU).to.be.calledOnceWith(originalPathAndLine.path)
    expect(pathAndLine.path).to.be.equals(path.join(sourceMapResourcesPath, 'test-inline.ts'))
    expect(pathAndLine.line).to.be.equals(2)
  })

  it('should not try to load again a previously failed SourceMap', () => {
    getOriginalPathAndLineFromSourceMap('no-sourcemap', originalPathAndLine.line, 12)
    getOriginalPathAndLineFromSourceMap('no-sourcemap', originalPathAndLine.line, 12)
    getOriginalPathAndLineFromSourceMap('no-sourcemap', originalPathAndLine.line, 12)

    expect(setLRU).to.be.calledOnceWith('no-sourcemap', null)
  })

  it('should return the original path and line if there is an Error', () => {
    const pathAndLine = getOriginalPathAndLineFromSourceMap('error', 42, 12)
    expect(pathAndLine.path).to.be.equals('error')
    expect(pathAndLine.line).to.be.equals(42)
  })

  it('should resolve sourceMappingURL file correctly', () => {
    const fileName = 'test-min.min.js'
    const originalPathAndLine = {
      path: path.join(sourceMapResourcesPath, fileName),
      line: 1
    }

    const pathAndLine = getOriginalPathAndLineFromSourceMap(originalPathAndLine.path, originalPathAndLine.line, 23)

    expect(setLRU).to.be.calledOnceWith(originalPathAndLine.path)
    expect(pathAndLine.path).to.be.equals(path.join(sourceMapResourcesPath, 'test-min.js'))
    expect(pathAndLine.line).to.be.equals(2)
  })
})

describe('WrappedCallSite', () => {
  const TEST_PATH = ['test', 'packages', 'dist', 'server', 'app.js'].join(path.sep)
  const TEST_LINE = 99
  const TEST_COLUMN = 15

  it('toString() methods are maintained', () => {
    const originalStackTrace = sinon.spy()
    const prepareStackTrace = getPrepareStackTrace(originalStackTrace)
    const callsites = []
    const callSite = new CallSiteMock(TEST_PATH, TEST_LINE, TEST_COLUMN)
    callsites.push(callSite)
    prepareStackTrace(null, callsites)

    expect(originalStackTrace.firstCall.args[1][0].toString()).to.be.equals(callSite.toString())

    expect(originalStackTrace.firstCall.args[1][0].toLocaleString()).to.be.equals(callSite.toLocaleString())
  })
})
