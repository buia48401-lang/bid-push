import { describe, expect, it } from 'vitest';

import { ErrorCode } from '@/lib/api/error-codes';
import { toQueryError } from '@/lib/supabase/errors';

describe('toQueryError（Supabase 错误统一翻译）', () => {
  it('网络层失败（fetch failed + ECONNRESET）→ 503 DB_UNAVAILABLE', () => {
    const error = toQueryError('demo_item', {
      message: 'TypeError: fetch failed',
      details: 'TypeError: fetch failed\n\nCaused by: Error: read ECONNRESET (ECONNRESET)',
      hint: '',
      code: '',
    });

    expect(error.code).toBe(ErrorCode.DB_UNAVAILABLE);
    expect(error.message).toContain('网络');
  });

  it('超时 / 域名解析失败 / 拒绝连接同样归为 503', () => {
    for (const message of ['Error: ETIMEDOUT', 'Error: ENOTFOUND', 'Error: ECONNREFUSED']) {
      expect(toQueryError('demo_item', { message, code: '' }).code).toBe(ErrorCode.DB_UNAVAILABLE);
    }
  });

  it('表不存在（PGRST205）→ 500，提示先执行建表 SQL', () => {
    const error = toQueryError('demo_item', {
      message: "Could not find the table 'public.demo_item' in the schema cache",
      details: null,
      hint: null,
      code: 'PGRST205',
    });

    expect(error.code).toBe(ErrorCode.INTERNAL);
    expect(error.message).toContain('建表 SQL');
  });

  it('其余数据库错误 → 500 并携带原始 message', () => {
    const error = toQueryError('demo_item', {
      message: 'permission denied for table demo_item',
      code: '42501',
    });

    expect(error.code).toBe(ErrorCode.INTERNAL);
    expect(error.message).toContain('permission denied');
  });

  it('非对象错误（字符串 / null）安全翻译为 500，不抛错', () => {
    expect(toQueryError('demo_item', 'boom').code).toBe(ErrorCode.INTERNAL);
    expect(toQueryError('demo_item', null).code).toBe(ErrorCode.INTERNAL);
  });
});
