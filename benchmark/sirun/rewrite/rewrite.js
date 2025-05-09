'use strict'

const fs = require('fs')
const path = require('path')

const { Rewriter } = require('../../../main')

const csiMethods = [
  { src: 'concat' },
  { src: 'join' },
  { src: 'parse' },
  { src: 'plusOperator', operator: true }
]
const filename = path.join(__dirname, 'node_modules', 'test', 'file.js')
const code = fs.readFileSync(filename, 'utf8').toString()
const orchestrion = fs.readFileSync(path.join(__dirname, 'orchestrion.yml'), 'utf8').toString()

const rewriter = new Rewriter({ csiMethods, orchestrion })

let count = 0

for (let i = 0; i < 1e2; i++) {
  const rewritten = rewriter.rewrite(code, filename, ['iast', 'orchestrion'])
  count += rewritten.content ? 1 : 0
}

if (count === 0) {
  // eslint-disable-next-line no-console
  console.log('This cannot happen, but count is used to avoid optimizations')
}
