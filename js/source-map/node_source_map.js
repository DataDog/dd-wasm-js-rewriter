// This file is a modified version of:
// https://github.com/nodejs/node/blob/5e57d24d325f0aea74394f78ebdc06857cca77b1/lib/internal/source_map/source_map.js
// from the Node.js codebase

// This file is a modified version of:
// https://cs.chromium.org/chromium/src/v8/tools/SourceMap.js?rcl=dd10454c1d
// from the V8 codebase. Logic specific to WebInspector is removed and linting
// is made to match the Node.js style guide.

// Copyright 2013 the V8 project authors. All rights reserved.
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are
// met:
//
//     * Redistributions of source code must retain the above copyright
//       notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above
//       copyright notice, this list of conditions and the following
//       disclaimer in the documentation and/or other materials provided
//       with the distribution.
//     * Neither the name of Google Inc. nor the names of its
//       contributors may be used to endorse or promote products derived
//       from this software without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
// A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
// OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
// SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
// LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
// DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
// THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
// OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

// This is a copy from blink dev tools, see:
// http://src.chromium.org/viewvc/blink/trunk/Source/devtools/front_end/SourceMap.js
// revision: 153407

/*
 * Copyright (C) 2012 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

'use strict'

const {
  ArrayPrototypePush,
  ArrayPrototypeSlice,
  ArrayPrototypeSort,
  ArrayIsArray,
  ObjectPrototypeHasOwnProperty,
  StringPrototypeCharAt
} = require('./primordials')

const validateObject = function () {}
let base64Map

// Each mapping takes MAPPING_FIELDS consecutive Int32Array elements: [generatedLine, generatedColumn,
// sourceIndex, originalLine, originalColumn, nameIndex]. An Array per mapping takes several times the
// memory, which adds up to hundreds of MB when many large files are rewritten.
const MAPPING_FIELDS = 6
// sourceIndex of a mapping that has no original position
const NO_SOURCE = -1
// sourceIndex of a mapping whose source is not in the source map's sources
const UNKNOWN_SOURCE = -2
// nameIndex of a mapping without a name
const NO_NAME = -1

const VLQ_BASE_SHIFT = 5
const VLQ_BASE_MASK = (1 << 5) - 1
const VLQ_CONTINUATION_MASK = 1 << 5

class StringCharIterator {
  /**
   * @constructor
   * @param {string} string
   */
  constructor (string) {
    this._string = string
    this._position = 0
  }

  /**
   * @return {string}
   */
  next () {
    return StringPrototypeCharAt(this._string, this._position++)
  }

  /**
   * @return {string}
   */
  peek () {
    return StringPrototypeCharAt(this._string, this._position)
  }

  /**
   * @return {boolean}
   */
  hasNext () {
    return this._position < this._string.length
  }
}

/**
 * Implements Source Map V3 model.
 * See https://github.com/google/closure-compiler/wiki/Source-Maps
 * for format description.
 */
class SourceMap {
  /**
   * @constructor
   * @param {SourceMapV3} payload
   */
  constructor (payload) {
    this._sources = {}
    this._sourceURLs = []
    this._names = []
    if (!base64Map) {
      const base64Digits = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
      base64Map = {}
      for (let i = 0; i < base64Digits.length; ++i) {
        base64Map[base64Digits[i]] = i
      }
    }
    // The payload isn't kept: it holds the encoded mappings and possibly the sources content
    this._mappings = this._parseMappingPayload(cloneSourceMapV3(payload))
  }

  _parseMappingPayload (payload) {
    const mappings = []
    if (payload.sections) {
      this._parseSections(payload.sections, mappings)
    } else {
      this._parseMap(payload, 0, 0, mappings)
    }
    return toSortedMappings(mappings)
  }

  /**
   * @param {Array.<SourceMapV3.Section>} sections
   * @param {Array.<number>} mappings
   */
  _parseSections (sections, mappings) {
    for (let i = 0; i < sections.length; ++i) {
      const section = sections[i]
      this._parseMap(section.map, section.offset.line, section.offset.column, mappings)
    }
  }

  /**
   * @param {number} lineNumber in compiled resource
   * @param {number} columnNumber in compiled resource
   * @return {?Array}
   */
  findEntry (lineNumber, columnNumber) {
    const mappings = this._mappings
    let first = 0
    let count = mappings.length / MAPPING_FIELDS
    while (count > 1) {
      const step = count >> 1
      const middle = first + step
      const offset = middle * MAPPING_FIELDS
      if (lineNumber < mappings[offset] || (lineNumber === mappings[offset] && columnNumber < mappings[offset + 1])) {
        count = step
      } else {
        first = middle
        count -= step
      }
    }
    const offset = first * MAPPING_FIELDS
    if (offset >= mappings.length) {
      return {}
    }
    const generatedLine = mappings[offset]
    const generatedColumn = mappings[offset + 1]
    if (!first && (lineNumber < generatedLine || (lineNumber === generatedLine && columnNumber < generatedColumn))) {
      return {}
    }
    const sourceIndex = mappings[offset + 2]
    if (sourceIndex === NO_SOURCE) {
      return {
        generatedLine,
        generatedColumn,
        originalSource: undefined,
        originalLine: undefined,
        originalColumn: undefined,
        name: undefined
      }
    }
    const nameIndex = mappings[offset + 5]
    return {
      generatedLine,
      generatedColumn,
      originalSource: sourceIndex === UNKNOWN_SOURCE ? undefined : this._sourceURLs[sourceIndex],
      originalLine: mappings[offset + 3],
      originalColumn: mappings[offset + 4],
      name: nameIndex === NO_NAME ? undefined : this._names[nameIndex]
    }
  }

  /**
   * @override
   */
  _parseMap (map, lineNumber, columnNumber, mappings) {
    let sourceIndex = 0
    let sourceLineNumber = 0
    let sourceColumnNumber = 0
    let nameIndex = 0

    const firstSourceURLIndex = this._sourceURLs.length
    const sourceCount = map.sources.length
    for (let i = 0; i < sourceCount; ++i) {
      const url = map.sources[i]
      ArrayPrototypePush(this._sourceURLs, url)
      this._sources[url] = true
    }
    const getSourceURLIndex = (index) =>
      index >= 0 && index < sourceCount ? firstSourceURLIndex + index : UNKNOWN_SOURCE

    const firstNameIndex = this._names.length
    const nameCount = map.names ? map.names.length : 0
    for (let i = 0; i < nameCount; ++i) {
      ArrayPrototypePush(this._names, map.names[i])
    }

    const stringCharIterator = new StringCharIterator(map.mappings)
    let sourceURLIndex = getSourceURLIndex(sourceIndex)
    while (true) {
      if (stringCharIterator.peek() === ',') {
        stringCharIterator.next()
      } else {
        while (stringCharIterator.peek() === ';') {
          lineNumber += 1
          columnNumber = 0
          stringCharIterator.next()
        }
        if (!stringCharIterator.hasNext()) {
          break
        }
      }

      columnNumber += decodeVLQ(stringCharIterator)
      if (isSeparator(stringCharIterator.peek())) {
        ArrayPrototypePush(mappings, lineNumber, columnNumber, NO_SOURCE, 0, 0, NO_NAME)
        continue
      }

      const sourceIndexDelta = decodeVLQ(stringCharIterator)
      if (sourceIndexDelta) {
        sourceIndex += sourceIndexDelta
        sourceURLIndex = getSourceURLIndex(sourceIndex)
      }
      sourceLineNumber += decodeVLQ(stringCharIterator)
      sourceColumnNumber += decodeVLQ(stringCharIterator)

      let mappingNameIndex = NO_NAME
      if (!isSeparator(stringCharIterator.peek())) {
        nameIndex += decodeVLQ(stringCharIterator)
        if (nameIndex >= 0 && nameIndex < nameCount) {
          mappingNameIndex = firstNameIndex + nameIndex
        }
      }

      ArrayPrototypePush(
        mappings,
        lineNumber,
        columnNumber,
        sourceURLIndex,
        sourceLineNumber,
        sourceColumnNumber,
        mappingNameIndex
      )
    }
  }
}

/**
 * @param {Array.<number>} mappings MAPPING_FIELDS numbers per mapping
 * @param {number} index1 index of a mapping
 * @param {number} index2 index of another mapping
 * @return {number}
 */
function compareMappings (mappings, index1, index2) {
  const offset1 = index1 * MAPPING_FIELDS
  const offset2 = index2 * MAPPING_FIELDS
  if (mappings[offset1] !== mappings[offset2]) {
    return mappings[offset1] - mappings[offset2]
  }
  return mappings[offset1 + 1] - mappings[offset2 + 1]
}

/**
 * @param {Array.<number>} mappings MAPPING_FIELDS numbers per mapping
 * @return {Int32Array} the mappings sorted by generated position, keeping the order of equal positions
 */
function toSortedMappings (mappings) {
  const count = mappings.length / MAPPING_FIELDS
  let sorted = true
  for (let i = 1; i < count && sorted; i++) {
    sorted = compareMappings(mappings, i - 1, i) <= 0
  }
  if (sorted) {
    return Int32Array.from(mappings)
  }

  const order = []
  for (let i = 0; i < count; i++) {
    ArrayPrototypePush(order, i)
  }
  ArrayPrototypeSort(order, (index1, index2) => compareMappings(mappings, index1, index2) || index1 - index2)
  const result = new Int32Array(mappings.length)
  for (let i = 0; i < count; i++) {
    const offset = order[i] * MAPPING_FIELDS
    for (let field = 0; field < MAPPING_FIELDS; field++) {
      result[i * MAPPING_FIELDS + field] = mappings[offset + field]
    }
  }
  return result
}

/**
 * @param {string} char
 * @return {boolean}
 */
function isSeparator (char) {
  return char === ',' || char === ';'
}

/**
 * @param {SourceMap.StringCharIterator} stringCharIterator
 * @return {number}
 */
function decodeVLQ (stringCharIterator) {
  // Read unsigned value.
  let result = 0
  let shift = 0
  let digit
  do {
    digit = base64Map[stringCharIterator.next()]
    result += (digit & VLQ_BASE_MASK) << shift
    shift += VLQ_BASE_SHIFT
  } while (digit & VLQ_CONTINUATION_MASK)

  // Fix the sign.
  const negative = result & 1
  // Use unsigned right shift, so that the 32nd bit is properly shifted to the
  // 31st, and the 32nd becomes unset.
  result >>>= 1
  if (!negative) {
    return result
  }

  // We need to OR here to ensure the 32nd bit (the sign bit in an Int32) is
  // always set for negative numbers. If `result` were 1, (meaning `negate` is
  // true and all other bits were zeros), `result` would now be 0. But -0
  // doesn't flip the 32nd bit as intended. All other numbers will successfully
  // set the 32nd bit without issue, so doing this is a noop for them.
  return -result | (1 << 31)
}

/**
 * @param {SourceMapV3} payload
 * @return {SourceMapV3}
 */
function cloneSourceMapV3 (payload) {
  validateObject(payload, 'payload')
  payload = { ...payload }
  for (const key in payload) {
    if (ObjectPrototypeHasOwnProperty(payload, key) && ArrayIsArray(payload[key])) {
      payload[key] = ArrayPrototypeSlice(payload[key])
    }
  }
  return payload
}

module.exports = {
  SourceMap
}
