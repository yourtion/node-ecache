import MemoryStore from "../lib/memory";

const KEY = "a";
const VALUES = [{ a: 1, b: { b: 1 } }, "Hello Yourtion", 12.02, null];
const VAL_OBJ = VALUES[0];

const sleep = (time: number) => {
  return new Promise(resolve => {
    return setTimeout(resolve, time);
  });
};

describe("Libs - MemoryStore immutable true", () => {
  const cache = new MemoryStore({ ttl: 0.01 });

  it("Test - simple get set delete", async function() {
    expect(await cache.get(KEY)).toBeUndefined();
    for (const val of VALUES) {
      await cache.set(KEY, val);
      expect(await cache.get(KEY)).toEqual(val);
      cache.delete(KEY);
      expect(await cache.get(KEY)).toBeUndefined();
    }
  });

  it("Test - immutable object", async function() {
    expect(await cache.get(KEY)).toBeUndefined();
    cache.set(KEY, VAL_OBJ);
    const res = await cache.get(KEY);
    expect(res).toEqual(VAL_OBJ);
    expect(() => (res.a = 1)).toThrow();
  });

  it("Test - cache expire", async function() {
    cache.set(KEY, VAL_OBJ);
    await sleep(10);
    expect(await cache.get(KEY)).toBeUndefined();
  });
});

describe("Libs - MemoryStore immutable false", () => {
  const cache = new MemoryStore({ immutable: false, ttl: 0.01 });

  it("Test - simple get set delete", async function() {
    expect(await cache.get(KEY)).toBeUndefined();
    for (const val of VALUES) {
      cache.set(KEY, val);
      expect(await cache.get(KEY)).toEqual(val);
      cache.delete(KEY);
      expect(await cache.get(KEY)).toBeUndefined();
    }
  });

  it("Test - mutable object", async function() {
    expect(await cache.get(KEY)).toBeUndefined();
    cache.set(KEY, VAL_OBJ);
    const res = await cache.get(KEY);
    expect(res).toEqual(VAL_OBJ);
    res.a = 2;
    expect(res.a).toEqual(2);
    expect(await cache.get(KEY)).toEqual(VAL_OBJ);
  });

  it("Test - cache expire", async function() {
    await cache.set(KEY, VAL_OBJ);
    await sleep(10);
    expect(await cache.get(KEY)).toBeUndefined();
  });
});
