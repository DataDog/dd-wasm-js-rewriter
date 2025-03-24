const fs = require('fs')
const getDetails = require('module-details-from-path')
const url = require('url')

function getVersion (baseDir) {
  if (baseDir instanceof URL || baseDir.startsWith('file://')) {
    baseDir = url.fileURLToPath(baseDir)
  }
  try {
    return JSON.parse(fs.readFileSync(`${baseDir}/package.json`, 'utf8')).version
  } catch (e) {
    return null
  }
}

module.exports = function getNameAndVersion (filename) {
  const details = getDetails(filename)
  if (details) {
    return { name: details.name, version: getVersion(details.basedir) }
  }
  return { name: null, version: null }
}
