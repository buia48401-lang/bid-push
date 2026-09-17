import { ErrorCode, type ErrorCodeValue } from '@/lib/api/error-codes';
import type { ApiErr, ApiOk } from '@/types/api';

/** 每次请求生成，用于串联服务端日志（api-contract.md §1.1） */
export function newTraceId(): string {
  return crypto.randomUUID();
}

/** 组装成功信封 */
export function ok<T>(data: T, traceId: string): ApiOk<T> {
  return { code: ErrorCode.OK, message: 'ok', data, traceId };
}

/** 组装失败信封：data 恒为 null */
export function fail(code: ErrorCodeValue, message: string, traceId: string): ApiErr {
  return { code, message, data: null, traceId };
}
