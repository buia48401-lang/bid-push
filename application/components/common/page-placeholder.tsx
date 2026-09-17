import { SquareDashed } from 'lucide-react';

type PagePlaceholderProps = {
  title?: string;
  description?: string;
};

/**
 * 本期架构阶段的临时占位块：页面骨架已就绪，业务界面（筛选卡 / 表格 / 表单）
 * 由后续页面模块实现并替换本组件。
 */
export function PagePlaceholder({
  title = '页面骨架已就绪',
  description = '筛选、表格与表单将在后续页面模块中实现',
}: PagePlaceholderProps) {
  return (
    <section className="surface-card flex min-h-[320px] flex-1 flex-col items-center justify-center gap-3 px-6 py-12">
      <span
        aria-hidden="true"
        className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-bg"
      >
        <SquareDashed strokeWidth={1.75} className="h-5 w-5 text-brand" />
      </span>
      <p className="text-card-title font-medium text-ink-1">{title}</p>
      <p className="text-hint text-ink-3">{description}</p>
    </section>
  );
}
