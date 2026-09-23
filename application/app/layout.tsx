import type { Metadata } from 'next';

import { AppShell } from '@/components/layout/app-shell';
import { APP_TITLE } from '@/lib/constants/ui';

import './globals.css';

export const metadata: Metadata = {
  title: APP_TITLE,
  description: '基于 Next.js 15 + Supabase 的中后台管理框架',
};

export default function RootLayout({ children }: React.PropsWithChildren) {
  // suppressHydrationWarning：浏览器扩展（如 tongyi-design-pc 插件）会在水合前向 <html>
  // 注入属性，导致「服务端 HTML 与客户端 DOM 不匹配」的水合误报；
  // 该属性仅抑制 <html> 标签自身的警告，不影响子树，属 Next.js 对扩展注入场景的推荐做法。
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        {/* 运行时加载字体，避免构建期网络依赖；离线时回落到系统字体栈 */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;600;700&display=swap"
        />
      </head>
      {/* 同 <html>：浏览器扩展（mpa-extension-id 插件）会向 <body> 注入属性，抑制水合误报 */}
      <body suppressHydrationWarning>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
