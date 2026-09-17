import { unimplemented } from '@/lib/api/errors';
import type { CrawlLogQuery } from '@/lib/validation/crawl-log';
import type { CrawlLogListResult, CrawlLogTodaySummary } from '@/types/crawl-log';

/**
 * 数据层：抓取日志（bid_crawl_log）
 *
 * 🔴 本模块纯只读：抓取动作由 n8n 调度，应用侧不提供任何「立即抓取」能力
 *    （docs/requirements.md §6 红线）。
 */

/**
 * 抓取日志列表 —— 契约 §3.7。
 *
 * 落地要点：
 * 1. 分页下推：`.range()` + `{ count: 'exact' }`；
 * 2. sourceSite 非空时 `.eq('source_site', sourceSite)`；
 * 3. 排序：`run_at DESC`（同一轮次的 source_site 顺序无关紧要）；
 * 4. site_level 可能为空串（迁移 002 未加 CHECK 约束，允许 n8n 写入意外取值），
 *    映射层保持原值，前端统一用 EMPTY_PLACEHOLDER 显示「—」；
 * 5. todayRounds / todayTotal 由 getTodaySummary() 取得后合并进返回体。
 */
export async function listCrawlLogs(query: CrawlLogQuery): Promise<CrawlLogListResult> {
  unimplemented('api-contract.md §3.7 GET /api/crawl-logs', query);
}

/**
 * 今日抓取概况 —— 契约 §3.7 todayRounds / todayTotal。
 *
 * 落地要点：
 * 1. 「今日」按 Asia/Shanghai 自然日边界切分；
 * 2. todayRounds = 今日 bid_crawl_log 记录数（count）；
 * 3. todayTotal = 今日 total 列求和，使用数据库聚合（不可拉全表回应用层累加）。
 */
export async function getTodaySummary(): Promise<CrawlLogTodaySummary> {
  unimplemented('api-contract.md §3.7 GET /api/crawl-logs (today summary)');
}
