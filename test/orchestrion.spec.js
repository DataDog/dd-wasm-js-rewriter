/**
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache-2.0 License.
 * This product includes software developed at Datadog (https://www.datadoghq.com/). Copyright 2022 Datadog, Inc.
 **/
'use strict'

const { expect } = require('chai')
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
    file_path: index.mjs
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
    // This setup may take some time
    this.timeout(30000)

    // Set up logger
    logger = {
      error: sinon.spy(),
      debug: sinon.spy()
    }

    // Create a temporary directory
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orchestrion-test-'))

    // Initialize a new Node.js project
    execSync('npm init -y', { cwd: tempDir })

    // Install undici as a dependency
    execSync('npm install undici --save', { cwd: tempDir })

    // Find undici directory
    undiciDir = path.join(tempDir, 'node_modules', 'undici')

    // Initialize rewriter with orchestrion config
    rewriter = new Rewriter({
      localVarPrefix: 'test',
      orchestrion: ORCHESTRION_CONFIG,
      logLevel: 'DEBUG',
      telemetryVerbosity: 'DEBUG',
      literals: false, // TODO this breaks when enabled
      logger
    })
  })

  afterEach(function () {
    // This cleanup may take some time
    this.timeout(10000)

    // Clean up sinon
    sinon.restore()

    // Delete the temporary directory
    fs.rmdirSync(tempDir, { recursive: true })
  })

  it.only('should rewrite undici index.js file', function () {
    // This test may take some time
    this.timeout(10000)

    // Get the path to undici's index.js
    const indexPath = path.join(undiciDir, 'index.js')

    // Read the file content
    const code = fs.readFileSync(indexPath, 'utf8')

    // Rewrite the file
    const result = rewriter.rewrite(code, 'index.js', 'undici', '0.0.2')

    const mod = new Module(indexPath, module.parent)
    mod.paths = Module._nodeModulePaths(path.dirname(indexPath))
    mod.filename = indexPath
    mod._compile(result.content, indexPath)
    // TODO check that the module is loaded correctly

    // Verify rewriting was successful
    expect(result).to.have.property('content')
    expect(result.content).to.be.a('string')
    expect(result.content.length).to.be.greaterThan(0)
  })
})
