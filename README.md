# serverless-helper

[![NPM version][npm-image]][npm-url]
[![Dependency Status][daviddm-image]][daviddm-url]
[![Donate][donate-image]][donate-url]

Deploy flow using GIT and SemVer

## Dependencies

- Serverless

## How to Use

```
/**
 * package.json
 * @type {object}
 */
var pkg = require('./package.json');

var lib = require('serverless-helper')(pkg, [opts]);
```

### Opts

| lib. | via opts Object | via process.env | type | default |
|:--- |:--- |:--- |:--- |:--- |
| **env**  | | *NODE_ENV* | string | `'unknown'` |
| **schema**  | schema | | object | `Joi` |
| **schema.validate**  | schema.validate | | function | `Joi.validate` |
| **error**  | error | | object | `Boom` |
| **logger**  | logger | | object | `new (winston.Logger)(options)` |
| **logger.log**  | logger.log | | function | `(new (winston.Logger)(options)).log` |
| **config**  | config | | object | `{}` |

> You can also extend to your own properties

### Config

| lib.config. | via opts.config Object | via process.env | type | default |
|:--- |:--- |:--- |:--- |:--- |
| **logLevel** | logLevel | *LOG_LEVEL* | string | `'verbose'` |
| **loggly** | loggly | *LOGGLY* | boolean | `false` |
| **airbrake** | airbrake | *AIRBRAKE* | boolean | `false` |
| **airbrakeProjectId** | airbrakeProjectId | *AIRBRAKE_PROJECT_ID* | string | `''` |
| **airbrakeProjectKey** | airbrakeProjectKey | *AIRBRAKE_PROJECT_KEY* | string | `''` |

### Hook to package.json

```
lib.name // pkg.name
lib.version // pkg.version
```

### Hook to process.env
```
lib.getEnv // require('env-var').get
lib.env // process.env.NODE_ENV
lib.isEnv(env) // (process.env.NODE_ENV === env)
lib.isTest() // (process.env.NODE_ENV === 'test')
lib.isDevelopment() // (process.env.NODE_ENV === 'development')
lib.isStage() // (process.env.NODE_ENV === 'stage')
lib.isProduction() // (process.env.NODE_ENV === 'production')
```

### Hook to Logger (default Winston + Loggly Bulk)

- Console
- Loggly Bulk

```
lib.logger // new (winston.Logger)(options)
lib.logger.log // (new (winston.Logger)(options)).log
```
### Hook to Airbrake

```
lib.airbrake // new AirbrakeClient
```

### HTTP Response

```
lib.respond(output, callback)
```

- **output**:
```
statusCode || 200
headers || {}
body || '{}'
```

#### Fail (with Error)

```
lib.fail(err, [boomFnArgs], callback)
```

- **err** as `Error` instance
- **opts**:
```
statusCode || 400
message
decorate
override
```

#### Fail (with Error message)

```
lib.fail(message, [boomFnArgs], callback)
```

- **message** as `string`
- **opts**:
```
statusCode || 400
data
message
decorate
override
ctor
```

#### Fail (with Boom function)

```
lib.failWith(boomFn, boomFnArgs, callback)
```

- **boomFn** as `string` (one of supported Boom.\*)
- **boomFnArgs** as `array` (arguments to apply to Boom.\*)

More info
- [4xx errors](https://www.npmjs.com/package/boom#http-4xx-errors)
- [5xx errors](https://www.npmjs.com/package/boom#http-5xx-errors)

### Schema Validation (default JOI)

```
lib.schema // JOI
lib.schemaValidate(data, schema) // Promise.reject(Boom.badRequest) || Promise.resolve(joiResult.value)
```

## TODO

## Please Contribute!

I'm happy to receive contributions of any kind!

## Did you like my work?
Help me out with a little donation, press on the button below.
[![Donate][donate-image]][donate-url]

[npm-image]: https://img.shields.io/npm/v/serverless-helper.svg?style=flat-square
[npm-url]: https://npmjs.org/package/serverless-helper
[daviddm-image]: http://img.shields.io/david/matteozambon89/serverless-helper.svg?style=flat-square
[daviddm-url]: https://david-dm.org/matteozambon89/serverless-helper
[donate-image]: https://img.shields.io/badge/Donate-PayPal-green.svg
[donate-url]: matteo.zambon.89@gmail.com
