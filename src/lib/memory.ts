import { Cache } from "./cache";

/** 初始化内存引擎参数 */
export interface IMemOption {
  /** 过期时间（秒） */
  ttl?: number;
  /** 保证缓存对象不可变 */
  immutable?: boolean;
  /** GC概率（小数，-1表示不执行GC） */
  gcProbability?: number;
}

/** 存储对象 */
interface ICacheItem<T> {
  /** 过期时间 */
  expiry: number;
  /** 数据 */
  value: T;
}

/** 内存缓存 */
export class InMemoryCache<T = any> extends Cache {
  /** 缓存对象 */
  private cache: Record<string, ICacheItem<T>> = Object.create(null);
  /** 是否不可变 */
  private immutable: boolean;
  /** GC概率分母 */
  private gcProbability: number;

  constructor({ ttl = 30, immutable = true, gcProbability = -1 }: IMemOption = {}) {
    super();
    this.ttl = ttl;
    this.immutable = immutable;
    this.gcProbability = 1 / gcProbability;
  }

  private get isGC() {
    return this.gcProbability > 0 && this.gcProbability * Math.random() <= 1;
  }

  private gc(t = Date.now()) {
    for (let i in this.cache) {
      if (this.cache[i].expiry <= t) delete this.cache[i];
    }
  }

  private has(key: string) {
    return key in this.cache;
  }

  /**
   * 获取值
   * @param key Key
   */
  get(key: string) {
    let result;
    const now = Date.now();

    if (this.isGC) this.gc(now);
    if (this.has(key)) {
      const item = this.cache[key];
      if (item.expiry === -1 || item.expiry > now) {
        result = item.value;
      } else {
        this.delete(key);
      }
    }

    return Promise.resolve(result);
  }

  /**
   * 设置值
   * @param key Key
   * @param data 数据
   * @param ttl TTL（秒）
   */
  set(key: string, data: T, ttl = this.ttl) {
    const cache: ICacheItem<T> = { value: data, expiry: Date.now() + ttl * 1000 };
    if (this.immutable && typeof data === "object") {
      cache.value = Object.freeze(JSON.parse(JSON.stringify(data)));
    }
    this.cache[key] = cache;
    return Promise.resolve(data);
  }

  /**
   * 删除值
   * @param key
   */
  delete(key: string) {
    delete this.cache[key];
  }
}
