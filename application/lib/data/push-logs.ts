import { ErrorCode } from '@/lib/api/error-codes';
import { ApiError } from '@/lib/api/errors';
import { PUSH_STATUSES } from '@/lib/constants/domain';
import { mapPushLogItem } from '@/lib/data/mappers';
import { getServerClient } from '@/lib/supabase/server';
import { successRate } from '@/lib/utils/format';
import type { PushLogQuery } from '@/lib/validation/push-log';
import type { PushLogListResult, PushLogStats } from '@/types/push-log';
import type { BidPushLogJoinedRow } from '@/types/database';

/**
 * 数据层：推送记录（bid_push_log），纯只读。
 *
 * 契约 §3.6 要求列表与今日统计在同一份响应中返回，避免前端发两次请求。
 */

/** 列表列：嵌套关联名称一次取回（禁止 N+1），含契约 §3.6 的全部字段 */
const PUSH_LOG_COLUMNS =
  'id,subscription_id,announce_id,channel,status,sent_at,error_message,created_at,subscription:bid_subscription(name),announce:bid_announce(title)';

/** 状态字面量一律引用 domain 常量，禁止硬编码中文枚举 */
const [PUSH_SUCCESS, PUSH_FAILED] = PUSH_STATUSES;

const DAY_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** 业务时区自然日 → [当日 00:00, 次日 00:00]（+08:00 ISO 串），口径与 lib/utils/format.ts 一致 */
function shanghaiDayRange(now: Date): { start: string; end: string } {
  const today = DAY_FORMATTER.format(now);
  const [year, month, day] = today.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  const monthText = String(next.getUTCMonth() + 1).padStart(2, '0');
  const dayText = String(next.getUTCDate()).padStart(2, '0');

  return {
    start: `${today}T00:00:00+08:00`,
    end: `${next.getUTCFullYear()}-${monthText}-${dayText}T00:00:00+08:00`,
  };
}

function throwIfDbError(error: { message: string } | null): void {
  if (error) {
    console.error('[data] 推送记录查询失败：', error.message);
    throw new ApiError(ErrorCode.DB_UNAVAILABLE);
  }
}

/**
 * 今日推送统计 —— 契约 §3.6 stats 字段。
 *
 * - 「今日」以业务时区 Asia/Shanghai 的自然日边界切分（与 lib/utils/format.ts 一致）；
 * - 全部下推数据库统计：total / success / failed 三个 head+count 查询并行，禁止拉历史记录回应用层；
 * - successRate = lib/utils/format.ts 的 successRate(success, total)，保留 1 位小数，无数据时为 0。
 */
export async function getTodayStats(now: Date = new Date()): Promise<PushLogStats> {
  const supabase = getServerClient();
  const { start, end } = shanghaiDayRange(now);

  const totalQuery = supabase
    .from('bid_push_log')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', start)
    .lt('created_at', end);

  const successQuery = supabase
    .from('bid_push_log')
    .select('id', { count: 'exact', head: true })
    .eq('status', PUSH_SUCCESS)
    .gte('created_at', start)
    .lt('created_at', end);

  const failedQuery = supabase
    .from('bid_push_log')
    .select('id', { count: 'exact', head: true })
    .eq('status', PUSH_FAILED)
    .gte('created_at', start)
    .lt('created_at', end);

  const [total, success, failed] = await Promise.all([totalQuery, successQuery, failedQuery]);

  throwIfDbError(total.error ?? success.error ?? failed.error);

  const todayTotal = total.count ?? 0;
  const todaySuccess = success.count ?? 0;
  const todayFailed = failed.count ?? 0;

  return {
    todayTotal,
    todaySuccess,
    todayFailed,
    successRate: successRate(todaySuccess, todayTotal),
  };
}

/**
 * 推送记录列表 —— 契约 §3.6。
 *
 * - 嵌套 select 一次取回关联名称（subscription:bid_subscription(name) / announce:bid_announce(title)）；
 * - 分页下推：`.range()` + `{ count: 'exact' }`；
 * - 排序：sent_at DESC NULLS LAST（失败记录 sent_at 为 null）+ created_at DESC + id DESC，翻页不重不漏；
 * - status 非空时精确过滤（中文取值由 PushLogQuerySchema 约束），空 = 全部；
 * - stats 与列表并行查询，组装进同一响应。
 */
export async function listPushLogs(query: PushLogQuery): Promise<PushLogListResult> {
  const supabase = getServerClient();
  const offset = (query.page - 1) * query.pageSize;

  let builder = supabase.from('bid_push_log').select(PUSH_LOG_COLUMNS, { count: 'exact' });

  if (query.status) {
    builder = builder.eq('status', query.status);
  }

  const listPromise = builder
    .order('sent_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(offset, offset + query.pageSize - 1);

  const [pageResult, stats] = await Promise.all([listPromise, getTodayStats()]);

  throwIfDbError(pageResult.error);

  // supabase-js 泛型无法从字符串推断嵌套 select 形状，边界处经 unknown 显式断言为联合行类型
  return {
    list: (pageResult.data ?? []).map((row) =>
      mapPushLogItem(row as unknown as BidPushLogJoinedRow),
    ),
    total: pageResult.count ?? 0,
    page: query.page,
    pageSize: query.pageSize,
    stats,
  };
}
