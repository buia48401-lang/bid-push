import type { ReactNode } from 'react';

type PageHeaderProps = {
  /** 页面标题，20px / 600 */
  title: string;
  /** 数据来源说明，12px --text-3 */
  note: string;
  /** 页面级按钮位，本期留空 */
  actions?: ReactNode;
};

/** 内容区标题行：左（标题 + 数据来源）+ 右（页面级操作） */
export function PageHeader({ title, note, actions }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="truncate text-title font-semibold text-ink-1">{title}</h1>
        <p className="truncate text-hint text-ink-3">{note}</p>
      </div>
      {actions ? <div className="flex flex-none items-center gap-2">{actions}</div> : null}
    </div>
  );
}
