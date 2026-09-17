import { z } from 'zod';

import { TextLimits } from '@/lib/validation/common';

/** 宽松的 http(s) 地址校验，避免依赖 new URL 的异常分支 */
const HTTP_URL_PATTERN = /^https?:\/\/[^\s/$.?#][^\s]*$/i;

/** 推送渠道 —— 与 bid_subscription.channel 取值一致 */
export const SubscriptionChannelSchema = z.enum(['feishu_webhook', 'email', 'webhook']);

export const WebhookUrlSchema = z
  .string()
  .trim()
  .min(1, 'Webhook 地址为必填项')
  .max(TextLimits.webhookUrl, `Webhook 地址不超过 ${TextLimits.webhookUrl} 个字符`)
  .refine((value) => HTTP_URL_PATTERN.test(value), '请输入合法的 http(s) 地址');

/**
 * POST /api/subscriptions 与 PUT /api/subscriptions/{id} 共用（api-contract.md §3.5 实现约束）。
 *
 * ⚠️ `enabled` 带默认值 `true`，与 §3.4 契约一致。
 * 因 PUT 是**全量覆盖**，前端更新订阅时必须显式传 `enabled`，
 * 否则会按默认值把停用订阅重新启用。禁止为「只改 enabled」另开接口。
 */
export const SubscriptionUpsertSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, '订阅名称为必填项')
    .max(TextLimits.subscriptionName, `订阅名称不超过 ${TextLimits.subscriptionName} 个字符`),
  /** 空 = 不限；多关键词用 '/' 分隔 */
  keyword: z
    .string()
    .trim()
    .max(TextLimits.subscriptionKeyword, `关键词不超过 ${TextLimits.subscriptionKeyword} 个字符`)
    .default(''),
  region: z
    .string()
    .trim()
    .max(TextLimits.region, `地区不超过 ${TextLimits.region} 个字符`)
    .default(''),
  announceType: z
    .string()
    .trim()
    .max(TextLimits.announceType, `公告类型不超过 ${TextLimits.announceType} 个字符`)
    .default(''),
  channel: SubscriptionChannelSchema.default('feishu_webhook'),
  webhookUrl: WebhookUrlSchema,
  enabled: z.boolean().default(true),
});

export type SubscriptionUpsertInput = z.infer<typeof SubscriptionUpsertSchema>;
