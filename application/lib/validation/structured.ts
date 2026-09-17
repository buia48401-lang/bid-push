import { z } from 'zod';

/**
 * `bid_detail.structured` JSONB 的解析 schema，键为 snake_case。
 *
 * 刻意保持宽松：
 * - 字段全部可选，缺字段不报错；
 * - `budget` 允许数字或数字字符串（n8n 写入形态不完全可控）；
 * - 未知键按 Zod 默认行为忽略，不视为错误。
 *
 * 目的：尽量展示已有数据，而不是因为个别字段异常就让整块降级为 null。
 * 🔴 调用方必须用 safeParse —— 解析失败降级为 null，禁止抛错（api-contract.md §3.2）。
 */
export const BidDetailStructuredRowSchema = z.object({
  title: z.string().optional(),
  purchaser: z.string().optional(),
  region: z.string().optional(),
  budget: z.union([z.number(), z.string()]).nullish(),
  deadline: z.string().optional(),
  contact_person: z.string().optional(),
  contact_phone: z.string().optional(),
  agency: z.string().optional(),
  summary: z.string().optional(),
});

export type BidDetailStructuredRowInput = z.infer<typeof BidDetailStructuredRowSchema>;
