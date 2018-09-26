import Store from "./store";

export interface RedisLike {
  get(key: string): Promise<string>;
  set(key: string, value: any, expiryMode?: string | any[], time?: number | string): Promise<string>;
  del(...keys: string[]): Promise<string>;
}

/** 初始化 Redis 引擎参数 */
export interface IRedisOption {
  /** Redis 客户端  */
  client: RedisLike;
  /** 过期时间（秒） */
  ttl?: number;
}

export default class RedisStore<T = any> extends Store {
  private client: RedisLike;
  /**
   * @param {Object} options
   */
  constructor({ client, ttl = 600 }: IRedisOption) {
    super();
    this.client = client;
    this.ttl = ttl;
  }

  private parseJSON(json: string) {
    if (typeof json !== "string") return null;
    try {
      return JSON.parse(json);
    } catch (err) {
      return null;
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
