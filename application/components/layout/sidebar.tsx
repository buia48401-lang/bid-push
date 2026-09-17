'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, FileText, List, Send, type LucideIcon } from 'lucide-react';

import { NAV_ITEMS, resolveNavigation, type NavIcon } from '@/lib/constants/nav';
import { cn } from '@/lib/utils';

const NAV_ICONS: Record<NavIcon, LucideIcon> = {
  list: List,
  bell: Bell,
  send: Send,
  doc: FileText,
};

/**
 * 左侧导航：240px（<1200px 收窄 200px）。
 * 选中态 = 浅蓝底 + 左侧 3px 蓝条 + 蓝色 500 字重；公告详情页复用「公告列表」高亮。
 */
export function Sidebar() {
  const pathname = usePathname();
  const { activeKey } = resolveNavigation(pathname);

  return (
    <aside className="flex w-sidebar flex-none flex-col bg-card narrow:w-sidebar-narrow">
      <div className="flex h-topbar flex-none items-center gap-2.5 pl-5">
        <span className="logo-mark" aria-hidden="true">
          招
        </span>
        <span className="text-[15px] font-semibold text-ink-1">招投标信息平台</span>
      </div>

      <nav className="flex flex-col gap-1 p-3" aria-label="主导航">
        {NAV_ITEMS.map((item) => {
          const Icon = NAV_ICONS[item.icon];
          const active = item.key === activeKey;

          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex h-10 items-center gap-2.5 rounded-ctl pl-3 transition-colors duration-micro',
                active ? 'bg-brand-bg' : 'hover:bg-row-hover',
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'h-4 w-[3px] flex-none rounded-full',
                  active ? 'bg-brand' : 'bg-transparent',
                )}
              />
              <Icon
                aria-hidden="true"
                strokeWidth={1.75}
                className={cn('h-4 w-4 flex-none', active ? 'text-brand' : 'text-ink-2')}
              />
              <span
                className={cn(
                  'text-body',
                  active ? 'font-medium text-brand' : 'font-normal text-ink-2',
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
