import { MemoryStore, RedisStore } from "../lib";
import Redis from "ioredis";

const KEY = "a";
const VALUES = [{ a: 1, b: { b: 1 } }, "Hello Yourtion", 12.11, null];
const VAL_OBJ = VALUES[0];

const sleep = (time: number) => new Promise(resolve => setTimeout(resolve, time));

describe("Store setData and getData", function() {
  const store = new MemoryStore({ ttl: 0.1 });
  const fnKey = "Demo";
  const mockFn = jest.fn(() => new Promise(resolve => setTimeout(() => resolve(Math.random()), 10)));

  it("setData", function() {
    store.setData(fnKey, mockFn);
    expect((store as any).fns[fnKey]).toEqual(mockFn);
  });

  it("getData", async function() {
    const data = await store.getData(fnKey);
    // 第二次从缓存中获取
    const data2 = await store.getData(fnKey);
    expect(data2).toEqual(data);
    expect(mockFn.mock.calls.length).toEqual(1);
  });

  it("getData concurrency", async function() {
    // 清空 mock 情况
    mockFn.mockClear();

    const fn1 = store.getData(fnKey, 1);
    const fn2 = store.getData(fnKey, 2);
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

describe("Store Test", function() {
  const redis = new Redis();

  const memoryStore = new MemoryStore({ immutable: false, ttl: 0.01 });
  const redisStore = new RedisStore({ client: redis, ttl: 1 });

  const stores = [memoryStore, redisStore];

  afterAll(function() {
    redis.disconnect();
  });

  for (const cache of stores) {
    const name = cache.constructor.name;
    const time = name === "MemoryStore" ? 10 : 1000;

    describe(`${name}`, function() {
      it("simple get set delete", async function() {
        expect(cache.get(KEY)).resolves.toBeUndefined();
        for (const val of VALUES) {
          cache.set(KEY, val);
          expect(cache.get(KEY)).resolves.toEqual(val);
          cache.delete(KEY);
          expect(cache.get(KEY)).resolves.toBeUndefined();
        }
      });

      it("cache expire", async function() {
        await cache.set(KEY, VAL_OBJ);
        await sleep(time);
        expect(cache.get(KEY)).resolves.toBeUndefined();
      });
    });
  }
});

describe("MemoryStore immutable", function() {
  it("immutable object", async function() {
    const cache = new MemoryStore({ ttl: 0.01 });

    expect(cache.get(KEY)).resolves.toBeUndefined();
    cache.set(KEY, VAL_OBJ);
    const res = await cache.get(KEY);
    expect(res).toEqual(VAL_OBJ);
    expect(() => (res.a = 1)).toThrow();
  });

  it("mutable object", async function() {
    const cache = new MemoryStore({ immutable: false, ttl: 0.01 });

    expect(cache.get(KEY)).resolves.toBeUndefined();
    cache.set(KEY, VAL_OBJ);
    const res = await cache.get(KEY);
    expect(res).toEqual(VAL_OBJ);
    res.a = 2;
    expect(res.a).toEqual(2);
    expect(cache.get(KEY)).resolves.toEqual(VAL_OBJ);
  });
});
