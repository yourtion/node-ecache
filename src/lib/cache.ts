export type IFnType<T> = (...args: any[]) => Promise<T>;

/** 存储引擎 */
export abstract class Cache<T = any> {
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

    // 通过方法Key+参数，生成缓存的Key
    const cacheKey = args.length > 0 ? key + JSON.stringify(args) : key;

    // 如果已经有方法在执行，直接返回队列结果
    if (this.fnQueue[cacheKey]) return this.fnQueue[cacheKey];

    // 如果执行队列为空，则生成方法并加入执行队列
    this.fnQueue[cacheKey] = this.get(cacheKey)
      .then(data => {
        // 如果缓存中有数据，直接返回并删除队列
        if (data !== undefined) {
          delete this.fnQueue[cacheKey];
          return data;
        }
        // 缓存中没数据，执行获取数据方法
        return fn(...args);
      })
      .then(res => {
        // 如果队列中有数据则表明是通过执行方法获得的，需要将设置到缓存中
        if (this.fnQueue[cacheKey]) {
          delete this.fnQueue[cacheKey];
          return this.set(cacheKey, res, this.ttl);
        }
        // 上面是从缓存中获得的数据，直接返回
        return res;
      });

    // 返回执行方法
    return this.fnQueue[cacheKey];
  }

}
