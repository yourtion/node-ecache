import { Cache } from "./cache";

export interface ILRUOption {
  /** 过期时间（秒） */
  ttl?: number;
  /** GC概率（小数，-1表示不执行GC） */
  max?: number;
}

interface ICacheData<T> {
  expiry: number;
  lately: number;
  value: T;
}

export class LRUCache<T = any> extends Cache<T> {
  private max: number;
  private cache: Record<string, ICacheData<T>> = Object.create(null);
  private length = 0;

  constructor({ max, ttl }: ILRUOption = {}) {
    super();
    this.max = max || 100;
    this.ttl = ttl || 60;
  }

  private has(key: string) {
    return key in this.cache;
  }

  evict(now: number) {
    const keys = Object.keys(this.cache);
    let key;
    let time = now;
    for (const k of keys) {
      if (this.cache[k].lately <= time) {
        key = k;
      }
    }
    if (key) delete this.cache[key];
    this.length--;
  }

  get(key: string) {
    let result;

    if (this.has(key) === true) {
      const item = this.cache[key];
      const now = Date.now();
      if (item.expiry === -1 || item.expiry > now) {
        result = item.value;
        item.lately = now;
      } else {
        this.delete(key);
      }
    }

    return Promise.resolve(result);
  }

  set(key: string, value: T, ttl = this.ttl) {
    const now = Date.now();
    if (this.length === this.max) {
      this.evict(now);
    }

    this.length++;
    this.cache[key] = {
      expiry: ttl > 0 ? now + ttl * 1000 : -1,
      lately: now,
      value: value,
    };

    return Promise.resolve(value);
  }

  delete(key: string) {
    delete this.cache[key];
  }
}
