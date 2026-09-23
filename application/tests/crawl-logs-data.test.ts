import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

import { ApiError } from '@/lib/api/errors';
import { ErrorCode } from '@/lib/api/error-codes';
import { listCrawlLogs } from '@/lib/data/crawl-logs';

/**
 * 抓取日志数据层查询语义测试（契约 §3.7 实现约束）。
 *
 * listCrawlLogs 并行发起 2 次查询：列表 1 次 + 今日概况 1 次（count + sum 聚合）。
 * mockImplementationOnce 按调用顺序注入：list → today summary。
 */

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));

vi.mock('@/lib/supabase/server', () => ({
  getServerClient: () => ({ from: fromMock }) as unknown as SupabaseClient,
}));

type ChainOptions = {
  data: unknown;
  error: { message: string } | null;
  count?: number | null;
};

type CallLog = Map<string, unknown[][]>;

/** 可链式调用、可 await 的查询构造器 mock，记录每个方法的调用参数 */
function createChain(options: ChainOptions) {
  const calls: CallLog = new Map();
  const chain: Record<string, unknown> = {};

  const record = (method: string) => (...args: unknown[]) => {
    const list = calls.get(method) ?? [];
    list.push(args);
    calls.set(method, list);

    return chain;
  };

  for (const method of ['select', 'eq', 'gte', 'lt', 'order', 'range']) {
    chain[method] = record(method);
  }

  chain.then = (
    resolve?: (value: { data: unknown; error: unknown; count: number | null }) => unknown,
    reject?: (reason: unknown) => unknown,
  ) =>
    Promise.resolve({
      data: options.data,
      error: options.error,
      count: options.count ?? null,
    }).then(resolve, reject);

  return { chain, calls };
}

function firstArgs(calls: CallLog, method: string): unknown[] | undefined {
  return calls.get(method)?.[0];
}

const CRAWL_LOG_COLUMNS = 'id,run_at,source_site,site_level,total,success,failed,manual,note';

const LIST_ROW = {
  id: 31,
  run_at: '2026-09-17T09:00:00+08:00',
  source_site: '中国政府采购网',
  site_level: 'A级',
  total: 120,
  success: 118,
  failed: 1,
  manual: 1,
  note: '例行采集',
};

const DAY_BOUNDARY_PATTERN = /^\d{4}-\d{2}-\d{2}T00:00:00\+08:00$/;

beforeEach(() => {
  fromMock.mockReset();
});

describe('listCrawlLogs（契约 §3.7）', () => {
  it('显式列、排序 run_at DESC + id DESC、range 下推，今日概况同响应返回', async () => {
    const listChain = createChain({ data: [LIST_ROW], error: null, count: 640 });
    const summaryChain = createChain({
      data: [{ total: 500 }, { total: 734 }],
      error: null,
      count: 2,
    });

    fromMock
      .mockImplementationOnce(() => listChain.chain)
      .mockImplementationOnce(() => summaryChain.chain);

    const result = await listCrawlLogs({ sourceSite: undefined, page: 1, pageSize: 20 });

    // 列表查询：显式列（禁止 select('*')），默认无过滤
    expect(firstArgs(listChain.calls, 'select')).toEqual([CRAWL_LOG_COLUMNS, { count: 'exact' }]);
    expect(listChain.calls.has('eq')).toBe(false);
    expect(listChain.calls.get('order')).toEqual([
      ['run_at', { ascending: false, nullsFirst: false }],
      ['id', { ascending: false }],
    ]);
    expect(firstArgs(listChain.calls, 'range')).toEqual([0, 19]);

    // 今日概况：total 单列 + exact count（PostgREST 禁用聚合函数，求和由应用层完成），今日边界
    expect(firstArgs(summaryChain.calls, 'select')?.[0]).toBe('total');
    expect(firstArgs(summaryChain.calls, 'select')?.[1]).toEqual({ count: 'exact' });
    expect(firstArgs(summaryChain.calls, 'gte')).toEqual([
      'run_at',
      expect.stringMatching(DAY_BOUNDARY_PATTERN),
    ]);
    expect(firstArgs(summaryChain.calls, 'lt')).toEqual([
      'run_at',
      expect.stringMatching(DAY_BOUNDARY_PATTERN),
    ]);
    expect(firstArgs(summaryChain.calls, 'range')).toEqual([0, 999]);

    // 列表映射（camelCase + numeric 容错）
    expect(result.list[0]).toMatchObject({
      id: 31,
      sourceSite: '中国政府采购网',
      siteLevel: 'A级',
      total: 120,
      success: 118,
      failed: 1,
      manual: 1,
      note: '例行采集',
    });
    expect(result.total).toBe(640);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);

    // 今日概况合并：2 轮、累计 1234 条（字符串 numeric 归一为数字）
    expect(result.todayRounds).toBe(2);
    expect(result.todayTotal).toBe(1234);
  });

  it('sourceSite 非空时精确过滤下推', async () => {
    const listChain = createChain({ data: [], error: null, count: 0 });
    const summaryChain = createChain({ data: [], error: null, count: 0 });

    fromMock
      .mockImplementationOnce(() => listChain.chain)
      .mockImplementationOnce(() => summaryChain.chain);

    await listCrawlLogs({ sourceSite: '中国政府采购网', page: 2, pageSize: 20 });

    expect(firstArgs(listChain.calls, 'eq')).toEqual(['source_site', '中国政府采购网']);
    expect(firstArgs(listChain.calls, 'range')).toEqual([20, 39]);
  });

  it('今日无记录时轮次与累计均为 0', async () => {
    const listChain = createChain({ data: [], error: null, count: 0 });
    const summaryChain = createChain({ data: [], error: null, count: 0 });

    fromMock
      .mockImplementationOnce(() => listChain.chain)
      .mockImplementationOnce(() => summaryChain.chain);

    const result = await listCrawlLogs({ sourceSite: undefined, page: 1, pageSize: 20 });

    expect(result.todayRounds).toBe(0);
    expect(result.todayTotal).toBe(0);
  });

  it('今日行数超过单批上限（1000）时循环分批求和，轮次以 exact count 为准', async () => {
    const listChain = createChain({ data: [], error: null, count: 0 });
    // 第一批 1000 行（触发继续分批），第二批 2 行（不足一批即结束）
    const firstBatch = createChain({
      data: Array.from({ length: 1000 }, () => ({ total: 1 })),
      error: null,
      count: 1002,
    });
    const secondBatch = createChain({ data: [{ total: 1 }, { total: 1 }], error: null, count: 1002 });

    fromMock
      .mockImplementationOnce(() => listChain.chain)
      .mockImplementationOnce(() => firstBatch.chain)
      .mockImplementationOnce(() => secondBatch.chain);

    const result = await listCrawlLogs({ sourceSite: undefined, page: 1, pageSize: 20 });

    expect(firstArgs(firstBatch.calls, 'range')).toEqual([0, 999]);
    expect(firstArgs(secondBatch.calls, 'range')).toEqual([1000, 1999]);
    expect(result.todayRounds).toBe(1002);
    expect(result.todayTotal).toBe(1002);
  });

  it('列表查询失败映射为 503 DB_UNAVAILABLE', async () => {
    fromMock
      .mockImplementationOnce(() => createChain({ data: null, error: { message: 'timeout' } }).chain)
      .mockImplementationOnce(() => createChain({ data: [], error: null, count: 0 }).chain);

    // 单次调用捕获后断言（Once 队列仅够一次查询，不能重复调用）
    const error = await listCrawlLogs({ sourceSite: undefined, page: 1, pageSize: 20 }).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: ErrorCode.DB_UNAVAILABLE });
  });

  it('今日概况查询失败同样映射为 503', async () => {
    fromMock
      .mockImplementationOnce(() => createChain({ data: [], error: null, count: 0 }).chain)
      .mockImplementationOnce(
        () => createChain({ data: null, error: { message: 'connection refused' } }).chain,
      );

    await expect(
      listCrawlLogs({ sourceSite: undefined, page: 1, pageSize: 20 }),
    ).rejects.toMatchObject({ code: ErrorCode.DB_UNAVAILABLE });
  });
});
