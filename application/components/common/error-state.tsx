'use client';

import { CircleAlert, RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';

type ErrorStateProps = {
  /** 失败原因，默认给通用的排查提示 */
  message?: string;
  /** 传入即显示「重试」按钮 */
  onRetry?: () => void;
};

/** 错误态：卡片内错误提示 + 「重试」按钮，避免整页白屏 */
export function ErrorState({
  message = '请稍后重试，如持续失败请联系管理员',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12">
      <span
        aria-hidden="true"
        className="flex h-11 w-11 items-center justify-center rounded-full bg-error-bg"
      >
        <CircleAlert strokeWidth={1.75} className="h-5 w-5 text-error" />
      </span>
      <p className="text-body font-medium text-ink-1">数据加载失败</p>
      <p className="text-hint text-ink-3">{message}</p>
      {onRetry ? (
        <Button variant="default" onClick={onRetry}>
          <RotateCcw aria-hidden="true" strokeWidth={1.75} className="h-3.5 w-3.5" />
          重试
        </Button>
      ) : null}
    </div>
  );
}
