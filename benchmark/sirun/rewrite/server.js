'use strict'

const fs = require('fs')
const path = require('path')

const { Rewriter } = require('../../../main')
const { port, reqs } = require('./common')

const csiMethods = [
  { src: 'concat' },
  { src: 'join' },
  { src: 'parse' },
  { src: 'plusOperator', operator: true },
]
const filename = path.join(__dirname, 'node_modules', 'test', 'file.js')
const contentToRewrite = fs.readFileSync(filename, 'utf8').toString()
const orchestrion = fs.readFileSync(path.join(__dirname, 'orchestrion.yml'), 'utf8').toString()

const rewriter = new Rewriter({ csiMethods, orchestrion })

let connectionsMade = 0

const server = require('http').createServer((req, res) => {
  const code = contentToRewrite
  rewriter.rewrite(code, filename, ['iast', 'orchestrion'])

  res.end('OK')

  if (++connectionsMade === reqs) {
    server.close()
  }
})

server.listen(port, () => {})

