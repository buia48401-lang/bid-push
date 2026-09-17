import { withRouteHandler } from '@/lib/api/handler';
import { getAnnounceById } from '@/lib/data/announces';
import { IdSchema } from '@/lib/validation/common';

export const dynamic = 'force-dynamic';

/**
 * GET /api/announces/{id} —— 公告详情（docs/api-contract.md §3.2）
 *
 * id 非法（非正整数）由 IdSchema 抛 ZodError → 400 INVALID_PARAM；
 * 记录不存在由数据层抛 ApiError(NOT_FOUND) → 404。
 */
export const GET = withRouteHandler<{ id: string }>(async (_request, { params }) => {
  const id = IdSchema.parse(params.id);

  return getAnnounceById(id);
});
