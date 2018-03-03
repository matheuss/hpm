'use strict'
const fs = require('fs')
const os = require('os')

const chalk = require('chalk')
const npmName = require('npm-name')
const pify = require('pify')
const recast = require('recast')

const fileName = `${os.homedir()}/.hyper.js`
const oldConf = `${os.homedir()}/.hyperterm.js`

function getPluginName(item) {
  if (item.type === 'TemplateLiteral') {
    return item.quasis[0].value.raw
  }
  return item.value
}

let fileContents
let parsedFile
let plugins
let localPlugins

try {
  fileContents = fs.readFileSync(fileName, 'utf8')

  parsedFile = recast.parse(fileContents)

  const bodyChunks = parsedFile.program.body
  const moduleExports = bodyChunks.find(({expression}) => {
    if (!expression) {
      return false
    }
    const objectName = expression.left.object.name
    const propertyName = expression.left.property && expression.left.property.name
    return objectName === 'module' && (propertyName === 'exports')
  })
  const expression = moduleExports.expression
  const properties = (expression && expression.right && expression.right.properties) || []
  plugins = properties.find(property => {
    return property.key.name === 'plugins'
  }).value.elements

  localPlugins = properties.find(property => {
    return property.key.name === 'localPlugins'
  }).value.elements
} catch (err) {
  if (err.code !== 'ENOENT') { // ENOENT === !exists()
    throw err
  }
}

function exists() {
  if (fs.existsSync(oldConf)) {
    console.log(chalk.yellow(`Warning: ${oldConf} should be ${fileName}`))
  }
  return fileContents !== undefined
}

function isInstalled(plugin, locally) {
  const array = locally ? localPlugins : plugins
  if (array && Array.isArray(array)) {
    return array.find(entry => getPluginName(entry) === plugin) !== undefined
  }
  return false
}

function save() {
  return pify(fs.writeFile)(fileName, recast.print(parsedFile).code, 'utf8')
}

function existsOnNpm(plugin) {
  plugin = plugin.split('#')[0]
  return npmName(plugin).then(available => {
    if (available) {
      const err = new Error(`${plugin} not found on npm`)
      err.code = 'NOT_FOUND_ON_NPM'
      throw err
    }
  })
}

function install(plugin, locally) {
  const array = locally ? localPlugins : plugins
  return new Promise((resolve, reject) => {
    existsOnNpm(plugin).then(() => {
      if (isInstalled(plugin, locally)) {
        return reject(`${plugin} is already installed`)
      }

      array.push(recast.types.builders.literal(plugin))
      save().then(resolve).catch(err => reject(err))
    }).catch(err => {
      if (err.code === 'NOT_FOUND_ON_NPM') {
        reject(err.message)
      } else {
        reject(err)
      }
    })
  })
}

function uninstall(plugin) {
  return new Promise((resolve, reject) => {
    if (!isInstalled(plugin)) {
      return reject(`${plugin} is not installed`)
    }

    const index = plugins.findIndex(entry => getPluginName(entry) === plugin)
    plugins.splice(index, 1)
    save().then(resolve).catch(err => reject(err))
  })
}

function list() {
  if (Array.isArray(plugins)) {
    return plugins.map(plugin => getPluginName(plugin)).join('\n')
  }
  return false
}

module.exports.exists = exists
module.exports.existsOnNpm = existsOnNpm
module.exports.isInstalled = isInstalled
module.exports.install = install
module.exports.uninstall = uninstall
module.exports.list = list
