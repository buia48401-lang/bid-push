import type { ReactNode } from 'react';

import { EMPTY_PLACEHOLDER } from '@/lib/constants/domain';
import { formatBudgetWan, formatDateTime, remainingDaysText } from '@/lib/format';
import type { AnnounceDetail } from '@/types/announce';

type InfoRow = {
  label: string;
  value: ReactNode;
  /** 预算金额加粗（product-design.md §5.2） */
  emphasis?: boolean;
  /** 投标截止时间用错误红 */
  danger?: boolean;
};

function buildRows(announce: AnnounceDetail): InfoRow[] {
  const structured = announce.structured;
  const deadline = structured?.deadline ?? null;

  return [
    { label: '采购人', value: announce.purchaser || EMPTY_PLACEHOLDER },
    {
      label: '预算金额',
      value:
        announce.budget === null ? EMPTY_PLACEHOLDER : `${formatBudgetWan(announce.budget)} 万元`,
      emphasis: true,
    },
    {
      label: '投标截止时间',
      value: deadline
        ? `${formatDateTime(deadline)}${remainingDaysText(deadline)}`
        : EMPTY_PLACEHOLDER,
      danger: deadline !== null,
    },
    { label: '代理机构', value: structured?.agency || EMPTY_PLACEHOLDER },
    { label: '联系人', value: structured?.contactPerson || EMPTY_PLACEHOLDER },
    { label: '联系电话', value: structured?.contactPhone || EMPTY_PLACEHOLDER },
  ];
}

/** 基本信息卡（product-design.md §5.2）：两列栅格，标签 12px 辅助色、值 14px 主文本 */
export function AnnounceBasicInfo({ announce }: { announce: AnnounceDetail }) {
  const rows = buildRows(announce);

  return (
    <section className="surface-card p-4">
      <h2 className="text-card-title font-medium text-ink-1">基本信息</h2>
      <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label} className="flex min-w-0 items-baseline gap-3">
            <dt className="w-20 flex-none text-hint text-ink-3">{row.label}</dt>
            <dd
              className={`min-w-0 truncate text-body ${row.danger ? 'text-error' : 'text-ink-1'} ${row.emphasis ? 'font-semibold' : ''}`}
              title={typeof row.value === 'string' ? row.value : undefined}
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
