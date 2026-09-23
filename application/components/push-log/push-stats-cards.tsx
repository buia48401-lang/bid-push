import { formatCount } from '@/lib/utils/format';
import type { PushLogStats } from '@/types/push-log';

/** 统计卡定义：数值色按语义（product-design.md §7.1），标签 12px --text-3 */
const CARDS: Array<{ label: string; pick: (stats: PushLogStats) => number; valueClass: string }> = [
  { label: '今日推送', pick: (stats) => stats.todayTotal, valueClass: 'text-ink-1' },
  { label: '推送成功', pick: (stats) => stats.todaySuccess, valueClass: 'text-success' },
  { label: '推送失败', pick: (stats) => stats.todayFailed, valueClass: 'text-error' },
];

/** 今日推送统计卡行：三张等高卡，数值 24px / 600（product-design.md §7.1） */
export function PushStatsCards({ stats }: { stats: PushLogStats }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {CARDS.map((card) => (
        <section key={card.label} className="surface-card p-4">
          <p className="text-hint text-ink-3">{card.label}</p>
          <p className={`mt-1 text-[24px] font-semibold leading-8 ${card.valueClass}`}>
            {formatCount(card.pick(stats))}
          </p>
        </section>
      ))}
    </div>
  );
}
