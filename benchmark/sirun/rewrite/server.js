'use strict'

const fs = require('fs')
const path = require('path')

const { Rewriter } = require('../../../main')
const { port, reqs } = require('./common')

const csiMethods = [
  { src: 'concat' },
  { src: 'join' },
  { src: 'parse' },
  { src: 'plusOperator', operator: true }
]
const filename = path.join(__dirname, 'node_modules', 'test', 'file.js')
const contentToRewrite = fs.readFileSync(filename, 'utf8').toString()
const orchestrion = fs.readFileSync(path.join(__dirname, 'orchestrion.yml'), 'utf8').toString()

const rewriter = new Rewriter({ csiMethods, orchestrion })

let connectionsMade = 0

const server = require('http').createServer((req, res) => {
  const code = contentToRewrite
  let count = 0
  for (let i = 0; i < 500; i++) {
    const rewritten = rewriter.rewrite(code, filename, ['iast', 'orchestrion'])
    count += rewritten.content ? 1 : 0
  }

  res.end('OK - ' + count)

  if (++connectionsMade === reqs) {
    server.close()
  }
})

server.listen(port, () => {})
