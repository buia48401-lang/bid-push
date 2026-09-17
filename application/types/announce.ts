import type { BidDetailStructured } from '@/types/structured';

/** 公告列表项 —— api-contract.md §3.1 */
export type AnnounceListItem = {
  id: number;
  title: string;
  /** announce_type */
  announceType: string;
  purchaser: string;
  region: string;
  /** 单位：元；可空 */
  budget: number | null;
  /** ISO 串；可空 */
  publishDate: string | null;
  /** source_site */
  sourceSite: string;
  /** crawl_status：待抓取 / 已入库 / 抓取失败 / 待人工 */
  crawlStatus: string;
};

/** 公告详情 —— api-contract.md §3.2 */
export type AnnounceDetail = {
  id: number;
  title: string;
  announceType: string;
  /** announce_no，迁移 002 新增 */
  announceNo: string | null;
  /** detail_url，供「查看原文」跳转 */
  detailUrl: string;
  publishDate: string | null;
  purchaser: string;
  region: string;
  sourceSite: string;
  budget: number | null;
  crawlStatus: string;
  remark: string;
  /** 解析失败或暂无 bid_detail 记录时为 null */
  structured: BidDetailStructured | null;
  /** 已截断至 2000 字；无正文时为 null */
  contentText: string | null;
  crawledAt: string | null;
};
