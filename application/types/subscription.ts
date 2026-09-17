/** 推送渠道 —— 与 bid_subscription.channel 取值一致 */
export type SubscriptionChannel = 'feishu_webhook' | 'email' | 'webhook';

/** 订阅列表项 —— api-contract.md §3.3 */
export type SubscriptionItem = {
  id: number;
  /** 迁移 002 新增 */
  name: string;
  /** 空 = 不限；多关键词用 '/' 分隔 */
  keyword: string;
  /** 空 = 不限 */
  region: string;
  /** 空 = 全部类型 */
  announceType: string;
  channel: string;
  /** 🔴 前端展示前必须脱敏（见 lib/utils/format.ts 的 maskWebhookUrl） */
  webhookUrl: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

/** 订阅列表响应（订阅量小，不分页） */
export type SubscriptionListResult = {
  list: SubscriptionItem[];
  enabledCount: number;
  total: number;
};

/** 新增 / 修改订阅响应 —— §3.4 / §3.5 */
export type SubscriptionMutationResult = {
  id: number;
};
