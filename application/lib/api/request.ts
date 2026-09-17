import type { NextRequest } from 'next/server';

import { ErrorCode } from '@/lib/api/error-codes';
import { ApiError } from '@/lib/api/errors';

/**
 * 读取并解析 JSON 请求体。
 * 空体主动抛 INVALID_PARAM；非法 JSON 由 JSON.parse 抛 SyntaxError，
 * 再由 withRouteHandler 统一映射为 400 INVALID_PARAM。
 */
export async function readJsonBody(request: NextRequest): Promise<unknown> {
  const raw = await request.text();

  if (raw.trim() === '') {
    throw new ApiError(ErrorCode.INVALID_PARAM, '请求体不能为空');
  }

  return JSON.parse(raw);
}

/** 把 URLSearchParams 转成普通对象，交给 Zod 校验 */
export function toQueryObject(searchParams: URLSearchParams): Record<string, string> {
  return Object.fromEntries(searchParams.entries());
}
