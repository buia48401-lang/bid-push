/**
 * 接口通用结构 —— 唯一事实源 docs/api-contract.md §1.1 / §1.3。
 * 🔴 变更本文件前必须先改 api-contract.md 并经人确认。
 */

/** 成功信封：code 恒为 0，message 恒为 'ok' */
export type ApiOk<T> = { code: 0; message: 'ok'; data: T; traceId: string };

/** 失败信封：data 恒为 null */
export type ApiErr = { code: number; message: string; data: null; traceId: string };

export type ApiResult<T> = ApiOk<T> | ApiErr;

/** 列表接口 data 的统一结构 */
export type PageResult<T> = {
  list: T[];
  /** 总条数（数据库层 count，禁止拉全表回应用层统计） */
  total: number;
  /** 从 1 开始 */
  page: number;
  /** 默认 20 */
  pageSize: number;
};
