export type IFnType<T> = (...args: any[]) => Promise<T>;

/** 存储引擎 */
export default abstract class Store<T = any> {
  /** 获取数据 */
  abstract get(key: string): Promise<T | undefined>;
  /** 设置数据 */
  abstract set(key: string, data: T, ttl: number): Promise<T>;
  /** 删除数据 */
  abstract delete(key: string): void;
  /** 设置数据源获取函数 */
  abstract setData(key: string, fn: IFnType<T>): void;
  /** 通过缓存或数据源获取数据 */
  abstract getData(key: string, ...args: any[]): Promise<T | undefined>;
}
