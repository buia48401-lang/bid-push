import { unimplemented } from '@/lib/api/errors';
import type { PushLogQuery } from '@/lib/validation/push-log';
import type { PushLogListResult, PushLogStats } from '@/types/push-log';

/**
 * 数据层：推送记录（bid_push_log）
 *
 * 契约 §3.6 要求列表与今日统计在同一份响应中返回，避免前端发两次请求。
 */

/**
 * 推送记录列表 —— 契约 §3.6。
 *
 * 落地要点：
 * 1. 关联名称必须用 Supabase 嵌套 select 一次取回，禁止 N+1：
 *    `select('id, subscription_id, announce_id, channel, status, sent_at,
 *      error_message, created_at, subscription:bid_subscription(name),
 *      announce:bid_announce(title)')`
 *    → 行类型 BidPushLogJoinedRow；
 * 2. 分页下推：`.range()` + `{ count: 'exact' }`；
 * 3. 排序：`sent_at DESC NULLS LAST, created_at DESC`（失败记录 sent_at 为 null）；
 * 4. status 为空表示不筛选，非空时 `.eq('status', status)`；
 * 5. stats 由 getTodayStats() 取得，一并组装为 PushLogListResult。
 */
export async function listPushLogs(query: PushLogQuery): Promise<PushLogListResult> {
  unimplemented('api-contract.md §3.6 GET /api/push-logs', query);
}

/**
 * 今日推送统计 —— 契约 §3.6 stats 字段。
 *
 * 落地要点：
 * 1. 「今日」以业务时区 Asia/Shanghai 的自然日边界切分（与 lib/utils/format.ts 一致）；
 * 2. 全部下推数据库统计：todayTotal / todaySuccess / todayFailed 用 count 查询
 *    或一次 `select('status')` + 服务端聚合，禁止把历史记录全量拉到应用层；
 * 3. successRate = lib/utils/format.ts 的 successRate(success, total)，保留 1 位小数，
 *    无数据时为 0（不返回 NaN）。
 */
export async function getTodayStats(): Promise<PushLogStats> {
  unimplemented('api-contract.md §3.6 GET /api/push-logs (stats)');
}
