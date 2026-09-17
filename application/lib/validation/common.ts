import { z } from 'zod';

/** 查询串中的空值（如 `?page=`）按「未传」处理，避免空串被 coerce 成 0 而误判 400 */
export function emptyAsUndefined(value: unknown): unknown {
  if (typeof value === 'string' && value.trim() === '') {
    return undefined;
  }
  return value;
}

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/** 字段长度上限，与数据库列宽对齐（n8n/sql/001 + 002） */
export const TextLimits = {
  keyword: 128,
  region: 32,
  announceType: 32,
  sourceSite: 64,
  subscriptionName: 128,
  subscriptionKeyword: 255,
  webhookUrl: 1024,
} as const;

/** 分页参数：page 默认 1；pageSize 默认 20，最大 100（api-contract.md §1.3） */
export const PageQuerySchema = z.object({
  page: z.preprocess(
    emptyAsUndefined,
    z.coerce
      .number()
      .int('page 必须为整数')
      .min(1, 'page 必须 ≥ 1')
      .default(DEFAULT_PAGE),
  ),
  pageSize: z.preprocess(
    emptyAsUndefined,
    z.coerce
      .number()
      .int('pageSize 必须为整数')
      .min(1, 'pageSize 必须 ≥ 1')
      .max(MAX_PAGE_SIZE, `pageSize 最大 ${MAX_PAGE_SIZE}`)
      .default(DEFAULT_PAGE_SIZE),
  ),
});

export type PageQuery = z.infer<typeof PageQuerySchema>;

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** YYYY-MM-DD，并校验该日期真实存在 */
export const DateOnlySchema = z
  .string()
  .regex(DATE_ONLY_PATTERN, '日期格式应为 YYYY-MM-DD')
  .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), '日期不存在');

/** 可选日期：缺省或空串视为不筛选 */
export function optionalDateOnly() {
  return z.preprocess(emptyAsUndefined, DateOnlySchema.optional());
}

/** 可选文本：缺省或空串视为不筛选，并按列宽截断校验 */
export function optionalText(max: number, label: string) {
  return z.preprocess(
    emptyAsUndefined,
    z
      .string()
      .trim()
      .max(max, `${label}不超过 ${max} 个字符`)
      .optional(),
  );
}

/** 路径参数 id：正整数（bid_announce.id / bid_subscription.id） */
export const IdSchema = z.coerce.number().int('id 必须为整数').positive('id 必须为正整数');
