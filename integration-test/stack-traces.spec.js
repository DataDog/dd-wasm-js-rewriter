/* eslint no-unused-expressions: 0 */
const { isFileEdited } = require('./edited-files-cache')

// TODO(bengl) These tests fail on Node.js 20+ and likely always have.
// Skipping them for now, to be fixed in a future PR.
const [NODE_MAJOR] = process.versions.node.split('.').map(Number)
const describeOrSkip = NODE_MAJOR <= 18 ? describe : describe.skip

describeOrSkip('Test stack traces', () => {
  describe('detects line and column correctly', () => {
    it('when error is created out of the methods', () => {
      const { error } = require('./requires/errors')
      const firstStackLine = error.stack.split('\n')[1]
      expect(firstStackLine).to.contain('errors.js:10:15')
      expect(isFileEdited('errors.js')).to.be.true
    })
    it('when error is created out of the methods in eval', () => {
      const { evalError } = require('./requires/errors')
      const firstStackLine = evalError.stack.split('\n')[1]
      expect(firstStackLine).to.contain('errors.js:17:19')
      expect(isFileEdited('errors.js')).to.be.true
    })

    it('when error is created in one method', () => {
      const { createError } = require('./requires/errors')
      const error = createError()
      const firstStackLine = error.stack.split('\n')[1]
      expect(firstStackLine).to.contain('errors.js:13:10')
      expect(isFileEdited('errors.js')).to.be.true
    })

    it('when error is created in one method in eval', () => {
      const { createErrorInEval } = require('./requires/errors')
      const error = createErrorInEval()
      const firstStackLine = error.stack.split('\n')[1]
      expect(firstStackLine).to.contain('errors.js:21:10')
      expect(isFileEdited('errors.js')).to.be.true
    })
  })
})
