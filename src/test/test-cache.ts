import { InMemoryCache, RedisCache, MRCache } from "../lib";
import Redis from "ioredis";
import { LRUCache } from "../lib/lru";

const KEY = "a";
const VALUES = [{ a: 1, b: { b: 1 } }, "Hello Yourtion", 12.11, null];
const VAL_OBJ = VALUES[0];
const sleep = (time: number) => new Promise(resolve => setTimeout(resolve, time));

describe("Cache setData and getData", function() {
  const cache = new InMemoryCache({ ttl: 0.1 });
  const fnKey = "Demo";
  const mockFn = jest.fn(() => new Promise(resolve => setTimeout(() => resolve(Math.random()), 10)));

  it("setData", function() {
    cache.setData(fnKey, mockFn);
    expect((cache as any).fns[fnKey]).toEqual(mockFn);
  });

  it("getData", async function() {
    const data = await cache.getData(fnKey);
    // 第二次从缓存中获取
    const data2 = await cache.getData(fnKey);
    expect(data2).toEqual(data);
    expect(mockFn.mock.calls.length).toEqual(1);
  });

  it("getData concurrency", async function() {
    // 清空 mock 情况
    mockFn.mockClear();

    const fn1 = cache.getData(fnKey, 1);
    const fn2 = cache.getData(fnKey, 2);
    const arr = [fn1, fn2, fn1, fn1, fn1, fn2, fn2, fn2, fn1];
    const rets = await Promise.all(arr);
    expect(rets[0]).not.toEqual(rets[1]);
    expect(rets[2]).toEqual(rets[0]);
    expect(rets[3]).toEqual(rets[0]);
    expect(rets[4]).toEqual(rets[0]);
    expect(rets[5]).toEqual(rets[1]);
    expect(rets[6]).toEqual(rets[1]);
    expect(rets[7]).toEqual(rets[1]);
    expect(rets[8]).toEqual(rets[0]);
    // 方法只能被执行两次
    expect(mockFn.mock.calls.length).toEqual(2);
  });
});

describe("Cache Test", function() {
  const redis = new Redis();

  const inMemoryCache = new InMemoryCache({ immutable: false, ttl: 0.01 });
  const redisCache = new RedisCache({ client: redis, ttl: 1 });
  const mrCache = new MRCache({
    redis: { client: redis, ttl: 1 },
    memory: { ttl: 0.01 },
  });
  const lruCache = new LRUCache({ ttl: 0.01 });

  const caches = [inMemoryCache, redisCache, mrCache, lruCache];

  afterAll(function() {
    redis.disconnect();
  });

  for (const cache of caches) {
    const name = cache.constructor.name;
    const time = ["InMemoryCache", "LRUCache"].indexOf(name) !== -1 ? 10 : 1001;

    describe(`${name}`, function() {
      beforeAll(async function() {
        await cache.delete(KEY);
        expect(await cache.get(KEY)).toBeUndefined();
      });

      for (const val of VALUES) {
        it(`simple get set delete: "${typeof val}"`, async function() {
          await cache.set(KEY, val);
          const res = await cache.get(KEY);
          expect(res).toEqual(val);
          await cache.delete(KEY);
          const res2 = await cache.get(KEY);
          expect(res2).toBeUndefined();
        });
      }

      it("cache expire", async function() {
        await cache.set(KEY, VAL_OBJ);
        await sleep(time);
        expect(await cache.get(KEY)).toBeUndefined();
      });
    });
  }
});

describe("InMemoryCache", function() {
  it("Immutable Object", async function() {
    const cache = new InMemoryCache({ ttl: 0.01 });

    expect(await cache.get(KEY)).toBeUndefined();
    await cache.set(KEY, VAL_OBJ);
    const res = await cache.get(KEY);
    expect(res).toEqual(VAL_OBJ);
    expect(() => (res.a = 1)).toThrow();
  });

  it("Mutable Object", async function() {
    const cache = new InMemoryCache({ immutable: false, ttl: 0.01 });

    expect(await cache.get(KEY)).toBeUndefined();
    await cache.set(KEY, VAL_OBJ);
    const res = await cache.get(KEY);
    expect(res).toEqual(VAL_OBJ);
    res.a = 2;
    expect(res.a).toEqual(2);
    expect(await cache.get(KEY)).toEqual(VAL_OBJ);
  });

  it("GC", async function() {
    const cache = new InMemoryCache({ ttl: 0.01, gcProbability: 1 });
    await Promise.all([cache.set(KEY + 1, VAL_OBJ), cache.set(KEY + 2, VAL_OBJ), cache.set(KEY + 3, VAL_OBJ)]);
    await sleep(11);
    // 再次 get 必然触发GC
    await cache.get(KEY);
    expect(Object.keys((cache as any).cache).length).toEqual(0);
  });
});

describe("LRUCache", function() {
  it("LRU", async function() {
    const cache = new LRUCache({ ttl: 0.01, max: 2 });

    // 设置两个值
    await cache.set("1", 1);
    await cache.set("2", 2);
    const ret = await cache.get("2");
    expect(ret).toBe(2);

    // 获取 1 再设置 3 --> 2 会被淘汰
    await cache.get("1");
    await cache.set("3", 3);
    const ret2 = await cache.get("2");
    expect(ret2).toBeUndefined();

    // 再获取 1 --> 3 会被淘汰
    await cache.get("1");
    await cache.set("4", 4);
    const ret3 = await cache.get("3");
    expect(ret3).toBeUndefined();
  });
});
