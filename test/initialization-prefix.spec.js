/**
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache-2.0 License.
 * This product includes software developed at Datadog (https://www.datadoghq.com/). Copyright 2022 Datadog, Inc.
 **/
/* eslint-disable no-unused-expressions */

const { rewriteAndExpectNoTransformation, rewriteAst, wrapBlock } = require('./util')

const testOptions = {
  keepPrefix: true,
  csiMethods: [
    {
      src: 'trim'
    }
  ]
}

const EXPECTED_PREFIX_IAST = `;
if (typeof _ddiast === 'undefined') (function(globals) {
    const noop = (res)=>res;
    globals._ddiast = globals._ddiast || {
        trim: noop
    };
}((1, eval)('this')));`

const EXPECTED_PREFIX_ET = `;
if (typeof _dderrortracking === 'undefined') (function(globals) {
    const noop = (res)=>res;
    globals._dderrortracking = globals._dderrortracking || {
        record_exception: noop,
        record_exception_callback: noop
    };
}((1, eval)('this')));`

describe('Initialization prefix', () => {
  describe('Rewrites', () => {
    it('should not add prefix when the file is not modified', () => {
      const js = 'const a = 12'

      rewriteAndExpectNoTransformation(js, ['iast'], testOptions)
    })

    it('should add iast prefix in rewritten files', () => {
      const js = 'a.trim();'

      const rewritten = rewriteAst(wrapBlock(js), ['iast'], testOptions)

      expect(rewritten.startsWith(EXPECTED_PREFIX_IAST)).to.be.true
    })

    it('should add errortracking in rewritten files', () => {
      const js = 'try { doSomething() } catch(error) { doSomething() } '

      const rewritten = rewriteAst(wrapBlock(js), ['error_tracking'], testOptions)
      expect(rewritten.startsWith(EXPECTED_PREFIX_ET)).to.be.true
    })

    it('should add two prefixes in rewritten files', () => {
      const js = 'a.trim(); try { doSomething() } catch(error) { doSomething() } '

      const rewritten = rewriteAst(wrapBlock(js), ['iast', 'error_tracking'], testOptions)
      // we cannot check for the exact prefix as the syntax/spaces changes between ci and local
      expect(rewritten.includes("if (typeof _dderrortracking === 'undefined') (function(globals)")).to.be.true
      expect(rewritten.includes("if (typeof _ddiast === 'undefined') (function(globals)")).to.be.true
    })

    it('should add only prefix if pass modifies anything in rewritten files', () => {
      const js = 'a.trim();'

      const rewritten = rewriteAst(wrapBlock(js), ['iast', 'error_tracking'], testOptions)
      expect(rewritten.startsWith(EXPECTED_PREFIX_IAST)).to.be.true
    })

    it('should add prefix in rewritten files in ESM modules', () => {
      const js = 'import { a } from "a"; { a.trim() }'

      const rewritten = rewriteAst(js, ['iast'], testOptions)

      expect(rewritten.startsWith(EXPECTED_PREFIX_IAST)).to.be.true
    })

    it("should maintain 'use strict' at the beginning", () => {
      const js = `'use strict'
function a() { a.trim() }`

      const rewritten = rewriteAst(js, ['iast'], testOptions)

      expect(rewritten).to.include(EXPECTED_PREFIX_IAST)
      expect(rewritten.startsWith("'use strict'")).to.be.true
    })

    it("should maintain 'use strict' at the beginning in ESM modules", () => {
      const js = `'use strict'
import { a } from "a";
function a() { a.trim() }`

      const rewritten = rewriteAst(js, ['iast'], testOptions)

      expect(rewritten).to.include(EXPECTED_PREFIX_IAST)
      expect(rewritten.startsWith("'use strict'")).to.be.true
    })

    it("should maintain 'use strict' at the beginning ignoring comments", () => {
      const js = `// test
'use strict'
function a() { a.trim() }`

      const rewritten = rewriteAst(js, ['iast'], testOptions)

      expect(rewritten.startsWith(`'use strict';\n${EXPECTED_PREFIX_IAST}`)).to.be.true
    })

    it('should maintain "use strict" at the beginning', () => {
      const js = `"use strict"
function a() { a.trim() }`

      const rewritten = rewriteAst(js, ['iast'], testOptions)

      expect(rewritten.startsWith(`"use strict";\n${EXPECTED_PREFIX_IAST}`)).to.be.true
    })

    it('should maintain "use strict" if it comes after /**/ comment and {comments: true} in config', () => {
      const comment = `/* this is a
 * multiline comment
 */`
      const js = `${comment}
"use strict"
function a() { a.trim() }`

      const rewritten = rewriteAst(js, ['iast'], { ...testOptions, comments: true })

      expect(rewritten.startsWith(`${comment} "use strict";\n${EXPECTED_PREFIX_IAST}`)).to.be.true
    })

    it('should maintain "use strict" if it comes after // comment and {comments: true} in config', () => {
      const comment = '// this is a comment'
      const js = `${comment}
"use strict"
function a() { a.trim() }`

      const rewritten = rewriteAst(js, ['iast'], { ...testOptions, comments: true })

      expect(rewritten.startsWith(`${comment}\n"use strict";\n${EXPECTED_PREFIX_IAST}`)).to.be.true
    })

    it('should maintain "use strict" if it comes before // comment and { comments: true } in config', () => {
      const comment = '// this is a comment'
      const js = `"use strict"
${comment}
function a() { a.trim() }`

      const rewritten = rewriteAst(js, ['iast'], { ...testOptions, comments: true })
      expect(rewritten.startsWith(`"use strict";\n${EXPECTED_PREFIX_IAST}\n${comment}`)).to.be.true
    })
  })

  describe('Execution', () => {
    let _ddiast

    beforeEach(() => {
      _ddiast = global._ddiast
      delete global._ddiast
    })

    afterEach(() => {
      global._ddiast = _ddiast
    })

    it('should execute valid code when _ddiast is not defined yet', () => {
      const code = `(val) => {
  return val.trim()
}`
      const rewrittenCode = rewriteAst(code, ['iast'], testOptions)

      // eslint-disable-next-line no-eval
      const rewrittenFunction = (1, eval)(rewrittenCode)

      expect(rewrittenFunction('   test   ')).to.be.equals('test')
    })

    it('should execute valid code when _ddiast is not defined yet and src and dst are differents', () => {
      const code = `(val) => {
  return val.trim()
}`
      const newTestOptions = {
        ...testOptions,
        csiMethods: [
          {
            src: 'trim',
            dst: 'modifiedTrim'
          }
        ]
      }
      const rewrittenCode = rewriteAst(code, ['iast'], newTestOptions)

      // eslint-disable-next-line no-eval
      const rewrittenFunction = (1, eval)(rewrittenCode)

      expect(rewrittenFunction('   test   ')).to.be.equals('test')
    })
  })
})
