'use client';

import { ErrorState } from '@/components/common/error-state';

type AppErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/** 路由级错误边界：保留外壳，内容区展示错误提示与重试 */
export default function AppError({ error, reset }: AppErrorProps) {
  console.error('[app] 页面渲染异常', error);

  return (
    <section className="surface-card flex min-h-[320px] flex-1 items-center justify-center">
      <ErrorState message={error.message} onRetry={reset} />
    </section>
  );
}
