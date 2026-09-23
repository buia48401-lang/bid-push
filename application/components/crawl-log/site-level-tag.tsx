import { EMPTY_PLACEHOLDER, SITE_LEVELS } from '@/lib/constants/domain';

/** 站点等级 → 语义色（product-design.md §8.1）：A 级绿 / B 级橙 / C 级灰 */
const [LEVEL_A, LEVEL_B, LEVEL_C] = SITE_LEVELS;

const VARIANT_CLASS_BY_LEVEL: Record<string, string> = {
  [LEVEL_A]: 'bg-success-bg text-success',
  [LEVEL_B]: 'bg-warn-bg text-warn',
  [LEVEL_C]: 'bg-th text-ink-2',
};

/**
 * 站点等级小标签（20px 高）。
 * 🔴 site_level 无 CHECK 约束（迁移 002 刻意为之），空串显示「—」、意外取值回退中性灰。
 */
export function SiteLevelTag({ level }: { level: string }) {
  if (!level) {
    return <span className="text-hint text-ink-3">{EMPTY_PLACEHOLDER}</span>;
  }

  const variantClass = VARIANT_CLASS_BY_LEVEL[level] ?? 'bg-th text-ink-2';

  return (
    <span
      className={`inline-flex h-5 flex-none items-center whitespace-nowrap rounded-ctl px-1.5 text-hint ${variantClass}`}
    >
      {level}
    </span>
  );
}
