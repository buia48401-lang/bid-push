import type { NextRequest } from 'next/server';

import { withRouteHandler } from '@/lib/api/handler';
import { readJsonBody } from '@/lib/api/request';
import { updateSubscription } from '@/lib/data/subscriptions';
import { IdSchema } from '@/lib/validation/common';
import { SubscriptionUpsertSchema } from '@/lib/validation/subscription';

export const dynamic = 'force-dynamic';

/**
 * PUT /api/subscriptions/{id} —— 修改订阅（docs/api-contract.md §3.5）
 *
 * 🔴 全量覆盖语义：入参与 POST 共用同一 schema，前端必须提交完整对象
 *    （含 enabled），否则停用中的订阅会被默认值重新启用。
 *    契约明确禁止为「只改 enabled」另开接口，启用/停用复用本接口。
 */
export const PUT = withRouteHandler<{ id: string }>(async (request: NextRequest, { params }) => {
  const id = IdSchema.parse(params.id);
  const input = SubscriptionUpsertSchema.parse(await readJsonBody(request));

  return updateSubscription(id, input);
});
