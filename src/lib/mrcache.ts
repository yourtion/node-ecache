import { Cache } from "./cache";
import { InMemoryCache, IMemOption } from "./memory";
import { RedisCache, IRedisOption } from "./redis";
import { LRUCache } from "./lru";

export interface IMRCacheOption extends IMemOption {
  memory: Cache | IMemOption;
  redis: IRedisOption;
}

/** InMemory + Reids 二级缓存 */
export class MRCache<T = any> extends Cache {
  /** l1缓存 InMemory */
  private memory: Cache;
  /** l2缓存 Redis */
  private redis: RedisCache;
  /** Key获取队列 */
  private queue: Record<string, Promise<T | undefined>> = Object.create(null);

  constructor(opt: IMRCacheOption) {
    super();
    this.memory = opt.memory instanceof Cache ? opt.memory : new InMemoryCache(opt.memory);
    this.redis = new RedisCache(opt.redis);
  }

  /**
   * 获取值（InMemory -> Redis）
   * @param key Key
   */
  get(key: string) {
    // 如果已经有方法在执行，直接返回队列结果
    if (this.queue[key]) return this.queue[key];

    // 如果执行队列为空，则生成方法并加入执行队列
    this.queue[key] = this.memory
      .get(key)
      .then(data => {
        // 如果 InMemory 中有数据，直接返回并删除队列
        if (data !== undefined) {
          delete this.queue[key];
          return data;
        }
        // 缓存中没数据，从 Redis 中拿
        return this.redis.get(key);
      })
      .then(res => {
        // 如果队列中有数据则表明是通过执行方法获得的，需要将设置到缓存中
        if (this.queue[key]) {
          delete this.queue[key];
          return this.memory.set(key, res);
        }
        // 上面是从缓存中获得的数据，直接返回
        return res;
      });

    // 返回执行方法
    return this.queue[key];
  }

  /**
   * 设置值（Redis -> InMemory）
   * @param key Key
   * @param data 数据
   */
  set(key: string, data: T) {
    return this.redis.set(key, data).then(() => this.memory.set(key, data));
  }

  /**
   * 删除值（Redis -> InMemory）
   * @param key
   */
  delete(key: string) {
    return this.redis.delete(key).then(() => this.memory.delete(key));
  }
}
