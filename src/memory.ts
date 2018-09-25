import Store, { IFnType } from "./store";

/** 初始化内存引擎参数 */
export interface IMemOption {
  /** 过期时间（秒） */
  ttl?: number;
  /** 保证缓存对象不可变 */
  immutable?: boolean;
}

/** 存储对象 */
interface ICacheItem<T> {
  /** 过期时间 */
  expire: number;
  /** 数据 */
  data: T;
}

/** 内存缓存 */
export default class MemoryStore<T = any> extends Store {
  /** 缓存对象 */
  private cache: Record<string, ICacheItem<T>> = Object.create(null);
  /** 是否不可变 */
  private immutable: boolean;

  constructor({ ttl = 30, immutable = true }: IMemOption = {}) {
    super();
    this.ttl = ttl;
    this.immutable = immutable;
  }

  /**
   * 获取值
   * @param key Key
   */
  get(key: string): Promise<T | undefined> {
    const info = this.cache[key];
    if (info && info.expire > Date.now()) {
      return Promise.resolve(info.data as T);
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
    const cache: ICacheItem<T> = { data, expire: Date.now() + ttl * 1000 };
    if (this.immutable && typeof data === "object") {
      cache.data = Object.freeze(JSON.parse(JSON.stringify(data)));
    }
    this.cache[key] = cache;
    return Promise.resolve(data);
  }

  /**
   * 删除值
   * @param key Key
   */
  delete(key: string) {
    delete this.cache[key];
  }
}
