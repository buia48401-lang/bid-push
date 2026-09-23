import { ErrorCode } from '@/lib/api/error-codes';
import { ApiError } from '@/lib/api/errors';
import { mapCrawlLogItem, toCount } from '@/lib/data/mappers';
import { getServerClient } from '@/lib/supabase/server';
import type { CrawlLogQuery } from '@/lib/validation/crawl-log';
import type { CrawlLogListResult, CrawlLogTodaySummary } from '@/types/crawl-log';
import type { BidCrawlLogRow } from '@/types/database';

/**
 * 数据层：抓取日志（bid_crawl_log）。
 *
 * 🔴 本模块纯只读：抓取动作由 n8n 调度，应用侧不提供任何「立即抓取」能力
 *    （docs/requirements.md §6 红线）。
 */

/** 列表列（api-contract.md §3.7 的 9 个字段，禁止 select('*')） */
const CRAWL_LOG_COLUMNS = 'id,run_at,source_site,site_level,total,success,failed,manual,note';

const DAY_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** 业务时区自然日 → [当日 00:00, 次日 00:00]（+08:00 ISO 串），口径与推送记录一致 */
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
    console.error('[data] 抓取日志查询失败：', error.message);
    throw new ApiError(ErrorCode.DB_UNAVAILABLE);
  }
}

/** 单批拉取上限：与 Supabase PostgREST 默认 max-rows 对齐，超出时循环分批补齐 */
const SUMMARY_BATCH_SIZE = 1000;

/**
 * 今日抓取概况 —— 契约 §3.7 todayRounds / todayTotal。
 *
 * - 「今日」按 Asia/Shanghai 自然日边界切分；
 * - todayRounds 用 count（exact）统计；todayTotal 对今日行的 total 列求和；
 * - ⚠️ 环境的 PostgREST 禁用聚合函数（db-aggregate-function-enabled=false，
 *   `total.sum()` 会报「Use of aggregate functions is not allowed」），无法把求和下推数据库；
 *   退而求其次：只拉「今日」行的 total 单列（时间边界本身限制行数，常规一轮取完），
 *   超单批上限时循环分批 —— 🔴 红线针对的是「拉全表」，此处必须始终带今日 gte/lt 边界。
 */
export async function getTodaySummary(now: Date = new Date()): Promise<CrawlLogTodaySummary> {
  const supabase = getServerClient();
  const { start, end } = shanghaiDayRange(now);

  let todayTotal = 0;
  let todayRounds = 0;
  let offset = 0;

  for (;;) {
    const { data, error, count } = await supabase
      .from('bid_crawl_log')
      .select('total', { count: 'exact' })
      .gte('run_at', start)
      .lt('run_at', end)
      .range(offset, offset + SUMMARY_BATCH_SIZE - 1);

    throwIfDbError(error);

    const rows = (data ?? []) as Array<{ total?: number | string | null }>;

    todayTotal += rows.reduce((sum, row) => sum + toCount(row.total), 0);
    todayRounds = count ?? todayRounds;

    // 不足一批说明已取完今日全部行（count 由 exact 精确统计，不受截断影响）
    if (!data || data.length < SUMMARY_BATCH_SIZE) {
      break;
    }

    offset += SUMMARY_BATCH_SIZE;
  }

  return { todayRounds, todayTotal };
}

/**
 * 抓取日志列表 —— 契约 §3.7。
 *
 * - 分页下推：`.range()` + `{ count: 'exact' }`；
 * - sourceSite 非空时精确过滤（idx_bid_crawl_log_source_site_run_at 支撑），空 = 全部；
 * - 排序：run_at DESC（空值排最后）+ id DESC 次级键，翻页不重不漏；
 * - site_level 可能为空串（迁移 002 未加 CHECK 约束），映射层保持原值，
 *   前端统一用 EMPTY_PLACEHOLDER 显示「—」；
 * - todayRounds / todayTotal 与列表并行查询后合并进返回体。
 */
export async function listCrawlLogs(query: CrawlLogQuery): Promise<CrawlLogListResult> {
  const supabase = getServerClient();
  const offset = (query.page - 1) * query.pageSize;

  let builder = supabase.from('bid_crawl_log').select(CRAWL_LOG_COLUMNS, { count: 'exact' });

  if (query.sourceSite) {
    builder = builder.eq('source_site', query.sourceSite);
  }

  const listPromise = builder
    .order('run_at', { ascending: false, nullsFirst: false })
    .order('id', { ascending: false })
    .range(offset, offset + query.pageSize - 1);

  const [pageResult, todaySummary] = await Promise.all([listPromise, getTodaySummary()]);

  throwIfDbError(pageResult.error);

  return {
    list: (pageResult.data ?? []).map((row) => mapCrawlLogItem(row as BidCrawlLogRow)),
    total: pageResult.count ?? 0,
    page: query.page,
    pageSize: query.pageSize,
    ...todaySummary,
  };
}
