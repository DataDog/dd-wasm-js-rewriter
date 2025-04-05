/**
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache-2.0 License.
 * This product includes software developed at Datadog (https://www.datadoghq.com/). Copyright 2022 Datadog, Inc.
 **/
/* eslint-disable no-unused-expressions */
'use strict'

const { Rewriter } = require('./util')
const fs = require('fs')
const path = require('path')
const os = require('os')
const { execSync } = require('child_process')
const Module = require('module')

const ORCHESTRION_CONFIG = `
version: 1
instrumentations:
  - module_name: undici
    version_range: ">=0.0.1"
    file_path: index.js
    function_query:
      name: fetch
      type: expr
      kind: async
    operator: tracePromise
    channel_name: fetch_expr
`

describe('orchestrion', () => {
  let logger
  let tempDir
  let undiciDir
  let rewriter

  beforeEach(function () {
    sinon.restore()
    // Set up logger
    logger = {
      error: sinon.spy(),
      debug: sinon.spy()
    }

    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orchestrion-test-'))
    execSync('npm init -y', { cwd: tempDir })
    execSync('npm install undici --save', { cwd: tempDir })
    undiciDir = path.join(tempDir, 'node_modules', 'undici')

    // Initialize rewriter with orchestrion config
    rewriter = new Rewriter({
      localVarPrefix: 'test',
      orchestrion: ORCHESTRION_CONFIG,
      logLevel: 'DEBUG',
      telemetryVerbosity: 'DEBUG',
      literals: true, // TODO this breaks when enabled
      logger
    })
  })

  afterEach(function () {
    sinon.restore()
    fs.rmdirSync(tempDir, { recursive: true })
  })

  it('should rewrite undici index.js file', async function () {
    const indexPath = path.join(undiciDir, 'index.js')
    const code = fs.readFileSync(indexPath, 'utf8')
    const result = rewriter.rewrite(code, indexPath, ['orchestrion'])

    // Verify rewriting was successful
    expect(result).to.have.property('content')
    expect(result.content).to.be.a('string')
    expect(result.content.length).to.be.greaterThan(0)

    // Run the modified code and check that it's instrumented
    const mod = new Module(indexPath, module.parent)
    mod.paths = Module._nodeModulePaths(path.dirname(indexPath))
    mod.filename = indexPath
    mod._compile(result.content, indexPath)

    const dc = require('diagnostics_channel')
    const tc = dc.tracingChannel('orchestrion:undici:fetch_expr')
    let eventMessage
    tc.subscribe({
      start (message) {
        eventMessage = message
        message.start = true
      },
      end (message) {
        expect(message).to.equal(eventMessage)
        message.end = true
      },
      asyncStart (message) {
        expect(message).to.equal(eventMessage)
        message.asyncStart = true
      },
      asyncEnd (message) {
        expect(message).to.equal(eventMessage)
        message.asyncEnd = true
      }
    })
    await mod.exports.fetch('https://www.example.com')
    expect(eventMessage.start).to.be.true
    expect(eventMessage.end).to.be.true
    expect(eventMessage.asyncStart).to.be.true
    expect(eventMessage.asyncEnd).to.be.true
    expect(eventMessage.self).to.equal(mod.exports)
    expect(Array.from(eventMessage.arguments)).to.deep.equal(['https://www.example.com'])
    expect(eventMessage.result.constructor.name).to.equal('Response')
  })
})
