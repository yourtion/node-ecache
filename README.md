[![NPM version][npm-image]][npm-url]
[![build status][travis-image]][travis-url]
[![Test coverage][coveralls-image]][coveralls-url]
[![David deps][david-image]][david-url]
[![node version][node-image]][node-url]
[![npm download][download-image]][download-url]
[![npm license][license-image]][download-url]

[npm-image]: https://img.shields.io/npm/v/ecache.svg?style=flat-square
[npm-url]: https://npmjs.org/package/ecache
[travis-image]: https://img.shields.io/travis/yourtion/node-ecache.svg?style=flat-square
[travis-url]: https://travis-ci.org/yourtion/node-ecache
[coveralls-image]: https://img.shields.io/coveralls/yourtion/node-ecache.svg?style=flat-square
[coveralls-url]: https://coveralls.io/r/yourtion/node-ecache?branch=master
[david-image]: https://img.shields.io/david/yourtion/node-ecache.svg?style=flat-square
[david-url]: https://david-dm.org/yourtion/node-ecache
[node-image]: https://img.shields.io/badge/node.js-%3E=_8-green.svg?style=flat-square
[node-url]: http://nodejs.org/download/
[download-image]: https://img.shields.io/npm/dm/ecache.svg?style=flat-square
[download-url]: https://npmjs.org/package/ecache
[license-image]: https://img.shields.io/npm/l/ecache.svg

# node-ecache

[![Greenkeeper badge](https://badges.greenkeeper.io/yourtion/node-ecache.svg)](https://greenkeeper.io/)
[![DeepScan grade](https://deepscan.io/api/teams/2046/projects/2765/branches/19919/badge/grade.svg)](https://deepscan.io/dashboard#view=project&tid=2046&pid=2765&bid=19919)

Easy use Memory and Redis cache implementation

## Install

```bash
$ npm install ecache --save
```

## How to use

```typescript
import { InMemoryCache, RedisCache, MRCache } from "ecache";
// const { InMemoryCache, RedisCache, MRCache } = require("ecache");

const inMemoryCache = new InMemoryCache({ ttl: 1 });
const redisCache = new RedisCache({ client: redis, ttl: 1 });
const mrCache = new MRCache({
  redis: { client: redis, ttl: 10 },
  memory: { ttl: 1 },
});

const cache = new InMemoryCache({ ttl: 5 });

// Set Data
await cache.set(KEY, val);
// Get Data
const res = await cache.get(KEY);
// Delete Data
await cache.delete(KEY);

// Use getData and setData
// On concurrency query just run once
cache.setData("getList", (type) => mysql.queryAsync(`SELECT * FROM list where t = "${type}"`));
const list = await cache.getData("getList");
```
