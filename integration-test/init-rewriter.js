'use strict'

const rewriterPackage = process.env.NPM_REWRITER === 'true' ? '@datadog/wasm-js-rewriter' : '../'
const { addEditedFile } = require('./edited-files-cache')
const { Rewriter, getPrepareStackTrace } = require(rewriterPackage)
const path = require('path')
const Module = require('module')

let rewriter
let originalPrepareStackTrace = Error.prepareStackTrace

const CSI_METHODS = [
  { src: 'plusOperator', operator: true },
  { src: 'substring' },
  { src: 'trim' },
  { src: 'trimStart' },
  { src: 'trimEnd' },
  { src: 'trimLeft' },
  { src: 'trimRight' },
  { src: 'toLowerCase' },
  { src: 'toLocaleLowerCase' },
  { src: 'toUpperCase' },
  { src: 'toLocaleUpperCase' },
  { src: 'replace' },
  { src: 'replaceAll' },
  { src: 'slice' },
  { src: 'concat' }
]

function isFlagPresent (flag) {
  return process.env.NODE_OPTIONS?.includes(flag) ||
    process.execArgv?.some(arg => arg.includes(flag))
}

function initRewriter () {
  rewriter = new Rewriter({
    csiMethods: CSI_METHODS,
    telemetryVerbosity: 'Debug',
    chainSourceMap: isFlagPresent('--enable-source-maps')
  })

  if (rewriter) {
    Object.defineProperty(global.Error, 'prepareStackTrace', getPrepareStackTraceAccessor())
    Module.prototype._compile = getCompileMethodFn(Module.prototype._compile)
  }
}

function getPrepareStackTraceAccessor () {
  let actual = getPrepareStackTrace(originalPrepareStackTrace)
  return {
    get () {
      return actual
    },
    set (value) {
      actual = getPrepareStackTrace(value)
      originalPrepareStackTrace = value
    }
  }
}

function getCompileMethodFn (compileMethod) {
  return function (content, filename) {
    try {
      if (filename.indexOf(path.join('integration-test', 'requires')) > -1) {
        const response = rewriter.rewrite(content, filename, ['iast'])
        content = response.content
        addEditedFile(filename)
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e)
    }
    return compileMethod.apply(this, [content, filename])
  }
}

initRewriter()
