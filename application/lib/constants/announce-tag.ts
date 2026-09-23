import { ANNOUNCE_TYPES } from '@/lib/constants/domain';

/**
 * 公告类型 → 语义色变体映射（product-design.md §2.3）：
 * 招标公告=品牌蓝；中标/成交=成功绿；更正=警告橙；其余=中性灰。
 * 字面量一律取自 ANNOUNCE_TYPES 常量，禁止在本文件硬编码中文枚举。
 */

export type TagVariant = 'brand' | 'success' | 'warn' | 'muted';

const [TENDER, WIN_BID, DEAL, NEGOTIATION, INQUIRY, AMENDMENT, OTHER] = ANNOUNCE_TYPES;

const VARIANT_BY_TYPE: Record<string, TagVariant> = {
  [TENDER]: 'brand',
  [WIN_BID]: 'success',
  [DEAL]: 'success',
  [NEGOTIATION]: 'muted',
  [INQUIRY]: 'muted',
  [AMENDMENT]: 'warn',
  [OTHER]: 'muted',
};

/** 未知类型（数据库自由文本）回退中性灰，展示不报错 */
export function announceTypeTagVariant(announceType: string): TagVariant {
  return VARIANT_BY_TYPE[announceType] ?? 'muted';
}
