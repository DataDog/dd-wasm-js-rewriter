/**
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache-2.0 License.
 * This product includes software developed at Datadog (https://www.datadoghq.com/). Copyright 2022 Datadog, Inc.
 **/
/* eslint-disable no-multi-str */

const { itEach } = require('mocha-it-each')

const { rewriteAndExpectNoTransformation, rewriteAndExpect, rewriteAndExpectAndExpectEval, fn } = require('./util')

describe('String method', () => {
  describe('substring', () => {
    it('does not modify literal substring', () => {
      const js = '"a".substring(1);'
      rewriteAndExpectNoTransformation(js, ['iast'])
    })

    it('does modify substring', () => {
      const js = 'a.substring(1);'
      rewriteAndExpect(
        js,
        `{
  let __datadog_test_0, __datadog_test_1;
  (__datadog_test_0 = a, __datadog_test_1 = __datadog_test_0.substring, _ddiast.stringSubstring(__datadog_test_1\
.call(__datadog_test_0, 1), __datadog_test_1, __datadog_test_0, 1));\n}`,
        ['iast']
      )
    })

    it('does modify substring with 2 arguments', () => {
      const js = 'a.substring(1, a.lenght - 2);'
      rewriteAndExpect(
        js,
        `{
  let __datadog_test_0, __datadog_test_1, __datadog_test_2;
(__datadog_test_0 = a, __datadog_test_1 = __datadog_test_0.substring, __datadog_test_2 = a.lenght - 2, \
_ddiast.stringSubstring(__datadog_test_1.call(__datadog_test_0, 1, __datadog_test_2), __datadog_test_1, \
__datadog_test_0, 1, __datadog_test_2));\n}`,
        ['iast']
      )
    })

    it('does modify substring after call', () => {
      const js = 'a().substring(1);'
      rewriteAndExpect(
        js,
        `{
  let __datadog_test_0, __datadog_test_1;
(__datadog_test_0 = a(), __datadog_test_1 = __datadog_test_0.substring, _ddiast.stringSubstring(__datadog_test_1\
.call(__datadog_test_0, 1), __datadog_test_1, __datadog_test_0, 1));\n}`,
        ['iast']
      )
    })

    it('does modify substring after call with argument variable', () => {
      const js = 'a().substring(b);'
      rewriteAndExpect(
        js,
        `{
  let __datadog_test_0, __datadog_test_1, __datadog_test_2;
(__datadog_test_0 = a(), __datadog_test_1 = __datadog_test_0.substring, __datadog_test_2 = b, \
_ddiast.stringSubstring(__datadog_test_1.call(__datadog_test_0, __datadog_test_2), __datadog_test_1, __datadog_test_0\
, __datadog_test_2));\n}`,
        ['iast']
      )
    })

    it('does modify substring after call with argument call', () => {
      const js = 'a().substring(b());'
      rewriteAndExpect(
        js,
        `{
  let __datadog_test_0, __datadog_test_1, __datadog_test_2;
(__datadog_test_0 = a(), __datadog_test_1 = __datadog_test_0.substring, __datadog_test_2 = b(), \
_ddiast.stringSubstring(__datadog_test_1.call(__datadog_test_0, __datadog_test_2), __datadog_test_1, \
__datadog_test_0, __datadog_test_2));\n}`,
        ['iast']
      )
    })

    it('does modify substring after call with expressions in argument ', () => {
      const js = 'a().substring(c + b());'
      rewriteAndExpect(
        js,
        `{
  let __datadog_test_0, __datadog_test_1, __datadog_test_2, __datadog_test_3, __datadog_test_4;
(__datadog_test_2 = a(), __datadog_test_3 = __datadog_test_2.substring, __datadog_test_4 = (__datadog_test_0 = c, \
__datadog_test_1 = b(), _ddiast.plusOperator(__datadog_test_0 + __datadog_test_1, __datadog_test_0, __datadog_test_1))\
, _ddiast.stringSubstring(__datadog_test_3.call(__datadog_test_2, __datadog_test_4), __datadog_test_3, \
__datadog_test_2, __datadog_test_4));\n}`,
        ['iast']
      )
    })

    it('does not modify literal String.prototype.substring.call', () => {
      const js = 'String.prototype.substring.call("hello", 2);'
      rewriteAndExpectNoTransformation(js, ['iast'])
    })

    it('does modify String.prototype.substring.call', () => {
      const js = 'String.prototype.substring.call(b, 2);'
      rewriteAndExpect(
        js,
        `{
  let __datadog_test_0, __datadog_test_1;
(__datadog_test_0 = b, __datadog_test_1 = String.prototype.substring, _ddiast.stringSubstring(__datadog_test_1\
.call(__datadog_test_0, 2), __datadog_test_1, __datadog_test_0, 2));\n}`,
        ['iast']
      )
    })

    it('does modify String.prototype.substring.call with expression argument', () => {
      const js = 'String.prototype.substring.call(b + c, 2);'
      rewriteAndExpect(
        js,
        `{
  let __datadog_test_0, __datadog_test_1;
  (__datadog_test_0 = _ddiast.plusOperator(b + c, b, c), __datadog_test_1 = String.prototype.substring, \
_ddiast.stringSubstring(__datadog_test_1.call(__datadog_test_0, 2), __datadog_test_1, __datadog_test_0, 2));\n}`,
        ['iast']
      )
    })

    it('does modify String.prototype.substring.call with no arguments', () => {
      const js = 'String.prototype.substring.call(b);'
      rewriteAndExpect(
        js,
        `{
  let __datadog_test_0, __datadog_test_1;
(__datadog_test_0 = b, __datadog_test_1 = String.prototype.substring, _ddiast.stringSubstring(__datadog_test_1\
.call(__datadog_test_0), __datadog_test_1, __datadog_test_0));
      }`,
        ['iast']
      )
    })

    it('does modify String.prototype.substring.apply with variable argument', () => {
      const js = 'String.prototype.substring.apply(b, [2]);'
      rewriteAndExpect(
        js,
        `{
  let __datadog_test_0, __datadog_test_1;
(__datadog_test_0 = b, __datadog_test_1 = String.prototype.substring, _ddiast.stringSubstring(__datadog_test_1\
.apply(__datadog_test_0, [\n2\n]), __datadog_test_1, __datadog_test_0, 2));\n}`,
        ['iast']
      )
    })

    it('does modify String.prototype.substring.apply with more arguments than needed', () => {
      const js = 'String.prototype.substring.apply(b, [2], 1);'
      rewriteAndExpect(
        js,
        `{
  let __datadog_test_0, __datadog_test_1;
(__datadog_test_0 = b, __datadog_test_1 = String.prototype.substring, _ddiast.stringSubstring(__datadog_test_1\
.apply(__datadog_test_0, [\n2\n], 1), __datadog_test_1, __datadog_test_0, 2, 1));
      }`,
        ['iast']
      )
    })

    it('does not modify String.prototype.substring.apply with incorrect arguments', () => {
      const js = 'String.prototype.substring.apply(b, 2);'
      rewriteAndExpectNoTransformation(js, ['iast'])
    })

    it('does not modify String.prototype.substring.apply with incorrect arguments', () => {
      const js = 'String.prototype.substring.apply();'
      rewriteAndExpectNoTransformation(js, ['iast'])
    })

    it('does not modify String.prototype.substring direct call', () => {
      const js = 'String.prototype.substring(1);'
      rewriteAndExpectNoTransformation(js, ['iast'])
    })

    it('does not modify String.prototype.substring direct call', () => {
      const js = 'String.prototype.substring.call("abc", 0, a);'
      rewriteAndExpectNoTransformation(js, ['iast'])
    })

    it('does modify member.prop.substring call', () => {
      const js = 'a.b.c.substring(1);'
      rewriteAndExpect(
        js,
        `{
  let __datadog_test_0, __datadog_test_1;
(__datadog_test_0 = a.b.c, __datadog_test_1 = __datadog_test_0.substring, _ddiast.stringSubstring(__datadog_test_1\
.call(__datadog_test_0, 1), __datadog_test_1, __datadog_test_0, 1));
      }`,
        ['iast']
      )
    })

    it('does modify member.call.prop.substring call', () => {
      const js = 'a.b().c.substring(1);'
      rewriteAndExpect(
        js,
        `{
  let __datadog_test_0, __datadog_test_1;
(__datadog_test_0 = a.b().c, __datadog_test_1 = __datadog_test_0.substring, _ddiast.stringSubstring(__datadog_test_1\
.call(__datadog_test_0, 1), __datadog_test_1, __datadog_test_0, 1));
      }`,
        ['iast']
      )
    })

    it('does modify member.prop.call.substring call', () => {
      const js = 'a.b.c().substring(1);'
      rewriteAndExpect(
        js,
        `{
  let __datadog_test_0, __datadog_test_1;
(__datadog_test_0 = a.b.c(), __datadog_test_1 = __datadog_test_0.substring, _ddiast.stringSubstring(__datadog_test_1\
.call(__datadog_test_0, 1), __datadog_test_1, __datadog_test_0, 1));
      }`,
        ['iast']
      )
    })
  })

  describe('concat (method that allows literals)', () => {
    it('does not modify String.prototype.concat call if all args are literals', () => {
      const js = 'String.prototype.concat.call("hello", "world");'
      rewriteAndExpectNoTransformation(js, ['iast'])
    })

    it('does modify String.prototype.concat call if args are literals and null', () => {
      const js = 'String.prototype.concat.call("hello", 2, undefined, null);'
      rewriteAndExpectNoTransformation(js, ['iast'])
    })

    it('does modify String.prototype.concat call if some ident', () => {
      const js = 'String.prototype.concat.call("hello", a, "world");'
      rewriteAndExpect(
        js,
        `{
  let __datadog_test_0, __datadog_test_1;
(__datadog_test_0 = String.prototype.concat, __datadog_test_1 = a, _ddiast.concat(\
__datadog_test_0.call("hello", __datadog_test_1, "world"), __datadog_test_0, "hello", \
__datadog_test_1, "world"));
      }`,
        ['iast']
      )
    })

    it('does not modify String.prototype.concat apply if all args are literals', () => {
      const js = 'String.prototype.concat.apply("hello", ["world", null, "moon"]);'
      rewriteAndExpectNoTransformation(js, ['iast'])
    })

    it('does modify String.prototype.concat apply if this is not a literal', () => {
      const js = 'String.prototype.concat.apply(a, ["world", null]);'
      rewriteAndExpect(
        js,
        `{
  let __datadog_test_0, __datadog_test_1;
(__datadog_test_0 = a, __datadog_test_1 = String.prototype.concat, _ddiast.concat(__datadog_test_1.apply(\
__datadog_test_0, [\n"world",\nnull\n]), __datadog_test_1, __datadog_test_0, "world", null));
      }`,
        ['iast']
      )
    })

    it('does modify String.prototype.concat apply if this is null and there is a no literal arg', () => {
      const js = 'String.prototype.concat.apply(null, ["world", a]);'
      rewriteAndExpect(
        js,
        `{
  let __datadog_test_0, __datadog_test_1;
(__datadog_test_0 = String.prototype.concat, __datadog_test_1 = a, _ddiast.concat(__datadog_test_0.apply(\
null, [\n"world",\n__datadog_test_1\n]), __datadog_test_0, null, "world", __datadog_test_1));
      }`,
        ['iast']
      )
    })

    it('does modify String.prototype.concat apply if an argument is not a literal', () => {
      const js = 'String.prototype.concat.apply("hello", ["world", a]);'
      rewriteAndExpect(
        js,
        `{
  let __datadog_test_0, __datadog_test_1;
(__datadog_test_0 = String.prototype.concat, __datadog_test_1 = a, \
_ddiast.concat(__datadog_test_0.apply("hello", [\n"world",\n__datadog_test_1\n]), __datadog_test_0, \
"hello", "world", __datadog_test_1));
      }`,
        ['iast']
      )
    })

    describe('spread arguments', () => {
      it('does modify String.prototype.concat.call(...a)', () => {
        const builder = fn().args(['heLLo', ' ', 'world'])
        const js = builder.build('return String.prototype.concat.call(...a)')
        rewriteAndExpectAndExpectEval(
          js,
          builder.build(`let __datadog_test_0, __datadog_test_1;
        return (__datadog_test_0 = String.prototype.concat, __datadog_test_1 = [\n        ...a\n    ], _ddiast.concat(\
__datadog_test_0.call(...__datadog_test_1), __datadog_test_0, ...__datadog_test_1));`),
          ['iast']
        )
      })

      it('does modify String.prototype.concat.call(...a, ...b)', () => {
        const builder = fn().args(['heLLo', ' ', 'world'], [' ', 'bye'])
        const js = builder.build('return String.prototype.concat.call(...a, ...b)')
        rewriteAndExpectAndExpectEval(
          js,
          builder.build(`let __datadog_test_0, __datadog_test_1, __datadog_test_2;
        return (__datadog_test_0 = String.prototype.concat, __datadog_test_1 = [\n        ...a\n    ], \
__datadog_test_2 = [\n        ...b\n    ], _ddiast.concat(__datadog_test_0.call(...__datadog_test_1, \
...__datadog_test_2), __datadog_test_0, ...__datadog_test_1, ...__datadog_test_2));`),
          ['iast']
        )
      })

      it('does modify String.prototype.concat.call("hello", ...a)', () => {
        const builder = fn().args([' ', 'heLLo', ' ', 'world'])
        const js = builder.build('return String.prototype.concat.call("hello", ...a)')
        rewriteAndExpectAndExpectEval(
          js,
          builder.build(`let __datadog_test_0, __datadog_test_1;
        return (__datadog_test_0 = String.prototype.concat, __datadog_test_1 = [\n        ...a\n    ], _ddiast.concat(\
__datadog_test_0.call("hello", ...__datadog_test_1), __datadog_test_0, "hello", ...__datadog_test_1));`),
          ['iast']
        )
      })

      it('does modify String.prototype.concat.call("hello", ...a, ...b)', () => {
        const builder = fn().args([' ', 'heLLo', ' ', 'world'], ['bye', 'world'])
        const js = builder.build('return String.prototype.concat.call("hello", ...a, ...b)')
        rewriteAndExpectAndExpectEval(
          js,
          builder.build(`let __datadog_test_0, __datadog_test_1, __datadog_test_2;
        return (__datadog_test_0 = String.prototype.concat, __datadog_test_1 = \
[\n        ...a\n    ], __datadog_test_2 = [\n        ...b\n    ], _ddiast.concat(__datadog_test_0.call("hello", \
...__datadog_test_1, ...__datadog_test_2), __datadog_test_0, "hello", ...__datadog_test_1, ...__datadog_test_2));`),
          ['iast']
        )
      })

      it('does modify String.prototype.concat.apply("hello", ...a)', () => {
        const builder = fn().args([['heLLo'], ' ', 'world'])
        const js = builder.build('return String.prototype.concat.apply("hello", ...a)')
        rewriteAndExpectAndExpectEval(
          js,
          builder.build(`let __datadog_test_0, __datadog_test_1;
        return (__datadog_test_0 = String.prototype.concat, __datadog_test_1 = [\n        ...a\n    ], _ddiast.concat(\
__datadog_test_0.apply("hello", ...__datadog_test_1), __datadog_test_0, "hello", ...__datadog_test_1));`),
          ['iast']
        )
      })

      it('does modify String.prototype.concat.apply(...a)', () => {
        const builder = fn().args(['heLLo', [' ', 'world']])
        const js = builder.build('return String.prototype.concat.apply(...a)')
        rewriteAndExpectAndExpectEval(
          js,
          builder.build(`let __datadog_test_0, __datadog_test_1;
        return (__datadog_test_0 = String.prototype.concat, __datadog_test_1 = [\n        ...a\n    ], _ddiast.concat(\
__datadog_test_0.apply(...__datadog_test_1), __datadog_test_0, ...__datadog_test_1));`),
          ['iast']
        )
      })

      it('does modify a.concat("world", ...b)', () => {
        const builder = fn().args('hello', [' ', 'bye', ' ', 'world'])
        const js = builder.build('return a.concat("world", ...b)')
        rewriteAndExpectAndExpectEval(
          js,
          builder.build(`let __datadog_test_0, __datadog_test_1, __datadog_test_2;
        return (__datadog_test_0 = a, __datadog_test_1 = __datadog_test_0.concat, __datadog_test_2 = \
[\n        ...b\n    ], _ddiast.concat(__datadog_test_1.call(__datadog_test_0, "world", ...__datadog_test_2)\
, __datadog_test_1, __datadog_test_0, "world", ...__datadog_test_2));`),
          ['iast']
        )
      })

      it('does modify a.concat(...b)', () => {
        const builder = fn().args('hello', [' ', 'bye', ' ', 'world'])
        const js = builder.build('return a.concat(...b)')
        rewriteAndExpectAndExpectEval(
          js,
          builder.build(`let __datadog_test_0, __datadog_test_1, __datadog_test_2;
        return (__datadog_test_0 = a, __datadog_test_1 = __datadog_test_0.concat, __datadog_test_2 = \
[\n        ...b\n    ], _ddiast.concat(__datadog_test_1.call(__datadog_test_0, ...__datadog_test_2), \
__datadog_test_1, __datadog_test_0, ...__datadog_test_2));`),
          ['iast']
        )
      })

      it('does modify "hello".concat(...a)', () => {
        const builder = fn().args('world')
        const js = builder.build('return "hello".concat(...a)')
        rewriteAndExpectAndExpectEval(
          js,
          builder.build(`let __datadog_test_0, __datadog_test_1;
        return (__datadog_test_0 = "hello".concat, __datadog_test_1 = [\n...a\n], _ddiast.concat(\
__datadog_test_0.call("hello", ...__datadog_test_1), __datadog_test_0, "hello"\
, ...__datadog_test_1));`),
          ['iast']
        )
      })

      it('does modify "hello".concat(...a, ...(b ? [c] : []))', () => {
        const builder = fn().args('world', true, 'bye')
        const js = builder.build('return "hello".concat(...a, ...(b ? [c] : []))')
        rewriteAndExpectAndExpectEval(
          js,
          builder.build(`let __datadog_test_0, __datadog_test_1, __datadog_test_2;
        return (__datadog_test_0 = "hello".concat, __datadog_test_1 = [\n...a\n], __datadog_test_2 = \
[\n...(b ? [\nc\n] : [])\n], _ddiast.concat(__datadog_test_0.call("hello", ...__datadog_test_1, ...__datadog_test_2), \
__datadog_test_0, "hello", ...__datadog_test_1, ...__datadog_test_2));`),
          ['iast']
        )
      })
    })
  })

  const methodAllowingLiterals = ['concat', 'replace']

  itEach(
    '${value}', // eslint-disable-line no-template-curly-in-string
    [
      'trim',
      'trimStart',
      'trimEnd',
      'toLowerCase',
      'toUpperCase',
      "replace('dog', 'monkey')",
      'slice(4, 5)',
      "concat('hello', 'world')",
      "toLocaleUpperCase('en-US')",
      "toLocaleLowerCase('en-US')"
    ],
    (value) => {
      function getMethod (value) {
        return value.split('(')[0]
      }

      function getArgs (value) {
        const parts = value.split('(')
        if (parts.length < 2) return ''
        parts.shift()
        return parts[0].substring(0, parts[0].length - 1)
      }

      const method = getMethod(value)
      const args = getArgs(value)
      const argsWithComma = args ? `, ${args}` : ''

      describe(value, () => {
        if (methodAllowingLiterals.indexOf(method) !== -1) {
          it(`does modify "literal".${value}`, () => {
            const builder = fn()
            const js = builder.build(`return 'a'.${method}(${args});`)
            rewriteAndExpectAndExpectEval(
              js,
              builder.build(`let __datadog_test_0;
        return (__datadog_test_0 = 'a'.${method}, _ddiast.${method}(\
__datadog_test_0.call('a'${argsWithComma}), __datadog_test_0, 'a'${argsWithComma}));`),
              ['iast']
            )
          })
        } else {
          it(`does not modify "literal".${value}`, () => {
            const js = `'a'.${method}(${args});`
            rewriteAndExpectNoTransformation(js, ['iast'])
          })
        }

        it(`does modify ident.${value}`, () => {
          const builder = fn().args('heLLo')
          const js = builder.build(`return a.${method}(${args});`)
          rewriteAndExpectAndExpectEval(
            js,
            builder.build(`let __datadog_test_0, __datadog_test_1;
      return (__datadog_test_0 = a, __datadog_test_1 = __datadog_test_0.${method}, _ddiast.${method}(__datadog_test_1\
.call(__datadog_test_0${argsWithComma}), __datadog_test_1, __datadog_test_0${argsWithComma}));`),
            ['iast']
          )
        })

        it(`does modify call().${value}`, () => {
          const builder = fn().args(() => 'heLLo')
          const js = builder.build(`a().${method}(${args});`)
          rewriteAndExpectAndExpectEval(
            js,
            builder.build(`let __datadog_test_0, __datadog_test_1;
      (__datadog_test_0 = a(), __datadog_test_1 = __datadog_test_0.${method}, _ddiast.${method}(\
__datadog_test_1.call(__datadog_test_0${argsWithComma}), __datadog_test_1, __datadog_test_0${argsWithComma}));`),
            ['iast']
          )
        })

        it(`does modify member.${value}`, () => {
          const builder = fn().args({ b: 'heLLo' })
          const js = builder.build(`a.b.${method}(${args});`)
          rewriteAndExpectAndExpectEval(
            js,
            builder.build(`let __datadog_test_0, __datadog_test_1;
      (__datadog_test_0 = a.b, __datadog_test_1 = __datadog_test_0.${method}, _ddiast.${method}(\
__datadog_test_1.call(__datadog_test_0${argsWithComma}), __datadog_test_1, __datadog_test_0${argsWithComma}));`),
            ['iast']
          )
        })

        if (methodAllowingLiterals.indexOf(method) !== -1) {
          it(`does modify literal String.prototype.${value}.call`, () => {
            const builder = fn().args({ a: 'heLLo' })
            const js = builder.build(`String.prototype.${method}.call(a${argsWithComma});`)
            rewriteAndExpectAndExpectEval(
              js,
              builder.build(`let __datadog_test_0, __datadog_test_1;
        (__datadog_test_0 = a, __datadog_test_1 = String.prototype.${method}, _ddiast.${method}(\
__datadog_test_1.call(__datadog_test_0${argsWithComma}), __datadog_test_1, __datadog_test_0${argsWithComma}));`),
              ['iast']
            )
          })
        } else {
          it(`does not modify literal String.prototype.${value}.call`, () => {
            const js = `String.prototype.${method}.call("hello"${argsWithComma});`
            rewriteAndExpectNoTransformation(js, ['iast'])
          })
        }

        it(`does modify String.prototype.${method}.call`, () => {
          const builder = fn().args('heLLo')
          const js = builder.build(`String.prototype.${method}.call(a${argsWithComma});`)
          rewriteAndExpectAndExpectEval(
            js,
            builder.build(`let __datadog_test_0, __datadog_test_1;
    (__datadog_test_0 = a, __datadog_test_1 = String.prototype.${method}, _ddiast.${method}(\
__datadog_test_1.call(__datadog_test_0${argsWithComma}), __datadog_test_1, __datadog_test_0${argsWithComma}));`),
            ['iast']
          )
        })

        const formatArgs = (args) => {
          if (!args) return ''
          return '\n' + args.replace(',', ',\n') + '\n'
        }

        it(`does modify String.prototype.${value}.apply with variable argument`, () => {
          const builder = fn().args('heLLo')
          const js = builder.build(`String.prototype.${method}.apply(a, [${args}]);`)
          rewriteAndExpectAndExpectEval(
            js,
            builder.build(`let __datadog_test_0, __datadog_test_1;
    (__datadog_test_0 = a, __datadog_test_1 = String.prototype.${method}, _ddiast.${method}(\
__datadog_test_1.apply(__datadog_test_0, [${formatArgs(args)}]), __datadog_test_1, \
__datadog_test_0${argsWithComma}));`),
            ['iast']
          )
        })
      })
    }
  )
})
