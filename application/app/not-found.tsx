import Link from 'next/link';
import { FileQuestion } from 'lucide-react';

/** 未匹配路由兜底页：保持外壳不变，避免白屏 */
export default function NotFound() {
  return (
    <section className="surface-card flex min-h-[320px] flex-1 flex-col items-center justify-center gap-3 px-6 py-12">
      <span
        aria-hidden="true"
        className="flex h-11 w-11 items-center justify-center rounded-full bg-th"
      >
        <FileQuestion strokeWidth={1.75} className="h-5 w-5 text-ink-3" />
      </span>
      <p className="text-card-title font-medium text-ink-1">页面不存在</p>
      <p className="text-hint text-ink-3">链接可能已失效，或该页面尚未开发</p>
      <Link href="/" className="link-text text-body">
        返回首页
      </Link>
    </section>
  );
}
