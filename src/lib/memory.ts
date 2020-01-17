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

  private get isGC(): boolean {
    return this.gcProbability > 0 && this.gcProbability * Math.random() <= 1;
  }

  private gc() {
    const t = Date.now();
    for (var i in this.cache) {
      if (this.cache[i].expiry <= t) delete this.cache[i];
    }
  }

  /**
   * 获取值
   * @param key Key
   */
  get(key: string): Promise<T | undefined> {
    const info = this.cache[key];
    if (this.isGC) this.gc();
    if (info && info.expiry > Date.now()) {
      return Promise.resolve(info.value as T);
    }
    delete this.cache[key];
    return Promise.resolve(undefined);
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
