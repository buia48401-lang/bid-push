import type { PageResult } from '@/types/api';

/** 抓取执行日志明细 —— api-contract.md §3.7 */
export type CrawlLogItem = {
  id: number;
  /** ISO 串 */
  runAt: string;
  /** 迁移 002 新增 */
  sourceSite: string;
  /** 迁移 002 新增：A级 / B级 / C级；空值前端显示「—」 */
  siteLevel: string;
  total: number;
  success: number;
  failed: number;
  /** 转待人工条数 */
  manual: number;
  note: string;
};

/** 今日概况 —— 与列表同响应返回，避免前端二次请求 */
export type CrawlLogTodaySummary = {
  /** 今日执行轮次（今日 bid_crawl_log 记录数） */
  todayRounds: number;
  /** 今日 total 求和 */
  todayTotal: number;
};

export type CrawlLogListResult = PageResult<CrawlLogItem> & CrawlLogTodaySummary;
