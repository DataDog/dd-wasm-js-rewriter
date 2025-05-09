/**
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache-2.0 License.
 * This product includes software developed at Datadog (https://www.datadoghq.com/). Copyright 2022 Datadog, Inc.
 **/
/* eslint-disable no-unused-expressions */

const proxyquire = require('proxyquire')

describe('main', () => {
  let main, rewriter, status, cacheRewrittenSourceMap
  beforeEach(() => {
    class Rewriter {
      rewrite (code, file) {
        return {
          content: 'content',
          metrics: {
            status
          }
        }
      }
    }

    cacheRewrittenSourceMap = sinon.stub()
    main = proxyquire('../main', {
      './wasm/wasm_js_rewriter': {
        '@noCallThru': true,
        Rewriter
      },
      './js/source-map': {
        cacheRewrittenSourceMap
      }
    })
  })

  describe('default Rewriter', () => {
    beforeEach(() => {
      rewriter = new main.Rewriter()
    })

    it('loads sourceMap when source file has been modified', () => {
      status = 'modified'

      const response = rewriter.rewrite('content', 'file', ['iast'])

      expect(response.metrics.status).to.eq('modified')
      expect(cacheRewrittenSourceMap).to.be.calledOnceWith('file', 'content')
    })

    it('does not load sourceMap when source file has not been modified', () => {
      status = 'notmodified'

      const response = rewriter.rewrite('content', 'file', ['iast'])

      expect(response.metrics.status).to.eq('notmodified')
      expect(cacheRewrittenSourceMap).to.not.be.called
    })

    it('should catch errors produced in cacheRewrittenSourceMap', () => {
      status = 'modified'

      cacheRewrittenSourceMap.throws(() => new Error('Error reading sourceMap file'))

      expect(() => rewriter.rewrite('content', 'file', ['iast'])).to.not.throw()
    })
  })

  describe('NonCacheRewriter', () => {
    beforeEach(() => {
      rewriter = new main.NonCacheRewriter()
    })

    it('does not load sourceMap when source file has been modified', () => {
      status = 'modified'

      const response = rewriter.rewrite('content', 'file', ['iast'])

      expect(response.metrics.status).to.eq('modified')
      expect(cacheRewrittenSourceMap).to.not.be.called
    })

    it('does not load sourceMap when source file has not been modified', () => {
      status = 'notmodified'

      const response = rewriter.rewrite('content', 'file', ['iast'])

      expect(response.metrics.status).to.eq('notmodified')
      expect(cacheRewrittenSourceMap).to.not.be.called
    })

    it('should catch errors produced in cacheRewrittenSourceMap', () => {
      status = 'modified'

      cacheRewrittenSourceMap.throws(() => new Error('Error reading sourceMap file'))

      expect(() => rewriter.rewrite('content', 'file', ['iast'])).to.not.throw()
    })
  })
})
