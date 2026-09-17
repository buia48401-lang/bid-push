import { DEFAULT_MESSAGE_BY_CODE, ErrorCode, type ErrorCodeValue } from '@/lib/api/error-codes';

/** 业务错误：由 withRouteHandler 统一映射为响应信封 */
export class ApiError extends Error {
  readonly code: ErrorCodeValue;

  constructor(code: ErrorCodeValue, message?: string) {
    super(message ?? DEFAULT_MESSAGE_BY_CODE[code]);
    this.name = 'ApiError';
    this.code = code;
  }
}

/**
 * 数据层「契约骨架已就绪、查询体待实现」的统一出口。
 *
 * - 契约没有「未实现」错误码，故统一用 INTERNAL，message 中标注契约章节，便于开发期定位；
 * - 同时把已通过 Zod 校验的入参打到服务端日志（与 traceId 串联），便于确认调用链；
 * - 🔴 实现某个数据函数后必须删掉对应的 unimplemented 调用。
 */
export function unimplemented(contractSection: string, context?: unknown): never {
  if (context !== undefined) {
    console.error(`[data] NOT_IMPLEMENTED ${contractSection}`, JSON.stringify(context));
  }

  throw new ApiError(ErrorCode.INTERNAL, `NOT_IMPLEMENTED: ${contractSection}`);
}
