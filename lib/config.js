var fs = require('fs')
var path = require('path')
var extend = require('deep-extend')
var yaml = require('js-yaml')

function load (name) {
  var str, doc
  var filepath = path.join(__dirname, `../config.${name}.yml`)

  try {
    str = fs.readFileSync(filepath, 'utf8')
  } catch (e) {
    return {}
  }

  try {
    doc = yaml.safeLoad(str)
  } catch (e) {
    console.log('Failed to parse', filepath, e)
    return {}
  }

  return doc
}

var env = process.env.NODE_ENV || 'development'
var defaultCfg = load('defaults')
var envCfg = load(env)
module.exports = extend(defaultCfg, envCfg, { env })
