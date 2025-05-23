const { getSourcePathAndLineFromSourceMaps } = require('../source-map')

const kSymbolPrepareStackTrace = Symbol('_ddiastPrepareStackTrace')

const evalRegex = /.*\(((?:.:[/\\]?)?[/\\].*):(\d*):(\d*)\)/g

class WrappedCallSite {
  constructor (callSite) {
    if (callSite.isEval()) {
      evalRegex.lastIndex = 0
      const evalOrigin = callSite.getEvalOrigin()
      const evalData = evalRegex.exec(evalOrigin)

      if (evalData) {
        const { path, line, column } = getSourcePathAndLineFromSourceMaps(
          evalData[1],
          evalData[2],
          evalData[3]
        )

        this.evalOrigin = evalOrigin.replace(`${evalData[1]}:${evalData[2]}:${evalData[3]}`,
          `${path}:${line}:${column}`)
      }
    }

    const { path, line, column } = getSourcePathAndLineFromSourceMaps(
      callSite.getFileName(),
      callSite.getLineNumber(),
      callSite.getColumnNumber()
    )

    this.source = path
    this.lineNumber = line
    this.columnNumber = column
    this.callSite = callSite
  }

  getThis () {
    return this.callSite
  }

  getTypeName () {
    return this.callSite.getTypeName()
  }

  getFunction () {
    return this.callSite.getFunction()
  }

  getFunctionName () {
    return this.callSite.getFunctionName()
  }

  getMethodName () {
    return this.callSite.getMethodName()
  }

  getFileName () {
    return this.source
  }

  getScriptNameOrSourceURL () {
    return null
  }

  getLineNumber () {
    return this.lineNumber
  }

  getColumnNumber () {
    return this.columnNumber
  }

  getEvalOrigin () {
    return this.evalOrigin || this.callSite.getEvalOrigin()
  }

  isToplevel () {
    return this.callSite.isToplevel()
  }

  isEval () {
    return this.callSite.isEval()
  }

  isNative () {
    return this.callSite.isNative()
  }

  isConstructor () {
    return this.callSite.isConstructor()
  }

  toString () {
    let callSiteString = this.callSite.toString()

    if (this.isEval()) {
      callSiteString = callSiteString.replace(this.callSite.getEvalOrigin(), this.getEvalOrigin())
    }

    const newFileLineChar = `${this.source}:${this.lineNumber}:${this.columnNumber})`
    const originalFileLineChar =
      `${this.callSite.getFileName()}:${this.callSite.getLineNumber()}:${this.callSite.getColumnNumber()})`

    return callSiteString.toString()?.replace(originalFileLineChar, newFileLineChar)
  }

  toLocaleString () {
    return this.callSite.toLocaleString()
  }
}

function getPrepareStackTrace (originalPrepareStackTrace) {
  if (originalPrepareStackTrace && originalPrepareStackTrace[kSymbolPrepareStackTrace]) {
    return originalPrepareStackTrace
  }

  const wrappedPrepareStackTrace = (error, structuredStackTrace) => {
    if (originalPrepareStackTrace) {
      let parsedCallSites
      try {
        parsedCallSites = structuredStackTrace.map((callSite) => new WrappedCallSite(callSite))
      } catch (e) {
        parsedCallSites = structuredStackTrace
      }
      return originalPrepareStackTrace(error, parsedCallSites)
    }

    const stackLines = error.stack.split('\n')
    let firstIndex = -1
    for (let i = 0; i < stackLines.length; i++) {
      if (stackLines[i].match(/^\s*at/gm)) {
        firstIndex = i
        break
      }
    }
    return stackLines
      .map((stackFrame, index) => {
        if (index < firstIndex) {
          return stackFrame
        }
        index = index - firstIndex
        const stackTraceItem = structuredStackTrace[index]
        if (!stackTraceItem) {
          return stackFrame
        }
        let filename = stackTraceItem.getFileName()
        let originalLine = stackTraceItem.getLineNumber()
        let originalColumn = stackTraceItem.getColumnNumber()
        if (stackTraceItem.isEval()) {
          const evalOrigin = stackTraceItem.getEvalOrigin()
          const evalRegex = /.*\(((?:.:[/\\]?)?[/\\].*):(\d*):(\d*)\)/g
          const evalData = evalRegex.exec(evalOrigin)
          if (evalData) {
            filename = evalData[1]
            originalLine = evalData[2]
            originalColumn = evalData[3]
          } else {
            return stackFrame
          }
        }
        const { path, line, column } = getSourcePathAndLineFromSourceMaps(filename, originalLine, originalColumn)
        if (path !== filename || line !== originalLine || column !== originalColumn) {
          return stackFrame.replace(`${filename}:${originalLine}:${originalColumn}`, `${path}:${line}:${column}`)
        }
        return stackFrame
      })
      .join('\n')
  }
  Object.defineProperty(wrappedPrepareStackTrace, kSymbolPrepareStackTrace, {
    value: true
  })
  return wrappedPrepareStackTrace
}

module.exports = {
  getPrepareStackTrace,
  kSymbolPrepareStackTrace
}
