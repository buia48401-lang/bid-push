/**
 * 数据表行类型（snake_case），与 n8n/sql/001_bid_schema.sql + 002_app_fields_migration.sql 对齐。
 *
 * ⚠️ 两个易错点（映射层必须处理）：
 * 1. `budget` / `total` 等 numeric 列经 PostgREST 可能返回字符串，禁止直接当作 number 使用；
 * 2. `publish_date` 自迁移 002 起为 TIMESTAMPTZ，但历史数据可能仍是纯日期串。
 */

export type BidAnnounceRow = {
  id: number;
  title: string;
  /** 全链路唯一键 */
  detail_url: string;
  announce_type: string;
  /** 迁移 002 新增 */
  announce_no: string | null;
  /** 迁移 002 起为 TIMESTAMPTZ */
  publish_date: string | null;
  purchaser: string;
  region: string;
  source_site: string;
  /** numeric(18,2)，可能以字符串返回 */
  budget: number | string | null;
  /** 待抓取 / 已入库 / 抓取失败 / 待人工 */
  crawl_status: string;
  remark: string;
  created_at: string;
  updated_at: string;
};

export type BidDetailRow = {
  id: number;
  announce_id: number;
  content_html: string | null;
  content_text: string | null;
  structured: unknown | null;
  crawled_at: string;
};

export type BidSubscriptionRow = {
  id: number;
  /** 迁移 002 新增 */
  name: string;
  keyword: string;
  region: string;
  announce_type: string;
  channel: string;
  webhook_url: string;
  enabled: boolean;
  created_at: string;
  /** 迁移 002 新增，由触发器维护 */
  updated_at: string;
};

export type BidCrawlLogRow = {
  id: number;
  run_at: string;
  /** 迁移 002 新增 */
  source_site: string;
  /** 迁移 002 新增：A级 / B级 / C级 / 空 */
  site_level: string;
  total: number;
  success: number;
  failed: number;
  manual: number;
  note: string;
};

export type BidPushLogRow = {
  id: number;
  subscription_id: number;
  announce_id: number;
  channel: string;
  /** 成功 / 失败 / 待重试 */
  status: string;
  sent_at: string | null;
  error_message: string;
  created_at: string;
};

/** 嵌套关联查询（push-logs 用 Supabase 内嵌 select 一次取回，禁止 N+1） */
export type BidPushLogJoinedRow = BidPushLogRow & {
  subscription: { name: string } | null;
  announce: { title: string } | null;
};
