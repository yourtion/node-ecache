import { MemoryStore } from "../lib";

const KEY = "a";
const VALUES = [{ a: 1, b: { b: 1 } }, "Hello Yourtion", 12.11, null];
const VAL_OBJ = VALUES[0];

const sleep = (time: number) => new Promise(resolve => setTimeout(resolve, time));

describe("Store setData and getData", function() {
  const store = new MemoryStore({ ttl: 0.001 });
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

describe("Libs - MemoryStore immutable true", () => {
  const cache = new MemoryStore({ ttl: 0.01 });

  it("Test - simple get set delete", async function() {
    expect(cache.get(KEY)).resolves.toBeUndefined();
    for (const val of VALUES) {
      await cache.set(KEY, val);
      expect(cache.get(KEY)).resolves.toEqual(val);
      cache.delete(KEY);
      expect(cache.get(KEY)).resolves.toBeUndefined();
    }
  });

  it("Test - immutable object", async function() {
    expect(cache.get(KEY)).resolves.toBeUndefined();
    cache.set(KEY, VAL_OBJ);
    const res = await cache.get(KEY);
    expect(res).toEqual(VAL_OBJ);
    expect(() => (res.a = 1)).toThrow();
  });

  it("Test - cache expire", async function() {
    cache.set(KEY, VAL_OBJ);
    await sleep(10);
    expect(cache.get(KEY)).resolves.toBeUndefined();
  });
});

describe("Libs - MemoryStore immutable false", () => {
  const cache = new MemoryStore({ immutable: false, ttl: 0.01 });

  it("Test - simple get set delete", async function() {
    expect(cache.get(KEY)).resolves.toBeUndefined();
    for (const val of VALUES) {
      cache.set(KEY, val);
      expect(cache.get(KEY)).resolves.toEqual(val);
      cache.delete(KEY);
      expect(cache.get(KEY)).resolves.toBeUndefined();
    }
  });

  it("Test - mutable object", async function() {
    expect(cache.get(KEY)).resolves.toBeUndefined();
    cache.set(KEY, VAL_OBJ);
    const res = await cache.get(KEY);
    expect(res).toEqual(VAL_OBJ);
    res.a = 2;
    expect(res.a).toEqual(2);
    expect(cache.get(KEY)).resolves.toEqual(VAL_OBJ);
  });

  it("Test - cache expire", async function() {
    await cache.set(KEY, VAL_OBJ);
    await sleep(10);
    expect(cache.get(KEY)).resolves.toBeUndefined();
  });
});
