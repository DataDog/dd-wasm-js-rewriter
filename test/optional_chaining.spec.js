/**
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache-2.0 License.
 * This product includes software developed at Datadog (https://www.datadoghq.com/). Copyright 2022 Datadog, Inc.
 **/
/* eslint-disable no-multi-str */

const { rewriteAndExpectNoTransformation, rewriteAndExpect, rewriteAst } = require('./util')

describe('Optional chaining', () => {
  describe('Rewrites', () => {
    it('does not rewrite if it is not necessary', () => {
      const js = 'a?.customMethod(1);'

      rewriteAndExpectNoTransformation(js, ['iast'])
    })

    it('does not rewrite when it is a delete', () => {
      const js = 'delete a?.substring(1).b;'

      rewriteAndExpectNoTransformation(js, ['iast'])
    })

    it('should not modify optional method', () => {
      const js = 'a?.substring?.(1);'

      rewriteAndExpectNoTransformation(js, ['iast'])
    })

    it('should modify a?.substring(1)', () => {
      const js = 'a?.substring(1);'

      rewriteAndExpect(
        js,
        `{
let __datadog_test_0, __datadog_test_1, __datadog_test_2;
(__datadog_test_0 = a, __datadog_test_0 == null ? undefined : \
(__datadog_test_1 = __datadog_test_0, __datadog_test_2 = __datadog_test_1.substring, \
_ddiast.stringSubstring(__datadog_test_2.call(__datadog_test_1, 1), __datadog_test_2, __datadog_test_1, 1)));
}`,
        ['iast'],
        false
      )
    })

    it('should modify a.b?.method()', () => {
      const js = 'a.b?.substring(1);'

      rewriteAndExpect(
        js,
        `{
let __datadog_test_0, __datadog_test_1, __datadog_test_2;
(__datadog_test_0 = a.b, __datadog_test_0 == null ? undefined : \
(__datadog_test_1 = __datadog_test_0, __datadog_test_2 = __datadog_test_1.substring, \
_ddiast.stringSubstring(__datadog_test_2.call(__datadog_test_1, 1), __datadog_test_2, __datadog_test_1, 1)));
}`,
        ['iast'],
        false
      )
    })

    it('should modify a.b()?.substring(1)', () => {
      const js = 'a.b()?.substring(1);'

      rewriteAndExpect(
        js,
        `{
let __datadog_test_0, __datadog_test_1, __datadog_test_2;
(__datadog_test_0 = a.b(), __datadog_test_0 == null ? undefined : \
(__datadog_test_1 = __datadog_test_0, __datadog_test_2 = __datadog_test_1.substring, \
_ddiast.stringSubstring(__datadog_test_2.call(__datadog_test_1, 1), __datadog_test_2, __datadog_test_1, 1)));
}`,
        ['iast'],
        false
      )
    })

    it('should modify a.b?.substring()?.substring(1)', () => {
      const js = 'a.b?.substring()?.substring(1);'

      rewriteAndExpect(
        js,
        `{
let __datadog_test_0, __datadog_test_1, __datadog_test_2, __datadog_test_3, __datadog_test_4, __datadog_test_5;
(__datadog_test_0 = (__datadog_test_1 = a.b, __datadog_test_1 == null ? undefined : \
(__datadog_test_2 = __datadog_test_1, __datadog_test_3 = __datadog_test_2.substring, \
_ddiast.stringSubstring(__datadog_test_3.call(__datadog_test_2), __datadog_test_3, __datadog_test_2))), \
__datadog_test_0 == null ? undefined : (__datadog_test_4 = __datadog_test_0, \
__datadog_test_5 = __datadog_test_4.substring, _ddiast.stringSubstring(\
__datadog_test_5.call(__datadog_test_4, 1), __datadog_test_5, __datadog_test_4, 1)));
}`,
        ['iast'],
        false
      )
    })

    it('should modify a?.b.substring(1)', () => {
      const js = 'a?.b.substring(1);'

      rewriteAndExpect(
        js,
        `{
let __datadog_test_0, __datadog_test_1, __datadog_test_2;
(__datadog_test_0 = a, __datadog_test_0 == null ? undefined : \
(__datadog_test_1 = __datadog_test_0.b, __datadog_test_2 = __datadog_test_1.substring, \
_ddiast.stringSubstring(__datadog_test_2.call(__datadog_test_1, 1), __datadog_test_2, __datadog_test_1, 1)));
}`,
        ['iast'],
        false
      )
    })

    it('should modify a?.b?.substring(1)', () => {
      const js = 'a?.b?.substring(1);'

      rewriteAndExpect(
        js,
        `{
let __datadog_test_0, __datadog_test_1, __datadog_test_2;
(__datadog_test_0 = a?.b, __datadog_test_0 == null ? undefined : \
(__datadog_test_1 = __datadog_test_0, __datadog_test_2 = __datadog_test_1.substring, \
_ddiast.stringSubstring(__datadog_test_2.call(__datadog_test_1, 1), __datadog_test_2, __datadog_test_1, 1)));
}`,
        ['iast'],
        false
      )
    })

    it('should modify a.b?.substring(1).otherMethod(2)', () => {
      const js = 'a.b?.substring(1).otherMethod(2)'

      rewriteAndExpect(
        js,
        `{
let __datadog_test_0, __datadog_test_1, __datadog_test_2;
(__datadog_test_0 = a.b, __datadog_test_0 == null ? undefined : \
(__datadog_test_1 = __datadog_test_0, __datadog_test_2 = __datadog_test_1.substring, \
_ddiast.stringSubstring(__datadog_test_2.call(__datadog_test_1, 1), __datadog_test_2, __datadog_test_1, 1))\
.otherMethod(2));
}`,
        ['iast'],
        false
      )
    })

    it('should modify a.b?.substring(1).c?.otherMethod(2)', () => {
      const js = 'a.b?.substring(1).c?.otherMethod(2)'

      rewriteAndExpect(
        js,
        `{
let __datadog_test_0, __datadog_test_1, __datadog_test_2;
(__datadog_test_0 = a.b, __datadog_test_0 == null ? undefined : \
(__datadog_test_1 = __datadog_test_0, __datadog_test_2 = __datadog_test_1.substring, \
_ddiast.stringSubstring(__datadog_test_2.call(__datadog_test_1, 1), __datadog_test_2, __datadog_test_1, 1))\
.c?.otherMethod(2));
}`,
        ['iast'],
        false
      )
    })

    it('should modify a.b?.(param).substring(1)', () => {
      const js = 'a.b?.(param).substring(1)'

      rewriteAndExpect(
        js,
        `{
let __datadog_test_0, __datadog_test_1, __datadog_test_2, __datadog_test_3;
(__datadog_test_0 = a, __datadog_test_1 = __datadog_test_0.b, __datadog_test_1 == null ? undefined : \
(__datadog_test_2 = __datadog_test_1.call(__datadog_test_0, param), \
__datadog_test_3 = __datadog_test_2.substring, _ddiast.stringSubstring(__datadog_test_3.call(__datadog_test_2, 1), \
__datadog_test_3, __datadog_test_2, 1)));
}`,
        ['iast'],
        false
      )
    })

    it('should modify b?.().substring(1)', () => {
      const js = 'b?.().substring(1)'

      rewriteAndExpect(
        js,
        `{
let __datadog_test_0, __datadog_test_1, __datadog_test_2;
(__datadog_test_0 = b, __datadog_test_0 == null ? undefined : (__datadog_test_1 = __datadog_test_0(), \
__datadog_test_2 = __datadog_test_1.substring, _ddiast.stringSubstring(__datadog_test_2.call(__datadog_test_1, 1), \
__datadog_test_2, __datadog_test_1, 1)));
}`,
        ['iast'],
        false
      )
    })

    it('should modify (b?.substring(1)).otherMethod()', () => {
      const js = '(b?.substring(1)).otherMethod()'

      rewriteAndExpect(
        js,
        `{
let __datadog_test_0, __datadog_test_1, __datadog_test_2;
((__datadog_test_0 = b, __datadog_test_0 == null ? undefined : \
(__datadog_test_1 = __datadog_test_0, __datadog_test_2 = __datadog_test_1.substring, \
_ddiast.stringSubstring(__datadog_test_2.call(__datadog_test_1, 1), __datadog_test_2, \
__datadog_test_1, 1)))).otherMethod();
}`,
        ['iast'],
        false
      )
    })

    it('should modify a?.b()?.param.substring(1)', () => {
      const js = 'a?.b()?.param.substring(1)'

      rewriteAndExpect(
        js,
        `{
let __datadog_test_0, __datadog_test_1, __datadog_test_2;
(__datadog_test_0 = a?.b(), __datadog_test_0 == null ? undefined : \
(__datadog_test_1 = __datadog_test_0.param, __datadog_test_2 = __datadog_test_1.substring, \
_ddiast.stringSubstring(__datadog_test_2.call(__datadog_test_1, 1), __datadog_test_2, __datadog_test_1, 1)));
}`,
        ['iast'],
        false
      )
    })

    it('should modify a?.substring(1)?.b.substring(2)', () => {
      const js = 'a?.substring(1)?.b.substring(2)'

      rewriteAndExpect(
        js,
        `{
let __datadog_test_0, __datadog_test_1, __datadog_test_2, __datadog_test_3, __datadog_test_4, __datadog_test_5;
(__datadog_test_0 = (__datadog_test_1 = a, __datadog_test_1 == null ? undefined : \
(__datadog_test_2 = __datadog_test_1, __datadog_test_3 = __datadog_test_2.substring, _ddiast.stringSubstring(\
__datadog_test_3.call(__datadog_test_2, 1), __datadog_test_3, __datadog_test_2, 1))), __datadog_test_0 == null ? \
undefined : (__datadog_test_4 = __datadog_test_0.b, __datadog_test_5 = __datadog_test_4.substring, \
_ddiast.stringSubstring(__datadog_test_5.call(__datadog_test_4, 2), __datadog_test_5, __datadog_test_4, 2)));
}`,
        ['iast'],
        false
      )
    })

    it('should modify a?.().b.substring(1)', () => {
      const js = 'a?.().b.substring(1)'

      rewriteAndExpect(
        js,
        `{
let __datadog_test_0, __datadog_test_1, __datadog_test_2;
(__datadog_test_0 = a, __datadog_test_0 == null ? undefined : (__datadog_test_1 = __datadog_test_0().b, \
__datadog_test_2 = __datadog_test_1.substring, _ddiast.stringSubstring(__datadog_test_2.call(__datadog_test_1, 1), \
__datadog_test_2, __datadog_test_1, 1)));
}`,
        ['iast'],
        false
      )
    })

    it('should modify ({})?.substring(1)', () => {
      const js = '({})?.substring(1)'

      rewriteAndExpect(
        js,
        `{
let __datadog_test_0, __datadog_test_1, __datadog_test_2;
(__datadog_test_0 = ({}), __datadog_test_0 == null ? undefined : (__datadog_test_1 = __datadog_test_0, \
__datadog_test_2 = __datadog_test_1.substring, _ddiast.stringSubstring(__datadog_test_2.call(__datadog_test_1, 1), \
__datadog_test_2, __datadog_test_1, 1)));
}`,
        ['iast'],
        false
      )
    })

    it('should modify a?.customMethod((b) => b?.substring(1))', () => {
      const js = 'a?.customMethod((b) => b?.substring(1))'

      rewriteAndExpect(
        js,
        `{
a?.customMethod((b)=>{
let __datadog_test_0, __datadog_test_1, __datadog_test_2;
return (__datadog_test_0 = b, __datadog_test_0 == null ? undefined : (__datadog_test_1 = __datadog_test_0, \
__datadog_test_2 = __datadog_test_1.substring, _ddiast.stringSubstring(__datadog_test_2.call(__datadog_test_1, 1), \
__datadog_test_2, __datadog_test_1, 1)));
});
}`,
        ['iast'],
        false
      )
    })

    it('should modify a?.customMethod(function (b) { return b?.substring(1) })', () => {
      const js = 'a?.customMethod(function (b) { return b?.substring(1) })'

      rewriteAndExpect(
        js,
        `{
a?.customMethod(function(b) {
let __datadog_test_0, __datadog_test_1, __datadog_test_2;
return (__datadog_test_0 = b, __datadog_test_0 == null ? undefined : (__datadog_test_1 = __datadog_test_0, \
__datadog_test_2 = __datadog_test_1.substring, _ddiast.stringSubstring(__datadog_test_2.call(__datadog_test_1, 1), \
__datadog_test_2, __datadog_test_1, 1)));
});
}`,
        ['iast'],
        false
      )
    })

    it('should modify a?.customMethod(class A { methodB (b) { return b?.substring(1) }})', () => {
      const js = 'a?.customMethod(class A { methodB (b) { return b?.substring(1) }})'

      rewriteAndExpect(
        js,
        `{
a?.customMethod(class A {
methodB(b) {
let __datadog_test_0, __datadog_test_1, __datadog_test_2;
return (__datadog_test_0 = b, __datadog_test_0 == null ? undefined : (__datadog_test_1 = __datadog_test_0, \
__datadog_test_2 = __datadog_test_1.substring, _ddiast.stringSubstring(__datadog_test_2.call(__datadog_test_1, 1), \
__datadog_test_2, __datadog_test_1, 1)));
}
});
}`,
        ['iast'],
        false
      )
    })

    // eslint-disable-next-line no-template-curly-in-string
    it('should modify a?.method(`${b?.trim()}`)', () => {
      // eslint-disable-next-line no-template-curly-in-string
      const js = 'a?.method(`${b?.trim()}`)'

      rewriteAndExpect(
        js,
        `{
let __datadog_test_0, __datadog_test_1, __datadog_test_2, __datadog_test_3;
a?.method((__datadog_test_3 = (__datadog_test_0 = b, __datadog_test_0 == null ? undefined : \
(__datadog_test_1 = __datadog_test_0, __datadog_test_2 = __datadog_test_1.trim, _ddiast.trim(\
__datadog_test_2.call(__datadog_test_1), __datadog_test_2, __datadog_test_1))), \
_ddiast.tplOperator(\`\${__datadog_test_3}\`, __datadog_test_3)));
}`,
        ['iast'],
        false
      )
    })

    it('should modify a?.method(b?.trim())', () => {
      const js = 'a?.method(b?.trim())'

      rewriteAndExpect(
        js,
        `{
let __datadog_test_0, __datadog_test_1, __datadog_test_2;
a?.method((__datadog_test_0 = b, __datadog_test_0 == null ? undefined : \
(__datadog_test_1 = __datadog_test_0, __datadog_test_2 = __datadog_test_1.trim, _ddiast.trim(\
__datadog_test_2.call(__datadog_test_1), __datadog_test_2, __datadog_test_1))));
}`,
        ['iast'],
        false
      )
    })

    it('should modify a?.trim(b?.method())', () => {
      const js = 'a?.trim(b?.method())'

      rewriteAndExpect(
        js,
        `{
let __datadog_test_0, __datadog_test_1, __datadog_test_2, __datadog_test_3;
(__datadog_test_0 = a, __datadog_test_0 == null ? undefined : \
(__datadog_test_1 = __datadog_test_0, __datadog_test_2 = __datadog_test_1.trim, __datadog_test_3 = b?.method(), \
_ddiast.trim(__datadog_test_2.call(__datadog_test_1, __datadog_test_3), __datadog_test_2, __datadog_test_1, \
__datadog_test_3)));
}`,
        ['iast'],
        false
      )
    })
  })

  describe('Executions', () => {
    function compareExecutions (functionContent) {
      const code = `(function test () {${functionContent}})()`

      // eslint-disable-next-line no-eval
      const originalResult = eval(code)
      // eslint-disable-next-line no-eval
      const modifiedResult = eval(rewriteAst(code, ['iast']))

      expect(modifiedResult).to.be.eq(originalResult)
    }

    const FUNCTION_CONTENTS_TO_TEST = [
      'const a = null; return a?.substring(1)',
      'const a = "abcd"; return a?.substring(1)',
      'const a = null; return a?.substring?.(1)',
      'const a = "abcd"; return a?.substring?.(1)',
      'const a = {}; return a.b?.substring(1)',
      'const a = { b: "bbbb" }; return a.b?.substring(1)',
      'const a = { b: () => {} }; return a.b()?.substring(1)',
      'const a = { b: () => "bbb" }; return a.b()?.substring(1)',
      'const a = {}; return a.b?.substring(1)?.substring(2)',
      'const a = { b: "bbbbbb" }; return a.b?.substring(1)?.substring(2)',
      'const a = {}; return a.b?.substring(1).charCodeAt(2)',
      'const a = { b: "bbbbbb" }; return a.b?.substring(1).charCodeAt(2)',
      'const a = {}; return a.b?.substring(1).length.toString()',
      'const a = { b: "bbbbbb" }; return a.b?.substring(1).length.toString()',
      'const a = null; return a?.().substring(1)',
      'const a = () => "bbb"; return a?.().substring(1)',
      'const b = { c: "c" }; const a = { substring: () => b }; delete a?.substring().c; return b.c;',
      'const a = ["1", undefined, "2"]; a?.map(b => b?.substring(1))',
      'const a = ["1", undefined, "2"]; a?.map(function (b) {return b?.substring(1) })',
      `const a = ["1", undefined, "2"];
      a.custom = (Cl) => {
        cl = new Cl();
        cl.method();
      };
      a?.custom(class A {
        method (b) {
          return b?.substring(1);
        }
      })`,
      'const a = { method () {} }; const b = undefined; a?.method(b?.substring(0))',
      // eslint-disable-next-line no-template-curly-in-string
      'const a = { method (p) { return p } }; const b = undefined; a?.method(`${b?.substring()}`)'
    ]

    FUNCTION_CONTENTS_TO_TEST.forEach((functionContent) => {
      before(() => {
        global._ddiast = {
          stringSubstring (res) {
            return res
          },
          tplOperator (res) {
            return res
          }
        }
      })

      after(() => {
        delete global._ddiast
      })

      it('test execution: ' + functionContent, () => {
        compareExecutions(functionContent)
      })
    })
  })
})
