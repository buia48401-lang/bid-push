import { z } from 'zod';

import { PageQuerySchema, optionalText } from '@/lib/validation/common';

/**
 * demo 列表查询参数 —— 演示如何组合 common 里的通用构造器：
 * 分页直接复用 PageQuerySchema，业务筛选用 optionalText 按列宽声明。
 */
export const DemoQuerySchema = PageQuerySchema.extend({
  /** 标题模糊搜索；空串视为不筛选 */
  keyword: optionalText(128, '关键词'),
});

export type DemoQuery = z.infer<typeof DemoQuerySchema>;
