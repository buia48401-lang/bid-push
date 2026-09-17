import type { NextRequest } from 'next/server';

import { withRouteHandler } from '@/lib/api/handler';
import { readJsonBody } from '@/lib/api/request';
import { createSubscription, listSubscriptions } from '@/lib/data/subscriptions';
import { SubscriptionUpsertSchema } from '@/lib/validation/subscription';

/** 订阅为可写资源，禁止任何形式的静态化 */
export const dynamic = 'force-dynamic';

/**
 * GET /api/subscriptions —— 订阅列表（docs/api-contract.md §3.3）
 *
 * 订阅量小，契约未定义分页，故不接收查询参数。
 */
export const GET = withRouteHandler(async () => listSubscriptions());

/**
 * POST /api/subscriptions —— 新增订阅（docs/api-contract.md §3.4）
 *
 * 入参经 SubscriptionUpsertSchema 校验并补默认值（channel / enabled）后落库。
 * 🔴 写入走 service_role（数据层内部选择），响应不返回 webhook_url 完整值。
 */
export const POST = withRouteHandler(async (request: NextRequest) => {
  const input = SubscriptionUpsertSchema.parse(await readJsonBody(request));

  return createSubscription(input);
});
