import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

import { ApiError } from '@/lib/api/errors';
import { ErrorCode } from '@/lib/api/error-codes';
import { getAnnounceById, listAnnounces } from '@/lib/data/announces';

/**
 * 数据层查询语义测试（契约 §3.1 / §3.2 实现约束）。
 *
 * 通过 mock Supabase 客户端记录链式调用参数，断言：
 * 分页 / 过滤 / 排序是否下推数据库、列名是否显式、错误是否映射为约定错误码。
 */

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));

vi.mock('@/lib/supabase/server', () => ({
  // 数据层只使用 .from()，mock 最小面即可
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

  for (const method of ['select', 'ilike', 'eq', 'gte', 'lt', 'order', 'range']) {
    chain[method] = record(method);
  }

  chain.maybeSingle = async () => ({ data: options.data, error: options.error });

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

const EMPTY_QUERY = {
  keyword: undefined,
  region: undefined,
  announceType: undefined,
  sourceSite: undefined,
  startDate: undefined,
  endDate: undefined,
  page: 1,
  pageSize: 20,
};

const LIST_ROW = {
  id: 11,
  title: '广州市智慧城市大数据中心平台建设项目招标公告',
  announce_type: '招标公告',
  purchaser: '广州市政数局',
  region: '广东广州',
  budget: '35000000.00',
  publish_date: '2026-09-15T09:30:00+08:00',
  source_site: '中国政府采购网',
  crawl_status: '已入库',
};

const ANNOUNCE_ROW = {
  ...LIST_ROW,
  announce_no: 'GZ-2026-0915',
  detail_url: 'https://example.com/detail/11',
  remark: '',
};

const DETAIL_ROW = {
  content_text: '一、项目概况……'.repeat(200),
  structured: { contact_person: '张工', contact_phone: '020-88888888' },
  crawled_at: '2026-09-16T01:00:00+08:00',
};

beforeEach(() => {
  fromMock.mockReset();
});

describe('listAnnounces（契约 §3.1）', () => {
  it('默认分页：range / count / 排序正确下推，映射为 camelCase', async () => {
    const { chain, calls } = createChain({ data: [LIST_ROW], error: null, count: 1248 });
    mockFrom({ bid_announce: chain });

    const result = await listAnnounces({ ...EMPTY_QUERY });

    expect(firstArgs(calls, 'select')).toEqual([
      'id,title,announce_type,purchaser,region,budget,publish_date,source_site,crawl_status',
      { count: 'exact' },
    ]);
    // 列表不返回正文大字段
    expect(String(firstArgs(calls, 'select')?.[0])).not.toContain('content_text');
    expect(firstArgs(calls, 'range')).toEqual([0, 19]);
    expect(calls.get('order')).toEqual([
      ['publish_date', { ascending: false, nullsFirst: false }],
      ['id', { ascending: false }],
    ]);
    // 无过滤条件时不产生过滤调用
    expect(calls.has('ilike')).toBe(false);
    expect(calls.has('eq')).toBe(false);
    expect(calls.has('gte')).toBe(false);
    expect(calls.has('lt')).toBe(false);

    expect(result.total).toBe(1248);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
    expect(result.list[0]).toMatchObject({
      id: 11,
      announceType: '招标公告',
      budget: 35000000,
      publishDate: '2026-09-15T01:30:00.000Z',
    });
  });

  it('过滤条件下推：ilike / eq / 闭区间（endDate 含当日）', async () => {
    const { chain, calls } = createChain({ data: [], error: null, count: 0 });
    mockFrom({ bid_announce: chain });

    await listAnnounces({
      ...EMPTY_QUERY,
      keyword: '智慧城市',
      region: '广东',
      announceType: '招标公告',
      sourceSite: '中国政府采购网',
      startDate: '2026-09-01',
      endDate: '2026-09-30',
      page: 2,
    });

    expect(calls.get('ilike')).toEqual([
      ['title', '%智慧城市%'],
      ['region', '%广东%'],
    ]);
    expect(calls.get('eq')).toEqual([
      ['announce_type', '招标公告'],
      ['source_site', '中国政府采购网'],
    ]);
    expect(firstArgs(calls, 'gte')).toEqual(['publish_date', '2026-09-01T00:00:00+08:00']);
    // endDate 为 09-30 时应包含 09-30 全天：lt 次日 0 点
    expect(firstArgs(calls, 'lt')).toEqual(['publish_date', '2026-10-01T00:00:00+08:00']);
    expect(firstArgs(calls, 'range')).toEqual([20, 39]);
  });

  it('数据库错误映射为 503 DB_UNAVAILABLE', async () => {
    const { chain } = createChain({ data: null, error: { message: 'connection refused' } });
    mockFrom({ bid_announce: chain });

    await expect(listAnnounces({ ...EMPTY_QUERY })).rejects.toBeInstanceOf(ApiError);
    await expect(listAnnounces({ ...EMPTY_QUERY })).rejects.toMatchObject({
      code: ErrorCode.DB_UNAVAILABLE,
    });
  });
});

describe('getAnnounceById（契约 §3.2）', () => {
  it('公告不存在 → 404 NOT_FOUND', async () => {
    const announceChain = createChain({ data: null, error: null });
    mockFrom({ bid_announce: announceChain.chain });

    await expect(getAnnounceById(999)).rejects.toMatchObject({ code: ErrorCode.NOT_FOUND });
  });

  it('正常路径：两次单行查询并关联映射，无大字段泄漏', async () => {
    const announceChain = createChain({ data: ANNOUNCE_ROW, error: null });
    const detailChain = createChain({ data: DETAIL_ROW, error: null });
    mockFrom({ bid_announce: announceChain.chain, bid_detail: detailChain.chain });

    const result = await getAnnounceById(11);

    expect(fromMock).toHaveBeenCalledWith('bid_announce');
    expect(fromMock).toHaveBeenCalledWith('bid_detail');
    expect(String(firstArgs(announceChain.calls, 'select')?.[0])).not.toContain('content_html');
    expect(firstArgs(detailChain.calls, 'eq')).toEqual(['announce_id', 11]);

    expect(result.detailUrl).toBe('https://example.com/detail/11');
    expect(result.announceNo).toBe('GZ-2026-0915');
    expect(result.structured).toEqual({ contactPerson: '张工', contactPhone: '020-88888888' });
    expect(result.crawledAt).toBe('2026-09-15T17:00:00.000Z');
  });

  it('structured 为脏数据时降级为 null，整条详情不失败', async () => {
    const announceChain = createChain({ data: ANNOUNCE_ROW, error: null });
    const detailChain = createChain({
      data: { ...DETAIL_ROW, structured: { contact_person: { nested: true } } },
      error: null,
    });
    mockFrom({ bid_announce: announceChain.chain, bid_detail: detailChain.chain });

    const result = await getAnnounceById(11);

    expect(result.structured).toBeNull();
    expect(result.title).toBe(ANNOUNCE_ROW.title);
  });

  it('无 bid_detail 记录不是错误：structured / contentText 为 null', async () => {
    const announceChain = createChain({ data: ANNOUNCE_ROW, error: null });
    const detailChain = createChain({ data: null, error: null });
    mockFrom({ bid_announce: announceChain.chain, bid_detail: detailChain.chain });

    const result = await getAnnounceById(11);

    expect(result.structured).toBeNull();
    expect(result.contentText).toBeNull();
  });

  it('详情子表查询失败 → 503', async () => {
    const announceChain = createChain({ data: ANNOUNCE_ROW, error: null });
    const detailChain = createChain({ data: null, error: { message: 'timeout' } });
    mockFrom({ bid_announce: announceChain.chain, bid_detail: detailChain.chain });

    await expect(getAnnounceById(11)).rejects.toMatchObject({
      code: ErrorCode.DB_UNAVAILABLE,
    });
  });
});
