let imports = {}
imports['__wbindgen_placeholder__'] = module.exports
let wasm
const { log, setLogger } = require(String.raw`./snippets/wasm-js-rewriter-2c9c3973b2049298/tracer_logger.js`)
const { readFileSync } = require(`fs`)
const { dirname } = require(`path`)
const { TextEncoder, TextDecoder } = require(`util`)

const heap = new Array(128).fill(undefined)

heap.push(undefined, null, true, false)

function getObject(idx) {
  return heap[idx]
}

let WASM_VECTOR_LEN = 0

let cachedUint8Memory0 = null

function getUint8Memory0() {
  if (cachedUint8Memory0 === null || cachedUint8Memory0.byteLength === 0) {
    cachedUint8Memory0 = new Uint8Array(wasm.memory.buffer)
  }
  return cachedUint8Memory0
}

let cachedTextEncoder = new TextEncoder('utf-8')

const encodeString =
  typeof cachedTextEncoder.encodeInto === 'function'
    ? function (arg, view) {
        return cachedTextEncoder.encodeInto(arg, view)
      }
    : function (arg, view) {
        const buf = cachedTextEncoder.encode(arg)
        view.set(buf)
        return {
          read: arg.length,
          written: buf.length,
        }
      }

function passStringToWasm0(arg, malloc, realloc) {
  if (realloc === undefined) {
    const buf = cachedTextEncoder.encode(arg)
    const ptr = malloc(buf.length, 1) >>> 0
    getUint8Memory0()
      .subarray(ptr, ptr + buf.length)
      .set(buf)
    WASM_VECTOR_LEN = buf.length
    return ptr
  }

  let len = arg.length
  let ptr = malloc(len, 1) >>> 0

  const mem = getUint8Memory0()

  let offset = 0

  for (; offset < len; offset++) {
    const code = arg.charCodeAt(offset)
    if (code > 0x7f) break
    mem[ptr + offset] = code
  }

  if (offset !== len) {
    if (offset !== 0) {
      arg = arg.slice(offset)
    }
    ptr = realloc(ptr, len, (len = offset + arg.length * 3), 1) >>> 0
    const view = getUint8Memory0().subarray(ptr + offset, ptr + len)
    const ret = encodeString(arg, view)

    offset += ret.written
    ptr = realloc(ptr, len, offset, 1) >>> 0
  }

  WASM_VECTOR_LEN = offset
  return ptr
}

function isLikeNone(x) {
  return x === undefined || x === null
}

let cachedInt32Memory0 = null

function getInt32Memory0() {
  if (cachedInt32Memory0 === null || cachedInt32Memory0.byteLength === 0) {
    cachedInt32Memory0 = new Int32Array(wasm.memory.buffer)
  }
  return cachedInt32Memory0
}

let heap_next = heap.length

function dropObject(idx) {
  if (idx < 132) return
  heap[idx] = heap_next
  heap_next = idx
}

function takeObject(idx) {
  const ret = getObject(idx)
  dropObject(idx)
  return ret
}

function addHeapObject(obj) {
  if (heap_next === heap.length) heap.push(heap.length + 1)
  const idx = heap_next
  heap_next = heap[idx]

  heap[idx] = obj
  return idx
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true })

cachedTextDecoder.decode()

function getStringFromWasm0(ptr, len) {
  ptr = ptr >>> 0
  return cachedTextDecoder.decode(getUint8Memory0().subarray(ptr, ptr + len))
}

let cachedFloat64Memory0 = null

function getFloat64Memory0() {
  if (cachedFloat64Memory0 === null || cachedFloat64Memory0.byteLength === 0) {
    cachedFloat64Memory0 = new Float64Array(wasm.memory.buffer)
  }
  return cachedFloat64Memory0
}

function debugString(val) {
  // primitive types
  const type = typeof val
  if (type == 'number' || type == 'boolean' || val == null) {
    return `${val}`
  }
  if (type == 'string') {
    return `"${val}"`
  }
  if (type == 'symbol') {
    const description = val.description
    if (description == null) {
      return 'Symbol'
    } else {
      return `Symbol(${description})`
    }
  }
  if (type == 'function') {
    const name = val.name
    if (typeof name == 'string' && name.length > 0) {
      return `Function(${name})`
    } else {
      return 'Function'
    }
  }
  // objects
  if (Array.isArray(val)) {
    const length = val.length
    let debug = '['
    if (length > 0) {
      debug += debugString(val[0])
    }
    for (let i = 1; i < length; i++) {
      debug += ', ' + debugString(val[i])
    }
    debug += ']'
    return debug
  }
  // Test for built-in
  const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val))
  let className
  if (builtInMatches.length > 1) {
    className = builtInMatches[1]
  } else {
    // Failed to match the standard '[object ClassName]'
    return toString.call(val)
  }
  if (className == 'Object') {
    // we're a user defined class or Object
    // JSON.stringify avoids problems with cycles, and is generally much
    // easier than looping through ownProperties of `val`.
    try {
      return 'Object(' + JSON.stringify(val) + ')'
    } catch (_) {
      return 'Object'
    }
  }
  // errors
  if (val instanceof Error) {
    return `${val.name}: ${val.message}\n${val.stack}`
  }
  // TODO we could test for more things here, like `Set`s and `Map`s.
  return className
}

function handleError(f, args) {
  try {
    return f.apply(this, args)
  } catch (e) {
    wasm.__wbindgen_exn_store(addHeapObject(e))
  }
}

function getArrayU8FromWasm0(ptr, len) {
  ptr = ptr >>> 0
  return getUint8Memory0().subarray(ptr / 1, ptr / 1 + len)
}

let stack_pointer = 128

function addBorrowedObject(obj) {
  if (stack_pointer == 1) throw new Error('out of js stack')
  heap[--stack_pointer] = obj
  return stack_pointer
}

const RewriterFinalization =
  typeof FinalizationRegistry === 'undefined'
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry((ptr) => wasm.__wbg_rewriter_free(ptr >>> 0))
/**
 */
class Rewriter {
  __destroy_into_raw() {
    const ptr = this.__wbg_ptr
    this.__wbg_ptr = 0
    RewriterFinalization.unregister(this)
    return ptr
  }

  free() {
    const ptr = this.__destroy_into_raw()
    wasm.__wbg_rewriter_free(ptr)
  }
  /**
   * @param {any} config_js
   */
  constructor(config_js) {
    const ret = wasm.rewriter_new(addHeapObject(config_js))
    this.__wbg_ptr = ret >>> 0
    return this
  }
  /**
   * @param {string} code
   * @param {string} file
   * @returns {any}
   */
  rewrite(code, file) {
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16)
      const ptr0 = passStringToWasm0(code, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
      const len0 = WASM_VECTOR_LEN
      const ptr1 = passStringToWasm0(file, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
      const len1 = WASM_VECTOR_LEN
      wasm.rewriter_rewrite(retptr, this.__wbg_ptr, ptr0, len0, ptr1, len1)
      var r0 = getInt32Memory0()[retptr / 4 + 0]
      var r1 = getInt32Memory0()[retptr / 4 + 1]
      var r2 = getInt32Memory0()[retptr / 4 + 2]
      if (r2) {
        throw takeObject(r1)
      }
      return takeObject(r0)
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16)
    }
  }
  /**
   * @returns {any}
   */
  csiMethods() {
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16)
      wasm.rewriter_csiMethods(retptr, this.__wbg_ptr)
      var r0 = getInt32Memory0()[retptr / 4 + 0]
      var r1 = getInt32Memory0()[retptr / 4 + 1]
      var r2 = getInt32Memory0()[retptr / 4 + 2]
      if (r2) {
        throw takeObject(r1)
      }
      return takeObject(r0)
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16)
    }
  }
  /**
   * @param {any} logger
   * @param {string} level
   */
  setLogger(logger, level) {
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16)
      const ptr0 = passStringToWasm0(level, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
      const len0 = WASM_VECTOR_LEN
      wasm.rewriter_setLogger(retptr, this.__wbg_ptr, addBorrowedObject(logger), ptr0, len0)
      var r0 = getInt32Memory0()[retptr / 4 + 0]
      var r1 = getInt32Memory0()[retptr / 4 + 1]
      if (r1) {
        throw takeObject(r0)
      }
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16)
      heap[stack_pointer++] = undefined
    }
  }
}
module.exports.Rewriter = Rewriter

module.exports.__wbg_dirname_22fc4b5a0f831222 = function () {
  return handleError(function (arg0, arg1) {
    const ret = dirname(getStringFromWasm0(arg0, arg1))
    return addHeapObject(ret)
  }, arguments)
}

module.exports.__wbindgen_string_get = function (arg0, arg1) {
  const obj = getObject(arg1)
  const ret = typeof obj === 'string' ? obj : undefined
  var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
  var len1 = WASM_VECTOR_LEN
  getInt32Memory0()[arg0 / 4 + 1] = len1
  getInt32Memory0()[arg0 / 4 + 0] = ptr1
}

module.exports.__wbindgen_object_drop_ref = function (arg0) {
  takeObject(arg0)
}

module.exports.__wbg_readFileSync_780f1db2efb27da8 = function () {
  return handleError(function (arg0, arg1) {
    const ret = readFileSync(getStringFromWasm0(arg0, arg1))
    return addHeapObject(ret)
  }, arguments)
}

module.exports.__wbg_new_09938a7d020f049b = function (arg0) {
  const ret = new Uint8Array(getObject(arg0))
  return addHeapObject(ret)
}

module.exports.__wbindgen_jsval_loose_eq = function (arg0, arg1) {
  const ret = getObject(arg0) == getObject(arg1)
  return ret
}

module.exports.__wbindgen_boolean_get = function (arg0) {
  const v = getObject(arg0)
  const ret = typeof v === 'boolean' ? (v ? 1 : 0) : 2
  return ret
}

module.exports.__wbg_new_abda76e883ba8a5f = function () {
  const ret = new Error()
  return addHeapObject(ret)
}

module.exports.__wbg_stack_658279fe44541cf6 = function (arg0, arg1) {
  const ret = getObject(arg1).stack
  const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
  const len1 = WASM_VECTOR_LEN
  getInt32Memory0()[arg0 / 4 + 1] = len1
  getInt32Memory0()[arg0 / 4 + 0] = ptr1
}

module.exports.__wbg_error_f851667af71bcfc6 = function (arg0, arg1) {
  let deferred0_0
  let deferred0_1
  try {
    deferred0_0 = arg0
    deferred0_1 = arg1
    console.error(getStringFromWasm0(arg0, arg1))
  } finally {
    wasm.__wbindgen_free(deferred0_0, deferred0_1, 1)
  }
}

module.exports.__wbg_randomFillSync_6894564c2c334c42 = function () {
  return handleError(function (arg0, arg1, arg2) {
    getObject(arg0).randomFillSync(getArrayU8FromWasm0(arg1, arg2))
  }, arguments)
}

module.exports.__wbg_subarray_d82be056deb4ad27 = function (arg0, arg1, arg2) {
  const ret = getObject(arg0).subarray(arg1 >>> 0, arg2 >>> 0)
  return addHeapObject(ret)
}

module.exports.__wbg_getRandomValues_805f1c3d65988a5a = function () {
  return handleError(function (arg0, arg1) {
    getObject(arg0).getRandomValues(getObject(arg1))
  }, arguments)
}

module.exports.__wbg_length_0aab7ffd65ad19ed = function (arg0) {
  const ret = getObject(arg0).length
  return ret
}

module.exports.__wbindgen_object_clone_ref = function (arg0) {
  const ret = getObject(arg0)
  return addHeapObject(ret)
}

module.exports.__wbg_crypto_e1d53a1d73fb10b8 = function (arg0) {
  const ret = getObject(arg0).crypto
  return addHeapObject(ret)
}

module.exports.__wbindgen_is_object = function (arg0) {
  const val = getObject(arg0)
  const ret = typeof val === 'object' && val !== null
  return ret
}

module.exports.__wbg_process_038c26bf42b093f8 = function (arg0) {
  const ret = getObject(arg0).process
  return addHeapObject(ret)
}

module.exports.__wbg_versions_ab37218d2f0b24a8 = function (arg0) {
  const ret = getObject(arg0).versions
  return addHeapObject(ret)
}

module.exports.__wbg_node_080f4b19d15bc1fe = function (arg0) {
  const ret = getObject(arg0).node
  return addHeapObject(ret)
}

module.exports.__wbindgen_is_string = function (arg0) {
  const ret = typeof getObject(arg0) === 'string'
  return ret
}

module.exports.__wbg_require_78a3dcfbdba9cbce = function () {
  return handleError(function () {
    const ret = module.require
    return addHeapObject(ret)
  }, arguments)
}

module.exports.__wbindgen_is_function = function (arg0) {
  const ret = typeof getObject(arg0) === 'function'
  return ret
}

module.exports.__wbindgen_string_new = function (arg0, arg1) {
  const ret = getStringFromWasm0(arg0, arg1)
  return addHeapObject(ret)
}

module.exports.__wbg_msCrypto_6e7d3e1f92610cbb = function (arg0) {
  const ret = getObject(arg0).msCrypto
  return addHeapObject(ret)
}

module.exports.__wbg_newwithlength_89eeca401d8918c2 = function (arg0) {
  const ret = new Uint8Array(arg0 >>> 0)
  return addHeapObject(ret)
}

module.exports.__wbg_call_587b30eea3e09332 = function () {
  return handleError(function (arg0, arg1, arg2) {
    const ret = getObject(arg0).call(getObject(arg1), getObject(arg2))
    return addHeapObject(ret)
  }, arguments)
}

module.exports.__wbindgen_memory = function () {
  const ret = wasm.memory
  return addHeapObject(ret)
}

module.exports.__wbg_buffer_55ba7a6b1b92e2ac = function (arg0) {
  const ret = getObject(arg0).buffer
  return addHeapObject(ret)
}

module.exports.__wbg_set_3698e3ca519b3c3c = function (arg0, arg1, arg2) {
  getObject(arg0).set(getObject(arg1), arg2 >>> 0)
}

module.exports.__wbg_self_742dd6eab3e9211e = function () {
  return handleError(function () {
    const ret = self.self
    return addHeapObject(ret)
  }, arguments)
}

module.exports.__wbg_window_c409e731db53a0e2 = function () {
  return handleError(function () {
    const ret = window.window
    return addHeapObject(ret)
  }, arguments)
}

module.exports.__wbg_globalThis_b70c095388441f2d = function () {
  return handleError(function () {
    const ret = globalThis.globalThis
    return addHeapObject(ret)
  }, arguments)
}

module.exports.__wbg_global_1c72617491ed7194 = function () {
  return handleError(function () {
    const ret = global.global
    return addHeapObject(ret)
  }, arguments)
}

module.exports.__wbindgen_is_undefined = function (arg0) {
  const ret = getObject(arg0) === undefined
  return ret
}

module.exports.__wbg_newnoargs_c9e6043b8ad84109 = function (arg0, arg1) {
  const ret = new Function(getStringFromWasm0(arg0, arg1))
  return addHeapObject(ret)
}

module.exports.__wbg_call_557a2f2deacc4912 = function () {
  return handleError(function (arg0, arg1) {
    const ret = getObject(arg0).call(getObject(arg1))
    return addHeapObject(ret)
  }, arguments)
}

module.exports.__wbindgen_number_get = function (arg0, arg1) {
  const obj = getObject(arg1)
  const ret = typeof obj === 'number' ? obj : undefined
  getFloat64Memory0()[arg0 / 8 + 1] = isLikeNone(ret) ? 0 : ret
  getInt32Memory0()[arg0 / 4 + 0] = !isLikeNone(ret)
}

module.exports.__wbg_instanceof_Uint8Array_1349640af2da2e88 = function (arg0) {
  let result
  try {
    result = getObject(arg0) instanceof Uint8Array
  } catch (_) {
    result = false
  }
  const ret = result
  return ret
}

module.exports.__wbg_instanceof_ArrayBuffer_ef2632aa0d4bfff8 = function (arg0) {
  let result
  try {
    result = getObject(arg0) instanceof ArrayBuffer
  } catch (_) {
    result = false
  }
  const ret = result
  return ret
}

module.exports.__wbindgen_error_new = function (arg0, arg1) {
  const ret = new Error(getStringFromWasm0(arg0, arg1))
  return addHeapObject(ret)
}

module.exports.__wbindgen_debug_string = function (arg0, arg1) {
  const ret = debugString(getObject(arg1))
  const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
  const len1 = WASM_VECTOR_LEN
  getInt32Memory0()[arg0 / 4 + 1] = len1
  getInt32Memory0()[arg0 / 4 + 0] = ptr1
}

module.exports.__wbindgen_throw = function (arg0, arg1) {
  throw new Error(getStringFromWasm0(arg0, arg1))
}

module.exports.__wbg_set_20cbc34131e76824 = function (arg0, arg1, arg2) {
  getObject(arg0)[takeObject(arg1)] = takeObject(arg2)
}

module.exports.__wbindgen_number_new = function (arg0) {
  const ret = arg0
  return addHeapObject(ret)
}

module.exports.__wbindgen_bigint_from_u64 = function (arg0) {
  const ret = BigInt.asUintN(64, arg0)
  return addHeapObject(ret)
}

module.exports.__wbg_getwithrefkey_15c62c2b8546208d = function (arg0, arg1) {
  const ret = getObject(arg0)[getObject(arg1)]
  return addHeapObject(ret)
}

module.exports.__wbindgen_in = function (arg0, arg1) {
  const ret = getObject(arg0) in getObject(arg1)
  return ret
}

module.exports.__wbg_isArray_04e59fb73f78ab5b = function (arg0) {
  const ret = Array.isArray(getObject(arg0))
  return ret
}

module.exports.__wbg_length_820c786973abdd8a = function (arg0) {
  const ret = getObject(arg0).length
  return ret
}

module.exports.__wbg_get_7303ed2ef026b2f5 = function (arg0, arg1) {
  const ret = getObject(arg0)[arg1 >>> 0]
  return addHeapObject(ret)
}

module.exports.__wbg_iterator_7c7e58f62eb84700 = function () {
  const ret = Symbol.iterator
  return addHeapObject(ret)
}

module.exports.__wbg_get_f53c921291c381bd = function () {
  return handleError(function (arg0, arg1) {
    const ret = Reflect.get(getObject(arg0), getObject(arg1))
    return addHeapObject(ret)
  }, arguments)
}

module.exports.__wbg_next_f4bc0e96ea67da68 = function (arg0) {
  const ret = getObject(arg0).next
  return addHeapObject(ret)
}

module.exports.__wbg_next_ec061e48a0e72a96 = function () {
  return handleError(function (arg0) {
    const ret = getObject(arg0).next()
    return addHeapObject(ret)
  }, arguments)
}

module.exports.__wbg_done_b6abb27d42b63867 = function (arg0) {
  const ret = getObject(arg0).done
  return ret
}

module.exports.__wbg_value_2f4ef2036bfad28e = function (arg0) {
  const ret = getObject(arg0).value
  return addHeapObject(ret)
}

module.exports.__wbg_new_2b6fea4ea03b1b95 = function () {
  const ret = new Object()
  return addHeapObject(ret)
}

module.exports.__wbg_new_0f2b71ca2f2a6029 = function () {
  const ret = new Map()
  return addHeapObject(ret)
}

module.exports.__wbg_set_da7be7bf0e037b14 = function (arg0, arg1, arg2) {
  const ret = getObject(arg0).set(getObject(arg1), getObject(arg2))
  return addHeapObject(ret)
}

module.exports.__wbg_new_0394642eae39db16 = function () {
  const ret = new Array()
  return addHeapObject(ret)
}

module.exports.__wbg_set_b4da98d504ac6091 = function (arg0, arg1, arg2) {
  getObject(arg0)[arg1 >>> 0] = takeObject(arg2)
}

module.exports.__wbg_setLogger_94b850b3f3f6d4a9 = function () {
  return handleError(function (arg0) {
    const ret = setLogger(getObject(arg0))
    return addHeapObject(ret)
  }, arguments)
}

module.exports.__wbg_log_0a1c996212f8169c = function () {
  return handleError(function (arg0, arg1) {
    const ret = log(getObject(arg0), getObject(arg1))
    return addHeapObject(ret)
  }, arguments)
}

const path = require('path').join(__dirname, 'wasm_js_rewriter_bg.wasm')
const bytes = require('fs').readFileSync(path)

const wasmModule = new WebAssembly.Module(bytes)
const wasmInstance = new WebAssembly.Instance(wasmModule, imports)
wasm = wasmInstance.exports
module.exports.__wasm = wasm
