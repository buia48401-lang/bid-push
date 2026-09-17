import { unimplemented } from '@/lib/api/errors';
import type { SubscriptionUpsertInput } from '@/lib/validation/subscription';
import type { SubscriptionListResult, SubscriptionMutationResult } from '@/types/subscription';

/**
 * 数据层：订阅（bid_subscription）
 *
 * 🔴 本模块是应用侧唯一可写表，且必须走 getAdminClient()（service_role）：
 *    迁移 002 启用 RLS 后 bid_subscription 不对 anon 开放任何策略，
 *    只读客户端将一律读不到、写不进（见 n8n/sql/002_app_fields_migration.sql 文件头）。
 */

/**
 * 订阅列表 —— 契约 §3.3。
 *
 * 落地要点：
 * 1. 订阅量小，不分页，但仍只 select 契约列（禁止 `select('*')`）；
 * 2. enabledCount / total 在应用层对已取回的 list 统计即可（非全表扫描场景）；
 * 3. 排序：enabled DESC, updated_at DESC（启用中的排在前面）；
 * 4. webhookUrl 原样返回由接口层负责，前端展示前必须 maskWebhookUrl 脱敏。
 */
export async function listSubscriptions(): Promise<SubscriptionListResult> {
  unimplemented('api-contract.md §3.3 GET /api/subscriptions');
}

/**
 * 新增订阅 —— 契约 §3.4。
 *
 * 落地要点：
 * 1. 入参已由 SubscriptionUpsertSchema 校验并补默认值（channel / enabled）；
 * 2. INSERT 后 `.select('id').single()` 直接取回新 id，避免二次查询；
 * 3. keyword 多关键词用 '/' 分隔，原样落库，拆解逻辑在 n8n 匹配侧。
 */
export async function createSubscription(
  input: SubscriptionUpsertInput,
): Promise<SubscriptionMutationResult> {
  unimplemented('api-contract.md §3.4 POST /api/subscriptions', input);
}

/**
 * 修改订阅 —— 契约 §3.5。
 *
 * 落地要点：
 * 1. **全量覆盖**语义：入参未提供的可选字段按 schema 默认值写入，
 *    因此前端「停用/启用」必须提交完整对象（含 enabled），禁止为单字段另开接口；
 * 2. UPDATE 不存在的 id 时 affectedRows 为 0，抛 ApiError(NOT_FOUND) → 404；
 * 3. updated_at 由数据库触发器维护，应用层不写入。
 */
export async function updateSubscription(
  id: number,
  input: SubscriptionUpsertInput,
): Promise<SubscriptionMutationResult> {
  unimplemented('api-contract.md §3.5 PUT /api/subscriptions/{id}', { id, input });
}
