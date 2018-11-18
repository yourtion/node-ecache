import { Cache } from "./cache";

export interface RedisLike {
  get(key: string): Promise<string | null>;
  set(key: string, value: any, expiryMode?: string | any[], time?: number | string): Promise<string>;
  del(...keys: string[]): Promise<number>;
}

/** 初始化 Redis 引擎参数 */
export interface IRedisOption {
  /** Redis 客户端  */
  client: RedisLike;
  /** 过期时间（秒） */
  ttl?: number;
}

/** Reids 缓存 */
export class RedisCache<T = any> extends Cache {
  /** Redis客户端 */
  private client: RedisLike;

  constructor({ client, ttl = 600 }: IRedisOption) {
    super();
    this.client = client;
    this.ttl = ttl;
  }

  private parseJSON(json: string | null) {
    if (typeof json !== "string") return undefined;
    try {
      return JSON.parse(json);
    } catch (err) {
      return undefined;
    }
  }

  private jsonStringify(data: T) {
    try {
      return JSON.stringify(data) || "null";
    } catch (err) {
      return "null";
    }
  }

  /**
   * 获取值
   * @param key Key
   */
  get(key: string) {
    return this.client.get(key).then(this.parseJSON);
  }

  /**
   * 设置值
   * @param key Key
   * @param data 数据
   * @param ttl TTL（秒）
   */
  set(key: string, data: T, ttl = this.ttl) {
    const text = this.jsonStringify(data);
    return this.client.set(key, text, "EX", ttl);
  }

  /**
   * 删除值
   * @param key
   */
  delete(key: string) {
    return this.client.del(key);
  }
}
