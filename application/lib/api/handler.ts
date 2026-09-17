import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';

import {
  DEFAULT_MESSAGE_BY_CODE,
  ErrorCode,
  HTTP_STATUS_BY_CODE,
  type ErrorCodeValue,
} from '@/lib/api/error-codes';
import { ApiError } from '@/lib/api/errors';
import { fail, newTraceId, ok } from '@/lib/api/response';

export type RouteContext<TParams> = {
  /** 本次请求的追踪 id，与响应体、服务端日志一致 */
  traceId: string;
  searchParams: URLSearchParams;
  /** 动态段参数（已 await），无动态段时为空对象 */
  params: TParams;
};

type RouteHandler<TParams> = (
  request: NextRequest,
  context: RouteContext<TParams>,
) => Promise<unknown>;

/**
 * Next.js 生成的 RouteContext 形状：params 为**必填**字段。
 * 这里独立声明一份，避免直接依赖 `.next/types` 内部类型；
 * 无动态段的路由同样会收到 `{ params: Promise<{}> }`，故不做可选处理。
 */
type NextRouteContext<TParams> = { params: Promise<TParams> };

/**
 * 所有 Route Handler 的唯一入口。
 * 固化四件事：traceId 生成 → 参数校验异常映射 → 调用业务 → 包统一信封。
 * 契约外的异常一律降级为 500，且响应体不返回堆栈。
 */
export function withRouteHandler<TParams = Record<string, string>>(handler: RouteHandler<TParams>) {
  return async (
    request: NextRequest,
    routeContext: NextRouteContext<TParams>,
  ): Promise<NextResponse> => {
    const traceId = newTraceId();

    try {
      const params = await routeContext.params;

      const data = await handler(request, {
        traceId,
        searchParams: request.nextUrl.searchParams,
        params,
      });

      return NextResponse.json(ok(data, traceId), { status: HTTP_STATUS_BY_CODE[ErrorCode.OK] });
    } catch (error) {
      const { code, message } = normalizeError(error, traceId);
      return NextResponse.json(fail(code, message, traceId), { status: HTTP_STATUS_BY_CODE[code] });
    }
  };
}

function normalizeError(
  error: unknown,
  traceId: string,
): { code: ErrorCodeValue; message: string } {
  if (error instanceof ZodError) {
    // Zod 校验失败：message 携带首个字段错误（api-contract.md §1.2）
    return { code: ErrorCode.INVALID_PARAM, message: firstIssueMessage(error) };
  }

  if (error instanceof SyntaxError) {
    // JSON.parse 失败，即请求体不是合法 JSON
    return { code: ErrorCode.INVALID_PARAM, message: '请求体不是合法的 JSON' };
  }

  if (error instanceof ApiError) {
    console.error(`[api] traceId=${traceId} code=${error.code} message=${error.message}`);
    return { code: error.code, message: error.message };
  }

  console.error(`[api] traceId=${traceId} 未预期异常`, error);
  return {
    code: ErrorCode.INTERNAL,
    message: DEFAULT_MESSAGE_BY_CODE[ErrorCode.INTERNAL],
  };
}

function firstIssueMessage(error: ZodError): string {
  const issue = error.issues[0];

  if (!issue) {
    return DEFAULT_MESSAGE_BY_CODE[ErrorCode.INVALID_PARAM];
  }

  const path = issue.path.join('.');

  return path ? `${path}: ${issue.message}` : issue.message;
}
