import { Inbox, type LucideIcon } from 'lucide-react';

type EmptyStateProps = {
  icon?: LucideIcon;
  title?: string;
  description?: string;
};

/** 空数据态：图标 + 「暂无数据」+ 说明文案 */
export function EmptyState({
  icon: Icon = Inbox,
  title = '暂无数据',
  description = '当前条件下没有可展示的记录',
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12">
      <span
        aria-hidden="true"
        className="flex h-11 w-11 items-center justify-center rounded-full bg-th"
      >
        <Icon strokeWidth={1.75} className="h-5 w-5 text-ink-3" />
      </span>
      <p className="text-body font-medium text-ink-1">{title}</p>
      <p className="text-hint text-ink-3">{description}</p>
    </div>
  );
}
