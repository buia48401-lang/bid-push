/**
 * 错误码表 —— 唯一事实源为 docs/api-contract.md §1.2。
 * 🔴 契约约定「变更需先改 api-contract.md 并经人确认」，因此禁止在此擅自新增错误码。
 */

export const ErrorCode = {
  OK: 0,
  INVALID_PARAM: 400,
  NOT_FOUND: 404,
  INTERNAL: 500,
  DB_UNAVAILABLE: 503,
} as const;

export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode];

/** 业务 code → HTTP 状态码。单独声明以便将来二者解耦。 */
export const HTTP_STATUS_BY_CODE: Record<ErrorCodeValue, number> = {
  [ErrorCode.OK]: 200,
  [ErrorCode.INVALID_PARAM]: 400,
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.INTERNAL]: 500,
  [ErrorCode.DB_UNAVAILABLE]: 503,
};

/** 默认提示语；响应体不得携带堆栈等内部细节 */
export const DEFAULT_MESSAGE_BY_CODE: Record<ErrorCodeValue, string> = {
  [ErrorCode.OK]: 'ok',
  [ErrorCode.INVALID_PARAM]: '请求参数不合法',
  [ErrorCode.NOT_FOUND]: '资源不存在',
  [ErrorCode.INTERNAL]: '服务内部错误',
  [ErrorCode.DB_UNAVAILABLE]: '数据库暂不可用，请稍后重试',
};
