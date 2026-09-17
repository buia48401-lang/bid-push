import type { PropsWithChildren } from 'react';

import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';

/**
 * 通用外壳：顶栏（56px，整宽）+ 侧栏（240px）+ 灰底内容区。
 * 5 个业务页面共用，页面自身只关心内容区。
 */
export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Topbar />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto bg-page p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
