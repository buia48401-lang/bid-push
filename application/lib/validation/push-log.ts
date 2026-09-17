import { z } from 'zod';

import { PageQuerySchema, emptyAsUndefined } from '@/lib/validation/common';

/** 推送状态筛选 —— 取值与 bid_push_log.status 列注释一致 */
export const PushStatusSchema = z.enum(['成功', '失败', '待重试']);

/** GET /api/push-logs 查询参数 —— api-contract.md §3.6 */
export const PushLogQuerySchema = PageQuerySchema.extend({
  /** 空 = 全部 */
  status: z.preprocess(emptyAsUndefined, PushStatusSchema.optional()),
});

export type PushLogQuery = z.infer<typeof PushLogQuerySchema>;
