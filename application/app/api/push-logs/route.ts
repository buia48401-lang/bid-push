import { withRouteHandler } from '@/lib/api/handler';
import { toQueryObject } from '@/lib/api/request';
import { listPushLogs } from '@/lib/data/push-logs';
import { PushLogQuerySchema } from '@/lib/validation/push-log';

export const dynamic = 'force-dynamic';

/**
 * GET /api/push-logs —— 推送记录（docs/api-contract.md §3.6）
 *
 * 响应 data = { list, total, page, pageSize, stats }，
 * stats 与列表同响应返回，前端无需二次请求。
 * 🔴 本接口纯只读：推送由 n8n 执行，应用侧不提供任何「重新推送」触发能力。
 */
export const GET = withRouteHandler(async (_request, { searchParams }) => {
  const query = PushLogQuerySchema.parse(toQueryObject(searchParams));

  return listPushLogs(query);
});
