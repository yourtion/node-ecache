import Store, { IFnType } from "./store";

export interface IMemOption {
  /** 过期时间（秒） */
  ttl?: number;
  immutable?: boolean;
}

interface ICacheItem<T> {
  expire: number;
  data: T;
}

/** 内存缓存 */
export default class MemoryStore<T = any> extends Store {
  private cache: Record<string, ICacheItem<T>> = Object.create(null);
  private immutable: boolean;
  private ttl: number;
  private fnQueue: Record<string, Promise<T | undefined>> = Object.create(null);
  private fns: Record<string, IFnType<T>> = Object.create(null);

  constructor(options: IMemOption = {}) {
    super();
    this.ttl = options.ttl || 30;
    this.immutable = options.immutable || true;
  }

  /**
   * 获取值
   * @param key Key
   */
  get(key: string): Promise<T | undefined> {
    const t = Date.now();
    const info = this.cache[key];
    if (info && info.expire > t) {
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

  /**
   * 注册通过 fn 获取 key 数据方法
   * @param key 获取数据Key
   * @param fn 获取数据方法
   */
  setData(key: string, fn: IFnType<T>) {
    this.fns[key] = fn;
  }

  /**
   * 通过注册的 fn 获取数据并缓存
   * @param {String} key 获取数据Key
   * @param {Any} args 获取数据参数
   */
  getData(key: string, ...args: any[]) {
    const fn = this.fns[key];
    if (!fn) throw new Error(key + " is not setData yet");
    const cacheKey = args.length > 0 ? key + JSON.stringify(args) : key;
    if (!this.fnQueue[cacheKey]) {
      this.fnQueue[cacheKey] = this.get(cacheKey)
        .then(data => {
          if (data !== undefined) {
            delete this.fnQueue[cacheKey];
            return data;
          }
          return fn(...args);
        })
        .then(res => {
          if (!this.fnQueue[cacheKey]) return res;
          return this.set(cacheKey, res);
        })
        .then(res2 => {
          if (!this.fnQueue[cacheKey]) return res2;
          delete this.fnQueue[cacheKey];
          if (!res2) return undefined;
          return this.get(cacheKey);
        });
    }
    return this.fnQueue[cacheKey];
  }
}
