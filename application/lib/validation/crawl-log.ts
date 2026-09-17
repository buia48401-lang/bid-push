import { z } from 'zod';

import { PageQuerySchema, TextLimits, optionalText } from '@/lib/validation/common';

/** GET /api/crawl-logs 查询参数 —— api-contract.md §3.7 */
export const CrawlLogQuerySchema = PageQuerySchema.extend({
  /** 源站名称，精确匹配；空 = 全部 */
  sourceSite: optionalText(TextLimits.sourceSite, '来源站点'),
});

export type CrawlLogQuery = z.infer<typeof CrawlLogQuerySchema>;
