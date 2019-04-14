import { Cache, Key, EMPTY } from "./cache";

export interface ILRUOption {
  /** 过期时间（秒） */
  ttl?: number;
  /** GC概率（小数，-1表示不执行GC） */
  max?: number;
}

interface ICacheData<T> {
  expiry: number;
  right: Key;
  left: Key;
  value: T;
}

export class LRUCache<T = any> extends Cache<T> {
  private max: number;
  private cache: Record<Key, ICacheData<T>> = Object.create(null);
  private first: Key = EMPTY;
  private last: Key = EMPTY;
  private length = 0;

  constructor({ max, ttl }: ILRUOption = {}) {
    super();
    this.max = max || 100;
    this.ttl = ttl || 60;
  }

  delete(key: Key, bypass = false) {
    return this.remove(key, bypass);
  }

  evict() {
    if (this.length > 0) {
      return this.remove(this.last, true);
    }

    return Promise.resolve(this);
  }

  get(key: Key) {
    let result;

    if (this.has(key) === true) {
      const item = this.cache[key];
      if (item.expiry === -1 || item.expiry > Date.now()) {
        result = item.value;
        this.set(key, result, this.ttl, true);
      } else {
        this.remove(key, true);
      }
    }

    return Promise.resolve(result);
  }

  has(key: Key) {
    return key in this.cache;
  }

  remove(key: Key, bypass = false) {
    if (bypass === true || this.has(key) === true) {
      const item = this.cache[key];

      delete this.cache[key];
      this.length--;

      if (item.left !== EMPTY) {
        this.cache[item.left].right = item.right;
      }

      if (item.right !== EMPTY) {
        this.cache[item.right].left = item.left;
      }

      if (this.first === key) {
        this.first = item.left;
      }

      if (this.last === key) {
        this.last = item.right;
      }
    }

    return Promise.resolve(this);
  }

  set(key: Key, value: T, ttl = this.ttl, bypass = false) {
    if (bypass === true || this.has(key) === true) {
      const item = this.cache[key];

      item.value = value;

      if (this.first !== key) {
        const r = item.right,
          l = item.left,
          f = this.cache[this.first];

        item.right = EMPTY;
        item.left = this.first;
        f.right = key;

        if (r !== EMPTY) {
          this.cache[r].left = l;
        }

        if (l !== EMPTY) {
          this.cache[l].right = r;
        }

        if (this.last === key) {
          this.last = r;
        }
      }
    } else {
      if (this.length === this.max) {
        this.evict();
      }

      this.length++;
      this.cache[key] = {
        expiry: ttl > 0 ? new Date().getTime() + ttl * 1000 : -1,
        right: EMPTY,
        left: this.first,
        value: value,
      };

      if (this.length === 1) {
        this.last = key;
      } else {
        this.cache[this.first].right = key;
      }
    }

    this.first = key;

    return Promise.resolve(value);
  }
}
