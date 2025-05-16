#!/usr/bin/env node

'use strict'

const { exec, stdio } = require('./run-util')

const env = Object.assign({}, process.env)

exec('sirun', ['meta-temp.json'], { env, stdio })
