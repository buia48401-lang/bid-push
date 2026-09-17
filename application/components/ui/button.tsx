import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

/**
 * 按钮基元：按 docs/product-design.md §2.2 固定 88×32、圆角 3px、hover 转 #0046BB。
 * 变体只使用语义类名，不写裸色值。
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-ctl font-normal transition-colors duration-micro focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        /** 主按钮：品牌蓝底 */
        primary: 'bg-brand text-white hover:bg-brand-hover',
        /** 默认按钮：白底描边，hover 边框与文字转品牌蓝 */
        default: 'border border-border bg-card text-ink-1 hover:border-brand hover:text-brand',
        /** 幽灵按钮 */
        ghost: 'text-ink-2 hover:bg-row-hover hover:text-ink-1',
        /** 破坏性操作（停用） */
        destructive: 'text-error hover:bg-error-bg',
        /** 文本链接型 */
        link: 'text-brand hover:underline',
      },
      size: {
        default: 'h-8 px-4 text-body',
        sm: 'h-7 px-3 text-hint',
        icon: 'h-8 w-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export type ButtonProps = React.ComponentProps<'button'> & VariantProps<typeof buttonVariants>;

function Button({ className, variant, size, type = 'button', ...props }: ButtonProps) {
  return (
    <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
}

export { Button, buttonVariants };
