import type { PageResult } from '@/types/api';

/** 推送状态 —— 与 bid_push_log.status 取值一致 */
export type PushStatus = '成功' | '失败' | '待重试';

/** 推送记录明细 —— api-contract.md §3.6 */
export type PushLogItem = {
  id: number;
  /** 发送成功时间；失败时为 null，前端回退用 createdAt */
  sentAt: string | null;
  createdAt: string;
  subscriptionId: number;
  /** 关联 bid_subscription.name */
  subscriptionName: string;
  announceId: number;
  /** 关联 bid_announce.title */
  announceTitle: string;
  channel: string;
  status: string;
  /** 成功时为 '' */
  errorMessage: string;
};

/** 今日推送统计 */
export type PushLogStats = {
  todayTotal: number;
  todaySuccess: number;
  todayFailed: number;
  /** 0~100，保留 1 位小数；无数据为 0 */
  successRate: number;
};

export type PushLogListResult = PageResult<PushLogItem> & {
  stats: PushLogStats;
};
