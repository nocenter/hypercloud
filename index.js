var express = require('express')
var bodyParser = require('body-parser')
var cookieParser = require('cookie-parser')
var expressValidator = require('express-validator')
var lessExpress = require('less-express')
var ejs = require('ejs')

var Hypercloud = require('./lib')
var customValidators = require('./lib/validators')
var customSanitizers = require('./lib/sanitizers')
var packageJson = require('./package.json')

module.exports = function (config) {
  var cloud = new Hypercloud(config)
  cloud.setupAdminUser()

  var app = express()
  app.cloud = cloud
  app.config = config

  app.locals = {
    session: false, // default session value
    errors: false, // common default value
    appInfo: {
      version: packageJson.version,
      brandname: config.brandname,
      hostname: config.hostname,
      port: config.port
    }
  }

  app.engine('html', ejs.renderFile)
  app.set('view engine', 'html')
  app.set('views', './lib/templates/html')

  app.use(cookieParser())
  app.use(bodyParser.json())
  app.use(bodyParser.urlencoded())
  app.use(expressValidator({ customValidators, customSanitizers }))
  app.use(cloud.sessions.middleware())

  // user & auth apis
  // =

  app.get('/v1/register', cloud.api.users.getRegister)
  app.post('/v1/register', cloud.api.users.doRegister)
  app.get('/v1/verify', cloud.api.users.verify)
  app.post('/v1/verify', cloud.api.users.verify)
  app.get('/v1/account', cloud.api.users.getAccount)
  app.post('/v1/account', cloud.api.users.updateAccount)
  app.get('/v1/login', cloud.api.users.getLogin)
  app.post('/v1/login', cloud.api.users.doLogin)
  app.get('/v1/logout', cloud.api.users.doLogout)
  app.post('/v1/logout', cloud.api.users.doLogout)

  // archives apis
  // =

  app.get('/v1/dats/add', cloud.api.archives.getAddPage)
  app.post('/v1/dats/add', cloud.api.archives.add)
  app.post('/v1/dats/remove', cloud.api.archives.remove)

  // assets
  // =

  app.get('/assets/css/main.css', lessExpress('./lib/templates/css/main.less'))
  app.use('/assets/css', express.static('./lib/templates/css'))
  app.use('/assets/js', express.static('./lib/templates/js'))

  // 'frontend'
  // =

  app.get('/', cloud.api.service.frontpage)
  app.get('/v1/explore', cloud.api.service.explore)
  app.get('/v1/about', cloud.api.service.about)
  app.get('/v1/privacy', cloud.api.service.privacy)
  app.get('/v1/terms', cloud.api.service.terms)
  app.get('/v1/support', cloud.api.service.support)
  app.get('/v1/contributors', cloud.api.service.contributors)
  app.get(/^\/[0-9a-f]{64}\/?$/, cloud.api.archives.get)
  app.get('/:username([^/]{3,})', cloud.api.users.get)
  app.get('/:username([^/]{3,})/:datname', cloud.api.archives.getByName)
  app.get('*', cloud.api.service.notfound)

  // error-handling fallback
  // =

  app.use((err, req, res, next) => {
    var contentType = req.accepts(['html', 'json'])

    // validation errors
    if ('isEmpty' in err) {
      return res.status(422).json({
        message: 'Invalid inputs',
        invalidInputs: true,
        details: err.array()
      })
    }

    // common errors
    if ('status' in err) {
      res.status(err.status)
      if (contentType === 'html') {
        res.render('error', { error: err })
      } else {
        res.json(err.body)
      }
      return
    }

    // general uncaught error
    console.error('[ERROR]', err)
    res.status(500)
    var error = {
      message: 'Internal server error',
      internalError: true
    }
    if (contentType === 'html') res.render('error', {error})
    else res.json(error)
  })

  process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at: Promise', p, 'reason:', reason)
  })

  // shutdown
  // =

  app.close = cloud.close.bind(cloud)

  return app
}
