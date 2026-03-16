/**
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache-2.0 License.
 * This product includes software developed at Datadog (https://www.datadoghq.com/). Copyright 2022 Datadog, Inc.
 **/
/* eslint-disable no-multi-str */
const { rewriteAndExpect, rewriteAst } = require('./util')

describe('error tracking rewrite', () => {
  it('basic catch block', () => {
    const js = 'try { nonExistentFunction() } catch (error) { console.error(error) }'
    rewriteAndExpect(
      js,
      `{
        try {
          nonExistentFunction();
        } catch (error) {
          _dderrortracking.record_exception(error);
          console.error(error);
        }
      }`,
      ['error_tracking']
    )
  })

  it('catch array ident', () => {
    const js = 'try { nonExistentFunction() } catch ([foo, bar]) { console.error(foo) }'
    rewriteAndExpect(
      js,
      `{
        try {
          nonExistentFunction();
        } catch (__datadog_errortracking_test) {
          _dderrortracking.record_exception(__datadog_errortracking_test);
          [foo, bar] = __datadog_errortracking_test;
          console.error(foo);
        }
      }`,
      ['error_tracking']
    )
  })

  it('catch object ident', () => {
    const js = 'try { nonExistentFunction() } catch ({foo, bar}) { console.error(foo) }'
    rewriteAndExpect(
      js,
      `{
        try {
          nonExistentFunction();
        } catch (__datadog_errortracking_test) {
          _dderrortracking.record_exception(__datadog_errortracking_test);
          { foo, bar } = __datadog_errortracking_test;
          console.error(foo);
        }
      }`,
      ['error_tracking']
    )
  })

  it('catch without ident', () => {
    const js = 'try { nonExistentFunction() } catch { console.error("catch block") }'
    rewriteAndExpect(
      js,
      `{
        try {
          nonExistentFunction();
        } catch (__datadog_errortracking_test) {
          _dderrortracking.record_exception(__datadog_errortracking_test);
          console.error("catch block");
        }
      }`,
      ['error_tracking']
    )
  })

  it('multiple catch blocks', () => {
    const js = `
      try {
        nonExistentFunction()
      } catch ([foo, bar]) {
        console.error(foo)
      }

      try {
        nonExistentFunction()
      } catch ([foo, bar]) {
        console.error(foo)
      }
    `
    const rewritten = rewriteAst(js, ['error_tracking'], { localVarPrefix: '' })
    const re = /__datadog_errortracking_([a-zA-Z0-9]+)/g
    const hashes = new Set()
    let match
    while ((match = re.exec(rewritten)) !== null) {
      hashes.add(match[1])
    }
    expect(hashes.size).to.equal(2)
    expect(rewritten).to.include('_dderrortracking.record_exception')
  })

  it('nested catch blocks', () => {
    const js = `
      try {
        nonExistentFunction()
      } catch ([foo, bar]) {
        console.error(foo)
        try {
          nonExistentFunction()
        } catch ([code1, code2]) {
          console.log(code1)
        }
      }
    `
    const rewritten = rewriteAst(js, ['error_tracking'], { localVarPrefix: '' })
    const re = /__datadog_errortracking_([a-zA-Z0-9]+)/g
    const hashes = new Set()
    let match
    while ((match = re.exec(rewritten)) !== null) {
      hashes.add(match[1])
    }
    expect(hashes.size).to.equal(2)
    expect(rewritten).to.include('_dderrortracking.record_exception')
  })

  it('catch as member expression arrow func', () => {
    const js = "fetch('1').then(() => {throw 'did not work'}).catch(error => console.error(error));"
    rewriteAndExpect(
      js,
      `{
        fetch('1').then(()=>{
          throw 'did not work';
        }).catch(_dderrortracking.record_exception_callback((error)=>console.error(error)));
      }`,
      ['error_tracking']
    )
  })

  it('catch as member expression func', () => {
    const js = "fetch('1').then(() => {throw 'did not work'}).catch(onError);"
    rewriteAndExpect(
      js,
      `{
        fetch('1').then(()=>{
          throw 'did not work';
        }).catch(_dderrortracking.record_exception_callback(onError));
      }`,
      ['error_tracking']
    )
  })

  it('catch as member expression func with this', () => {
    const js = "fetch('1').then(() => {throw 'did not work'}).catch(this.onError);"
    rewriteAndExpect(
      js,
      `{
        fetch('1').then(()=>{
          throw 'did not work';
        }).catch(_dderrortracking.record_exception_callback(this.onError));
      }`,
      ['error_tracking']
    )
  })

  it('catch as member expression func call', () => {
    const js = "fetch('1').then(() => {throw 'did not work'}).catch(onError(arg));"
    rewriteAndExpect(
      js,
      `{
        fetch('1').then(()=>{
          throw 'did not work';
        }).catch(_dderrortracking.record_exception_callback(onError(arg)));
      }`,
      ['error_tracking']
    )
  })

  it('catch as member expression with finally', () => {
    const js =
      "fetch('1').then(() => {throw 'did not work'}).catch(error => console.error(error)).finally(console.log('foo'));"
    rewriteAndExpect(
      js,
      `{
        fetch('1').then(()=>{
          throw 'did not work';
        }).catch(_dderrortracking.record_exception_callback((error)=>console.error(error))).finally(console.log('foo'));
      }`,
      ['error_tracking']
    )
  })

  it('catch as member expression complicated case', () => {
    const js = "fetch('1').then(() => {throw 'did not work'}).then(doSomething).catch(onError).finally(doSomething);"
    rewriteAndExpect(
      js,
      `{
        fetch('1').then(()=>{
          throw 'did not work';
        }).then(doSomething).catch(_dderrortracking.record_exception_callback(onError)).finally(doSomething);
      }`,
      ['error_tracking']
    )
  })
})
