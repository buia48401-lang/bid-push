import { z } from 'zod';

import {
  PageQuerySchema,
  TextLimits,
  optionalDateOnly,
  optionalText,
} from '@/lib/validation/common';

/** GET /api/announces 查询参数 —— api-contract.md §3.1 */
export const AnnounceListQuerySchema = PageQuerySchema.extend({
  /** 标题模糊匹配（title ILIKE %kw%） */
  keyword: optionalText(TextLimits.keyword, '关键词'),
  /** 地区，包含匹配；空 = 不限 */
  region: optionalText(TextLimits.region, '地区'),
  /** 公告类型，精确匹配；空 = 不限 */
  announceType: optionalText(TextLimits.announceType, '公告类型'),
  /** 来源站点，精确匹配；空 = 不限 */
  sourceSite: optionalText(TextLimits.sourceSite, '来源站点'),
  /** publish_date >= startDate */
  startDate: optionalDateOnly(),
  /** publish_date < endDate + 1 天（含当日） */
  endDate: optionalDateOnly(),
});

export type AnnounceListQuery = z.infer<typeof AnnounceListQuerySchema>;
