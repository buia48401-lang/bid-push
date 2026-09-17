import type { SubscriptionChannel } from '@/types/subscription';

/**
 * 业务枚举与中文映射。
 * 取值来源：n8n/sql/001_bid_schema.sql 列注释 + 002_app_fields_migration.sql。
 */

/** 公告类型 —— bid_announce.announce_type */
export const ANNOUNCE_TYPES = [
  '招标公告',
  '中标公告',
  '成交公告',
  '竞争性磋商',
  '询价公告',
  '更正公告',
  '其他',
] as const;

/** 抓取状态 —— 与飞书状态机一致 */
export const CRAWL_STATUSES = ['待抓取', '已入库', '抓取失败', '待人工'] as const;

/** 推送状态 —— bid_push_log.status */
export const PUSH_STATUSES = ['成功', '失败', '待重试'] as const;

/** 推送渠道 —— bid_subscription.channel */
export const SUBSCRIPTION_CHANNELS: readonly SubscriptionChannel[] = [
  'feishu_webhook',
  'email',
  'webhook',
];

export const CHANNEL_LABELS: Record<SubscriptionChannel, string> = {
  feishu_webhook: '飞书群机器人',
  email: '邮件',
  webhook: '通用 Webhook',
};

/**
 * 站点等级 —— 迁移 002 新增。
 * 🔴 刻意不加 CHECK 约束（n8n 写入意外取值不应中断采集链路），空值前端显示「—」。
 */
export const SITE_LEVELS = ['A级', 'B级', 'C级'] as const;

/** 缺失值统一占位符 */
export const EMPTY_PLACEHOLDER = '—';

/** 订阅条件为空时的展示文案 */
export const UNLIMITED_LABEL = '不限';
export const ALL_TYPES_LABEL = '全部类型';

/** 公告详情正文摘要回退展示的截断长度（api-contract.md §3.2） */
export const CONTENT_TEXT_MAX_LENGTH = 2000;

export function channelLabel(channel: string): string {
  return CHANNEL_LABELS[channel as SubscriptionChannel] ?? channel;
}
