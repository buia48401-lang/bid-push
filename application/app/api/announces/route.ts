import { withRouteHandler } from '@/lib/api/handler';
import { toQueryObject } from '@/lib/api/request';
import { listAnnounces } from '@/lib/data/announces';
import { AnnounceListQuerySchema } from '@/lib/validation/announce';

/** 列表数据不做静态缓存：始终读最新入库结果 */
export const dynamic = 'force-dynamic';

/**
 * GET /api/announces —— 公告列表（docs/api-contract.md §3.1）
 *
 * 职责边界：只做「查询串 → Zod 校验 → 数据层 → 统一信封」，
 * traceId 生成、错误码映射、响应包封均由 withRouteHandler 承担。
 */
export const GET = withRouteHandler(async (_request, { searchParams }) => {
  const query = AnnounceListQuerySchema.parse(toQueryObject(searchParams));

  return listAnnounces(query);
});
