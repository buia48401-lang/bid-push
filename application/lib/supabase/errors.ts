import { ErrorCode } from '@/lib/api/error-codes';
import { ApiError } from '@/lib/api/errors';

/** 网络层失败特征（supabase-js 会把底层 fetch 异常包进 message / details） */
const NETWORK_ERROR_PATTERN =
  /fetch failed|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|ECONNREFUSED/i;

/** PostgREST「关系不存在」错误码（表 / 视图未创建） */
const CODE_RELATION_NOT_FOUND = 'PGRST205';

/** supabase-js 错误的防御式形状探测（PostgrestError 不导出类型） */
type SupabaseErrorLike = {
  message?: unknown;
  details?: unknown;
  hint?: unknown;
  code?: unknown;
};

function isSupabaseErrorLike(value: unknown): value is SupabaseErrorLike {
  return typeof value === 'object' && value !== null;
}

/**
 * 把 supabase-js 查询错误统一翻译为 ApiError：
 * - 网络层失败（fetch failed / ECONNRESET / ETIMEDOUT 等）→ 503 DB_UNAVAILABLE，
 *   提示检查网络与代理（境外 Supabase 实例直连经常被重置）；
 * - 表不存在（PGRST205）→ 500，提示先执行建表 SQL；
 * - 其余 → 500 INTERNAL，携带原始 message 便于定位。
 *
 * 用法：`if (error) { throw toQueryError('表名', error); }`
 * 日志在此统一打印，数据层不必重复 console.error。
 */
export function toQueryError(scope: string, error: unknown): ApiError {
  const err: SupabaseErrorLike = isSupabaseErrorLike(error) ? error : {};
  const message = typeof err.message === 'string' ? err.message : String(error);
  const details = typeof err.details === 'string' ? err.details : '';
  const code = typeof err.code === 'string' ? err.code : '';

  console.error(`[data] 查询 ${scope} 失败`, error);

  if (NETWORK_ERROR_PATTERN.test(message) || NETWORK_ERROR_PATTERN.test(details)) {
    return new ApiError(
      ErrorCode.DB_UNAVAILABLE,
      '数据库连接失败，请检查网络连通性（境外 Supabase 实例通常需要代理）',
    );
  }

  if (code === CODE_RELATION_NOT_FOUND) {
    return new ApiError(
      ErrorCode.INTERNAL,
      `表 ${scope} 不存在，请先执行建表 SQL（见 application/README.md）`,
    );
  }

  return new ApiError(ErrorCode.INTERNAL, `${scope} 查询失败：${message}`);
}
