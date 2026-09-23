import { PUSH_STATUSES } from '@/lib/constants/domain';
import { EMPTY_PLACEHOLDER } from '@/lib/constants/domain';

/** 推送状态 → 语义色（product-design.md §7.2）：成功绿 / 失败红 / 待重试橙，未知值中性灰 */
const [SUCCESS, FAILED, RETRY] = PUSH_STATUSES;

const VARIANT_CLASS_BY_STATUS: Record<string, string> = {
  [SUCCESS]: 'bg-success-bg text-success',
  [FAILED]: 'bg-error-bg text-error',
  [RETRY]: 'bg-warn-bg text-warn',
};

/** 推送状态语义 Tag：22px 高、12px 字号、3px 圆角（与公告类型 Tag 同规格） */
export function PushStatusTag({ status }: { status: string }) {
  const variantClass = VARIANT_CLASS_BY_STATUS[status] ?? 'bg-th text-ink-2';

  return (
    <span
      className={`inline-flex h-[22px] flex-none items-center whitespace-nowrap rounded-ctl px-2 text-hint font-medium ${variantClass}`}
    >
      {status || EMPTY_PLACEHOLDER}
    </span>
  );
}
