import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

import { ApiError } from '@/lib/api/errors';
import { ErrorCode } from '@/lib/api/error-codes';
import { listPushLogs } from '@/lib/data/push-logs';

/**
 * 推送记录数据层查询语义测试（契约 §3.6 实现约束）。
 *
 * listPushLogs 并行发起 4 次查询：列表 1 次（嵌套 select）+ 今日统计 3 次（head count）。
 * mockImplementationOnce 按调用顺序注入：list → stats total → stats success → stats failed。
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

const LIST_ROW = {
  id: 21,
  subscription_id: 5,
  announce_id: 11,
  channel: 'feishu_webhook',
  status: '失败',
  sent_at: null,
  error_message: 'webhook 响应 502',
  created_at: '2026-09-17T10:00:00+08:00',
  subscription: { name: '广东智慧城市项目' },
  announce: { title: '广州市智慧城市大数据中心平台建设项目招标公告' },
};

const DAY_BOUNDARY_PATTERN = /^\d{4}-\d{2}-\d{2}T00:00:00\+08:00$/;

const EMPTY_STATS_CHAINS = (): ReturnType<typeof createChain>[] => [
  createChain({ data: [], error: null, count: 0 }),
  createChain({ data: [], error: null, count: 0 }),
  createChain({ data: [], error: null, count: 0 }),
];

type Chain = ReturnType<typeof createChain>;

/** 按实现中的调用顺序排队：list → stats total → stats success → stats failed */
function queueChains(listChain: Chain, ...statsChains: Chain[]): void {
  fromMock.mockImplementationOnce(() => listChain.chain);

  for (const statsChain of statsChains) {
    fromMock.mockImplementationOnce(() => statsChain.chain);
  }
}

beforeEach(() => {
  fromMock.mockReset();
});

describe('listPushLogs（契约 §3.6）', () => {
  it('嵌套 select 列、排序三键、range 下推，stats 同响应返回', async () => {
    const listChain = createChain({ data: [LIST_ROW], error: null, count: 1248 });
    const totalChain = createChain({ data: [], error: null, count: 10 });
    const successChain = createChain({ data: [], error: null, count: 8 });
    const failedChain = createChain({ data: [], error: null, count: 2 });
    queueChains(listChain, totalChain, successChain, failedChain);

    const result = await listPushLogs({ status: undefined, page: 1, pageSize: 20 });

    // 列表查询：显式列 + 嵌套关联（禁止 N+1）
    const selectArg = String(firstArgs(listChain.calls, 'select')?.[0]);
    expect(selectArg).toContain('subscription:bid_subscription(name)');
    expect(selectArg).toContain('announce:bid_announce(title)');
    expect(selectArg).toContain('error_message');
    expect(firstArgs(listChain.calls, 'select')?.[1]).toEqual({ count: 'exact' });
    expect(listChain.calls.get('order')).toEqual([
      ['sent_at', { ascending: false, nullsFirst: false }],
      ['created_at', { ascending: false }],
      ['id', { ascending: false }],
    ]);
    expect(firstArgs(listChain.calls, 'range')).toEqual([0, 19]);
    // 默认不筛选状态
    expect(listChain.calls.has('eq')).toBe(false);

    // 统计查询：created_at 落在业务时区今日边界，成功 / 失败按 status 精确计数
    for (const chain of [totalChain, successChain, failedChain]) {
      expect(firstArgs(chain.calls, 'select')?.[0]).toBe('id');
      expect(firstArgs(chain.calls, 'select')?.[1]).toEqual({ count: 'exact', head: true });
      expect(firstArgs(chain.calls, 'gte')).toEqual([
        'created_at',
        expect.stringMatching(DAY_BOUNDARY_PATTERN),
      ]);
      expect(firstArgs(chain.calls, 'lt')).toEqual([
        'created_at',
        expect.stringMatching(DAY_BOUNDARY_PATTERN),
      ]);
    }
    expect(firstArgs(successChain.calls, 'eq')).toEqual(['status', '成功']);
    expect(firstArgs(failedChain.calls, 'eq')).toEqual(['status', '失败']);

    // 列表映射（失败记录 sentAt 为 null，名称来自嵌套关联）
    expect(result.list[0]).toMatchObject({
      id: 21,
      subscriptionName: '广东智慧城市项目',
      announceTitle: '广州市智慧城市大数据中心平台建设项目招标公告',
      status: '失败',
      errorMessage: 'webhook 响应 502',
      sentAt: null,
    });
    expect(result.total).toBe(1248);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);

    // 今日统计与成功率（8 / 10 → 80）
    expect(result.stats).toEqual({
      todayTotal: 10,
      todaySuccess: 8,
      todayFailed: 2,
      successRate: 80,
    });
  });

  it('status 非空时精确过滤下推，翻页 range 随之偏移', async () => {
    const listChain = createChain({ data: [], error: null, count: 0 });
    queueChains(listChain, ...EMPTY_STATS_CHAINS());

    await listPushLogs({ status: '成功', page: 2, pageSize: 20 });

    expect(firstArgs(listChain.calls, 'eq')).toEqual(['status', '成功']);
    expect(firstArgs(listChain.calls, 'range')).toEqual([20, 39]);
  });

  it('无今日数据时 successRate 为 0（不出现 NaN）', async () => {
    const listChain = createChain({ data: [], error: null, count: 0 });
    queueChains(listChain, ...EMPTY_STATS_CHAINS());

    const result = await listPushLogs({ status: undefined, page: 1, pageSize: 20 });

    expect(result.stats).toEqual({
      todayTotal: 0,
      todaySuccess: 0,
      todayFailed: 0,
      successRate: 0,
    });
  });

  it('列表查询失败映射为 503 DB_UNAVAILABLE', async () => {
    queueChains(
      createChain({ data: null, error: { message: 'timeout' } }),
      ...EMPTY_STATS_CHAINS(),
    );

    // 单次调用捕获后断言（Once 队列仅够一次查询，不能重复调用）
    const error = await listPushLogs({ status: undefined, page: 1, pageSize: 20 }).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: ErrorCode.DB_UNAVAILABLE });
  });

  it('统计查询失败同样映射为 503', async () => {
    queueChains(
      createChain({ data: [], error: null, count: 0 }),
      createChain({ data: [], error: null, count: 0 }),
      createChain({ data: null, error: { message: 'connection refused' } }),
      createChain({ data: [], error: null, count: 0 }),
    );

    await expect(listPushLogs({ status: undefined, page: 1, pageSize: 20 })).rejects.toMatchObject({
      code: ErrorCode.DB_UNAVAILABLE,
    });
  });
});
