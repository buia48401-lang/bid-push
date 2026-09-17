import type { Metadata } from 'next';

import { AppShell } from '@/components/layout/app-shell';

import './globals.css';

export const metadata: Metadata = {
  title: '招投标信息平台',
  description: '招投标公告采集、订阅匹配与飞书推送的内部后台',
};

export default function RootLayout({ children }: React.PropsWithChildren) {
  return (
    <html lang="zh-CN">
      <head>
        {/* 运行时加载字体，避免构建期网络依赖；离线时回落到系统字体栈 */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
