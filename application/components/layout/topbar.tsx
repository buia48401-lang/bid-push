import { Bell } from 'lucide-react';

import { Breadcrumb } from '@/components/layout/breadcrumb';

/** 顶栏 56px：左侧面包屑，右侧铃铛 + 竖分隔线 + 静态用户（MVP 无登录） */
export function Topbar() {
  return (
    <header className="flex h-topbar flex-none items-center justify-between bg-card px-6">
      <Breadcrumb />

      <div className="flex items-center gap-4">
        <button
          type="button"
          aria-label="通知"
          className="flex h-7 w-7 items-center justify-center rounded-ctl text-ink-2 transition-colors duration-micro hover:bg-row-hover hover:text-ink-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <Bell aria-hidden="true" strokeWidth={1.75} className="h-4 w-4" />
        </button>

        <span aria-hidden="true" className="h-4 w-px bg-border" />

        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-hint font-medium text-white"
          >
            陈
          </span>
          <span className="text-body text-ink-1">陈钢</span>
        </div>
      </div>
    </header>
  );
}
