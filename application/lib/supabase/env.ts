import { ErrorCode } from '@/lib/api/error-codes';
import { ApiError } from '@/lib/api/errors';

/**
 * 读取必填环境变量。
 * 缺失时抛 DB_UNAVAILABLE（映射为 HTTP 503），而不是让 undefined 流进 createClient
 * 造成难以定位的运行时报错。变量清单见 application/.env.example。
 */
export function requiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new ApiError(
      ErrorCode.DB_UNAVAILABLE,
      `缺少环境变量 ${name}，请参考 application/.env.example 完成配置`,
    );
  }

  return value;
}
