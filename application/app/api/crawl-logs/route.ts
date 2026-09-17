import { withRouteHandler } from '@/lib/api/handler';
import { toQueryObject } from '@/lib/api/request';
import { listCrawlLogs } from '@/lib/data/crawl-logs';
import { CrawlLogQuerySchema } from '@/lib/validation/crawl-log';

export const dynamic = 'force-dynamic';

/**
 * GET /api/crawl-logs —— 抓取日志（docs/api-contract.md §3.7）
 *
 * 响应 data = { list, total, page, pageSize, todayRounds, todayTotal }。
 * 🔴 纯只读接口：抓取节奏由 n8n 调度，应用侧不提供「立即抓取」入口
 *    （docs/requirements.md §6 红线）。
 */
export const GET = withRouteHandler(async (_request, { searchParams }) => {
  const query = CrawlLogQuerySchema.parse(toQueryObject(searchParams));

  return listCrawlLogs(query);
});
