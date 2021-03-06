/**
 * @Author: Matteo Zambon <Matteo>
 * @Date:   2018-03-23 10:36:15
 * @Last modified by:   Matteo
 * @Last modified time: 2018-04-11 07:56:30
 */

'use strict'

/**
 * https://npmjs.com/package/env-var
 * @type {object}
 */
const env = require('env-var')
/**
 * https://npmjs.com/package/http-response-object
 * @type {object}
 */
const Response = require('http-response-object')
/**
 * https://npmjs.com/package/boom
 * @type {object}
 */
const Boom = require('boom')
/**
 * https://npmjs.com/package/joi
 * @type {object}
 */
const Joi = require('joi')
/**
 * https://npmjs.com/package/lodash
 * @type {object}
 */
const _ = require('lodash')
/**
 * https://npmjs.com/package/winston
 * @type {object}
 */
const winston = require('winston')
/**
 * https://npmjs.com/package/winston-loggly-bulk
 * @type {function}
 */
require('winston-loggly-bulk')

const Lib = function(pkg, data) {
  this.config = {}

  for (const k in data) {
    this[k] = data[k]
  }

  // env-var alias
  this.getEnv = env.get

  // Package - Name
  this.name = pkg.name
  // Package - Version
  this.version = pkg.version
  // NODE_ENV
  this.env = env.get('NODE_ENV', 'unknown').asString()

  // Config - On Local Machine
  this.config.onLocal = this.config.onLocal ||
    env.get('ON_LOCAL', 'false').asBool()
  // Config - LOG_LEVEL
  this.config.logLevel = this.config.logLevel ||
    env.get('LOG_LEVEL', 'verbose').asString()
  // Config - LOGGLY
  this.config.loggly = this.config.loggly ||
    env.get('LOGGLY', 'false').asBool()
  // Config - AIRBRAKE
  this.config.airbrake = this.config.airbrake ||
    env.get('AIRBRAKE', 'false').asBool()
  // Config - AIRBRAKE_PROJECT_ID
  this.config.airbrakeProjectId = this.config.airbrakeProjectId ||
    env.get('AIRBRAKE_PROJECT_ID', '').asString()
  // Config - AIRBRAKE_PROJECT_KEY
  this.config.airbrakeProjectKey = this.config.airbrakeProjectKey ||
    env.get('AIRBRAKE_PROJECT_KEY', '').asString()

  // Schema - default is Joi
  if (!this.schema) {
    this.schema = Joi
  }

  // Error - default is Boom
  if (!this.error) {
    this.error = Boom
  }

  // Logger - default is Winston
  if (!this.logger) {
    this.setupWinston()
  }

  // Airbrake
  this.setupAirbrake()
}
Lib.safeJson = function(obj) {
  if (!obj) {
    return obj
  }

  return JSON.parse(JSON.stringify(obj))
}
Lib.prototype.logJson = function(obj) {
  return Lib.safeJson(obj)
}
Lib.prototype.setupWinston = function() {
  const lib = this

  const options = {}
  options.exitOnError = false
  options.level = lib.config.logLevel

  // Console logger
  options.transports = [new winston.transports.Console({
    'humanReadableUnhandledException': true,
    'handleExceptions': true,
    'json': false,
    'colorize': lib.config.onLocal, // colorize just on local machine
    'prettyPrint': true,
  })]

  if (lib.config.loggly) {
    // Loggly Token is required
    lib.config.logglyToken = lib.config.logglyToken ||
      env.get('LOGGLY_TOKEN')
        .required()
        .asString()
    // Loggly Subdomain is required
    lib.config.logglySubdomain = lib.config.logglySubdomain ||
      env.get('LOGGLY_SUBDOMAIN')
        .required()
        .asString()
    // Loggly Tags as comma-separated
    lib.config.logglyTags = lib.config.logglyTags ||
      env.get('LOGGLY_TAGS', '')
        .asString()

    // Parse comma-separated tags and filter empty ones
    lib.config.logglyTags = lib.config.logglyTags.split(',').filter(function(el) {
      return el
    })
    // Add NODE_ENV
    lib.config.logglyTags.push(lib.env)
    // Add tweak-serverless
    lib.config.logglyTags.push('tweak-serverless')
    // Add pkg.name
    lib.config.logglyTags.push(lib.name)
    // Add pkg.version
    lib.config.logglyTags.push(lib.version)
    // Ensure tags are unique
    lib.config.logglyTags = _.uniq(lib.config.logglyTags)

    // Online Logger (Loggly)
    options.transports.push(new winston.transports.Loggly({
      'token': lib.config.logglyToken,
      'subdomain': lib.config.logglySubdomain,
      'tags': lib.config.logglyTags,
      'json': true,
      'stripColors': true,
      'isBulk': false, // try to avoid callback issue
    }))
  }

  lib.logger = new (winston.Logger)(options)

  if (!lib.config.loggly) {
    lib.logger.log('warn', 'Online Logger disabled (NODE_ENV ' + lib.env + ')')
  }
}
Lib.prototype.setupAirbrake = function() {
  const lib = this

  if (!lib.config.airbrake) {
    lib.airbrake = {}
    lib.airbrake.notify = function(err) {
      lib.logger.log('verbose', '[Airbrake] Notify', {err: Lib.safeJson(err)})

      return Promise.resolve({
        id: 'faked',
      })
    }

    lib.logger.log('warn', 'Airbrake disabled (NODE_ENV ' + lib.env + ')')
    return
  }

  const AirbrakeClient = require('airbrake-js')

  lib.airbrake = new AirbrakeClient({
    projectId: lib.config.airbrakeProjectId,
    projectKey: lib.config.airbrakeProjectKey,
  })
}
Lib.prototype.isEnv = function(env) {
  const lib = this

  return lib.env === env
}
Lib.prototype.isTest = function() {
  const lib = this

  return lib.env === 'test'
}
Lib.prototype.isDevelopment = function() {
  const lib = this

  return lib.env === 'development'
}
Lib.prototype.isStage = function() {
  const lib = this

  return lib.env === 'stage'
}
Lib.prototype.isProduction = function() {
  const lib = this

  return lib.env === 'production'
}
Lib.prototype.respond = function(output, cb) {
  const statusCode = output.statusCode || 200
  const headers = output.headers || {}
  const body = _.isString(output.payload) ? output.payload : JSON.stringify(output.payload)

  const resp = new Response(statusCode, headers, body)

  return cb(null, resp)
}
Lib.prototype.failWith = function(fn, args, cb) {
  const lib = this

  const err = lib.error[fn].apply(null, args)

  return lib.fail(err, null, cb)
}
Lib.prototype.fail = function(err, args, cb) {
  const lib = this

  // args is used just in case isn't Boom error
  args = args || {statusCode: 400}

  if (_.isString(err)) {
    err = new Boom(err, args)
  }
  else if (err instanceof Error && !Boom.isBoom(err)) {
    Boom.boomify(err, args)
  }

  // Create output object for lib.respond
  const output = err.output
  output.payload = output.payload || {}
  // In case err.data is specified and we are not on production,
  // then display that value
  if (err.data && !lib.isProduction()) {
    // In case err.data.isJoi (Joi error instance),
    // append just err.data.details to output.payload.data
    if (err.data.isJoi) {
      output.payload.data = err.data.details
    }
    else {
      // Append data to the payload
      output.payload.data = err.data
    }
  }

  lib.logger.log('verbose', 'Fail with error', {output: Lib.safeJson(output)})

  // Wait for Airbrake before responding

  lib.airbrake.notify(err)
    .then(function(notice) {
      lib.logger.log('verbose', '[Airbrake] Notice id', {notice: Lib.safeJson(notice)})

      return lib.respond(output, cb)
    })
    .catch(function(err) {
      lib.logger.log('verbose', '[Airbrake] Notice error', {err: Lib.safeJson(err)})

      return lib.respond(output, cb)
    })
}
Lib.prototype.schemaValidate = function(data, schema) {
  const lib = this

  const result = lib.schema.validate(data, schema)

  if (result.error) {
    const err = lib.error.badRequest(result.error.message, result.error)

    return Promise.reject(err)
  }

  return Promise.resolve(result.value)
}
Lib.prototype.prepare = function(opts, cb) {
  const lib = this

  // Expect Promise
  const expectPromise = opts.expectPromise || false
  // Respond After
  const respondAfter = opts.respondAfter || false
  // Event Schema
  const eventSchema = opts.eventSchema || null
  // Context Schema
  const contextSchema = opts.contextSchema || null
  // Body Parser
  const bodyParser = opts.bodyParser || null
  // AWS callbackWaitsForEmptyEventLoop
  const forcedResponse = opts.forcedResponse || false

  return (event, context, callback) => {
    context.callbackWaitsForEmptyEventLoop = forcedResponse

    if (_.isString(bodyParser) && bodyParser === 'json') {
      event.body = _.isString(event.body) ? JSON.parse(event.body) : event.body
    }
    // TODO: add more bodyparsers

    const promises = []

    if (eventSchema) {
      promises.push(lib.schemaValidate.bind(lib)(event, eventSchema))
    }
    else {
      promises.push(Promise.resolve(event))
    }

    if (contextSchema) {
      promises.push(lib.schemaValidate.bind(lib)(context, contextSchema))
    }
    else {
      promises.push(Promise.resolve(context))
    }

    if (expectPromise) {
      return Promise.all(promises)
        .then((parsed) => {
          const eventParsed = parsed[0]
          const contextParsed = parsed[1]

          return Promise.resolve({
            event: eventParsed,
            context: contextParsed,
            callback: callback
          })
        })
        .catch((err) => {
          lib.logger.log('error', 'Promise catched error', {
            error: err,
          })
          lib.fail(err, {}, callback)
        })
    }
    else if (respondAfter) {
      Promise.all(promises)
        .then((parsed) => {
          const eventParsed = parsed[0]
          const contextParsed = parsed[1]

          return cb(eventParsed, contextParsed, callback)
        })
        .then((result) => {
          lib.respond(result, callback)
        })
        .catch((err) => {
          lib.logger.log('error', 'Promise catched error', {
            error: err,
          })
          lib.fail(err, {}, callback)
        })
    }
    else {
      Promise.all(promises)
        .then((parsed) => {
          const eventParsed = parsed[0]
          const contextParsed = parsed[1]

          cb(eventParsed, contextParsed, callback)
        })
        .catch((err) => {
          lib.logger.log('error', 'Promise catched error', {
            error: err,
          })
          lib.fail(err, {}, callback)
        })
    }
  }
}

module.exports = function(pkg, config) {
  return new Lib(pkg, config)
}
