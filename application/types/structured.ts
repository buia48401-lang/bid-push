/**
 * `bid_detail.structured` 相关类型。
 *
 * 命名契约（api-contract.md §5 例外条款）：
 * JSONB 内部键保持 snake_case，接口输出统一映射为 camelCase，
 * 映射动作只发生在 lib/data/mappers.ts。
 */

/** JSONB 原始形态（n8n 写入） */
export type BidDetailStructuredRow = {
  title?: string;
  purchaser?: string;
  region?: string;
  /** n8n 可能写入数字或数字字符串，统一归一为 number */
  budget?: number | string | null;
  /** 报名 / 投标截止时间 */
  deadline?: string;
  contact_person?: string;
  contact_phone?: string;
  agency?: string;
  summary?: string;
};

/** 接口输出形态 */
export type BidDetailStructured = {
  title?: string;
  purchaser?: string;
  region?: string;
  /** 单位：元 */
  budget?: number | null;
  /** 报名 / 投标截止时间，ISO 串 */
  deadline?: string;
  contactPerson?: string;
  contactPhone?: string;
  agency?: string;
  summary?: string;
};
