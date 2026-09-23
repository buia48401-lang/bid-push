import { ErrorCode } from '@/lib/api/error-codes';
import { ApiError } from '@/lib/api/errors';
import { mapSubscriptionItem } from '@/lib/data/mappers';
import { getAdminClient } from '@/lib/supabase/admin';
import type { SubscriptionUpsertInput } from '@/lib/validation/subscription';
import type { SubscriptionListResult, SubscriptionMutationResult } from '@/types/subscription';
import type { BidSubscriptionRow } from '@/types/database';

/**
 * 数据层：订阅（bid_subscription）。
 *
 * 🔴 本模块是应用侧唯一可写表，且必须走 getAdminClient()（service_role）：
 *    迁移 002 启用 RLS 后 bid_subscription 不对 anon 开放任何策略，
 *    只读客户端将一律读不到、写不进（见 n8n/sql/002_app_fields_migration.sql 文件头）。
 */

/** 契约列（api-contract.md §3.3 的 10 个字段，禁止 select('*')） */
const SUBSCRIPTION_COLUMNS =
  'id,name,keyword,region,announce_type,channel,webhook_url,enabled,created_at,updated_at';

function throwIfDbError(error: { message: string } | null): void {
  if (error) {
    // 内部细节（SQL / 连接串）只进服务端日志，响应体统一为 503 提示
    console.error('[data] 订阅查询失败：', error.message);
    throw new ApiError(ErrorCode.DB_UNAVAILABLE);
  }
}

/** 写入失败（约束冲突等）按契约 §3.4 映射为 500 INTERNAL，与读路径的 503 区分 */
function throwIfWriteError(error: { message: string } | null): void {
  if (error) {
    console.error('[data] 订阅写入失败：', error.message);
    throw new ApiError(ErrorCode.INTERNAL);
  }
}

/** 入参（camelCase，已过 Zod）→ 数据库写入载荷（snake_case），逐字段显式列出 */
function toRowPayload(input: SubscriptionUpsertInput) {
  return {
    name: input.name,
    keyword: input.keyword,
    region: input.region,
    announce_type: input.announceType,
    channel: input.channel,
    webhook_url: input.webhookUrl,
    enabled: input.enabled,
  };
}

/**
 * 订阅列表 —— 契约 §3.3。
 *
 * - 订阅量小，不分页，但仍只 select 契约列；
 * - 排序：enabled DESC, updated_at DESC（启用中的排在前面）；
 * - enabledCount / total 由已取回的 list 统计（非全表扫描场景）；
 * - webhookUrl 原样返回由接口层负责，前端展示前必须 maskWebhookUrl 脱敏。
 */
export async function listSubscriptions(): Promise<SubscriptionListResult> {
  const supabase = getAdminClient();

  const { data, error } = await supabase
    .from('bid_subscription')
    .select(SUBSCRIPTION_COLUMNS)
    .order('enabled', { ascending: false })
    .order('updated_at', { ascending: false });

  throwIfDbError(error);

  const list = (data ?? []).map((row) => mapSubscriptionItem(row as BidSubscriptionRow));

  return {
    list,
    enabledCount: list.filter((item) => item.enabled).length,
    total: list.length,
  };
}

/**
 * 新增订阅 —— 契约 §3.4。
 *
 * - 入参已由 SubscriptionUpsertSchema 校验并补默认值（channel / enabled）；
 * - INSERT 后 `.select('id').single()` 直接取回新 id，避免二次查询；
 * - keyword 多关键词用 '/' 分隔，原样落库，拆解逻辑在 n8n 匹配侧。
 */
export async function createSubscription(
  input: SubscriptionUpsertInput,
): Promise<SubscriptionMutationResult> {
  const supabase = getAdminClient();

  const { data, error } = await supabase
    .from('bid_subscription')
    .insert(toRowPayload(input))
    .select('id')
    .single();

  throwIfWriteError(error);

  return { id: (data as { id: number }).id };
}

/**
 * 修改订阅 —— 契约 §3.5。
 *
 * - **全量覆盖**语义：入参未提供的可选字段按 schema 默认值写入，
 *   因此前端「停用/启用」必须提交完整对象（含 enabled），禁止为单字段另开接口；
 * - UPDATE 不存在的 id 时返回空数组 → ApiError(NOT_FOUND) → 404；
 * - updated_at 由数据库触发器维护，应用层不写入。
 */
export async function updateSubscription(
  id: number,
  input: SubscriptionUpsertInput,
): Promise<SubscriptionMutationResult> {
  const supabase = getAdminClient();

  const { data, error } = await supabase
    .from('bid_subscription')
    .update(toRowPayload(input))
    .eq('id', id)
    .select('id');

  throwIfWriteError(error);

  if (!data || data.length === 0) {
    throw new ApiError(ErrorCode.NOT_FOUND);
  }

  return { id: (data[0] as { id: number }).id };
}
