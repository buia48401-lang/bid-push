import { describe, expect, it } from 'vitest';

import { DEFAULT_MESSAGE_BY_CODE, ErrorCode, HTTP_STATUS_BY_CODE } from '@/lib/api/error-codes';
import { ApiError, unimplemented } from '@/lib/api/errors';
import { fail, newTraceId, ok } from '@/lib/api/response';

describe('统一响应信封（api-contract.md §1.1）', () => {
  it('ok() 固定 code=0 / message=ok，并原样透传 data', () => {
    const traceId = newTraceId();

    expect(ok({ list: [], total: 0, page: 1, pageSize: 20 }, traceId)).toEqual({
      code: 0,
      message: 'ok',
      data: { list: [], total: 0, page: 1, pageSize: 20 },
      traceId,
    });
  });

  it('fail() 的 data 恒为 null，message 携带定位信息', () => {
    expect(fail(ErrorCode.INVALID_PARAM, 'page: page 必须 ≥ 1', 'trace-1')).toEqual({
      code: 400,
      message: 'page: page 必须 ≥ 1',
      data: null,
      traceId: 'trace-1',
    });
  });

  it('newTraceId() 每次返回不同的非空串', () => {
    const first = newTraceId();
    const second = newTraceId();

    expect(first).not.toBe('');
    expect(first).not.toBe(second);
  });
});

describe('错误码表（api-contract.md §1.2）', () => {
  it('只包含契约定义的 5 个码，禁止擅自新增', () => {
    expect(Object.values(ErrorCode)).toEqual([0, 400, 404, 500, 503]);
  });

  it('业务 code 映射到对应 HTTP 状态码（成功为 200，其余与 code 一致）', () => {
    for (const code of Object.values(ErrorCode)) {
      expect(HTTP_STATUS_BY_CODE[code]).toBe(code === ErrorCode.OK ? 200 : code);
    }
  });

  it('ApiError 缺省 message 取自错误码表', () => {
    const error = new ApiError(ErrorCode.DB_UNAVAILABLE);

    expect(error.code).toBe(503);
    expect(error.message).toBe(DEFAULT_MESSAGE_BY_CODE[ErrorCode.DB_UNAVAILABLE]);
    expect(error.name).toBe('ApiError');
  });
});

describe('unimplemented()（数据层 TODO 出口）', () => {
  it('抛 INTERNAL 并在 message 中标注契约章节，不引入契约外错误码', () => {
    expect(() => unimplemented('api-contract.md §3.1')).toThrowError(
      expect.objectContaining({ code: ErrorCode.INTERNAL, message: 'NOT_IMPLEMENTED: api-contract.md §3.1' }),
    );
  });
});
