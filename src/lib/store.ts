export type IFnType<T> = (...args: any[]) => Promise<T>;

/** 存储引擎 */
export default abstract class Store<T = any> {
  /** 默认缓存时间 */
  protected ttl: number = 0;
  /** 方法队列 */
  private fnQueue: Record<string, Promise<T | undefined>> = Object.create(null);
  /** 获取数据方法 */
  private fns: Record<string, IFnType<T>> = Object.create(null);

  /** 获取数据 */
  abstract get(key: string): Promise<T | undefined>;
  /** 设置数据 */
  abstract set(key: string, data: T, ttl: number): Promise<T>;
  /** 删除数据 */
  abstract delete(key: string): void;
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
   * @param key 获取数据Key
   * @param args 获取数据参数
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
          return this.set(cacheKey, res, this.ttl);
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
