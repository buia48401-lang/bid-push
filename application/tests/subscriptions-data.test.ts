import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

import { ErrorCode } from '@/lib/api/error-codes';
import { createSubscription, listSubscriptions, updateSubscription } from '@/lib/data/subscriptions';

/**
 * 订阅数据层查询语义测试（契约 §3.3 / §3.4 / §3.5 实现约束）。
 *
 * 订阅走 getAdminClient()（service_role，bid_subscription 不对 anon 开放）。
 * 通过 mock 客户端记录链式调用参数，断言：显式列名、排序下推、
 * 错误码映射（读 503 / 写 500 / 不存在 404）。
 */

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));

vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: () => ({ from: fromMock }) as unknown as SupabaseClient,
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

  for (const method of ['select', 'eq', 'order', 'insert', 'update']) {
    chain[method] = record(method);
  }

  chain.single = async () => ({ data: options.data, error: options.error });

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

function mockFrom(chains: Record<string, unknown>): void {
  fromMock.mockImplementation((table: string) => chains[table]);
}

function firstArgs(calls: CallLog, method: string): unknown[] | undefined {
  return calls.get(method)?.[0];
}

const SUBSCRIPTION_COLUMNS =
  'id,name,keyword,region,announce_type,channel,webhook_url,enabled,created_at,updated_at';

const ROW_ENABLED = {
  id: 5,
  name: '广东智慧城市项目',
  keyword: '智慧城市',
  region: '广东',
  announce_type: '招标公告',
  channel: 'feishu_webhook',
  webhook_url: 'https://open.feishu.cn/open-apis/bot/v2/hook/abc123',
  enabled: true,
  created_at: '2026-09-01T08:00:00+08:00',
  updated_at: '2026-09-16T10:00:00+08:00',
};

const ROW_DISABLED = {
  ...ROW_ENABLED,
  id: 3,
  name: '邮件测试订阅',
  channel: 'email',
  enabled: false,
};

const UPSERT_INPUT = {
  name: '新订阅',
  keyword: '数据中心',
  region: '广东',
  announceType: '招标公告',
  channel: 'feishu_webhook' as const,
  webhookUrl: 'https://open.feishu.cn/open-apis/bot/v2/hook/xyz789',
  enabled: true,
};

beforeEach(() => {
  fromMock.mockReset();
});

describe('listSubscriptions（契约 §3.3）', () => {
  it('只取契约列，排序 enabled DESC + updated_at DESC，不分页', async () => {
    const { chain, calls } = createChain({ data: [ROW_ENABLED, ROW_DISABLED], error: null });
    mockFrom({ bid_subscription: chain });

    const result = await listSubscriptions();

    expect(firstArgs(calls, 'select')).toEqual([SUBSCRIPTION_COLUMNS]);
    // 订阅量小不分页：不出现 range 调用
    expect(calls.has('range')).toBe(false);
    expect(calls.has('eq')).toBe(false);
    expect(calls.get('order')).toEqual([
      ['enabled', { ascending: false }],
      ['updated_at', { ascending: false }],
    ]);

    expect(result.total).toBe(2);
    expect(result.enabledCount).toBe(1);
    expect(result.list[0]).toMatchObject({
      id: 5,
      name: '广东智慧城市项目',
      announceType: '招标公告',
      webhookUrl: 'https://open.feishu.cn/open-apis/bot/v2/hook/abc123',
      enabled: true,
    });
    expect(result.list[1].enabled).toBe(false);
  });

  it('数据库错误映射为 503 DB_UNAVAILABLE', async () => {
    const { chain } = createChain({ data: null, error: { message: 'connection refused' } });
    mockFrom({ bid_subscription: chain });

    await expect(listSubscriptions()).rejects.toMatchObject({
      code: ErrorCode.DB_UNAVAILABLE,
    });
  });
});

describe('createSubscription（契约 §3.4）', () => {
  it('INSERT 载荷为 snake_case 全量字段，并经 .select(id).single() 取回新 id', async () => {
    const { chain, calls } = createChain({ data: { id: 7 }, error: null });
    mockFrom({ bid_subscription: chain });

    const result = await createSubscription(UPSERT_INPUT);

    expect(fromMock).toHaveBeenCalledWith('bid_subscription');
    expect(firstArgs(calls, 'insert')).toEqual([
      {
        name: '新订阅',
        keyword: '数据中心',
        region: '广东',
        announce_type: '招标公告',
        channel: 'feishu_webhook',
        webhook_url: 'https://open.feishu.cn/open-apis/bot/v2/hook/xyz789',
        enabled: true,
      },
    ]);
    expect(firstArgs(calls, 'select')).toEqual(['id']);
    expect(result).toEqual({ id: 7 });
  });

  it('写入失败映射为 500 INTERNAL（契约 §3.4，与读路径 503 区分）', async () => {
    const { chain } = createChain({ data: null, error: { message: 'duplicate key' } });
    mockFrom({ bid_subscription: chain });

    await expect(createSubscription(UPSERT_INPUT)).rejects.toMatchObject({
      code: ErrorCode.INTERNAL,
    });
  });
});

describe('updateSubscription（契约 §3.5）', () => {
  it('UPDATE 全量载荷 + eq(id)，返回被更新的 id', async () => {
    const { chain, calls } = createChain({ data: [{ id: 5 }], error: null });
    mockFrom({ bid_subscription: chain });

    const result = await updateSubscription(5, UPSERT_INPUT);

    expect(firstArgs(calls, 'update')).toEqual([
      {
        name: '新订阅',
        keyword: '数据中心',
        region: '广东',
        announce_type: '招标公告',
        channel: 'feishu_webhook',
        webhook_url: 'https://open.feishu.cn/open-apis/bot/v2/hook/xyz789',
        enabled: true,
      },
    ]);
    expect(firstArgs(calls, 'eq')).toEqual(['id', 5]);
    expect(firstArgs(calls, 'select')).toEqual(['id']);
    expect(result).toEqual({ id: 5 });
  });

  it('UPDATE 不存在的 id（affectedRows 为 0）→ 404 NOT_FOUND', async () => {
    const { chain } = createChain({ data: [], error: null });
    mockFrom({ bid_subscription: chain });

    await expect(updateSubscription(999, UPSERT_INPUT)).rejects.toMatchObject({
      code: ErrorCode.NOT_FOUND,
    });
  });

  it('UPDATE 失败映射为 500 INTERNAL', async () => {
    const { chain } = createChain({ data: null, error: { message: 'constraint violation' } });
    mockFrom({ bid_subscription: chain });

    await expect(updateSubscription(5, UPSERT_INPUT)).rejects.toMatchObject({
      code: ErrorCode.INTERNAL,
    });
  });
});
