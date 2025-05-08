#!/usr/bin/env node

'use strict'

const { exec, stdio } = require('./run-util')

exec('sirun', ['meta-temp.json'], { env: process.env, stdio })
