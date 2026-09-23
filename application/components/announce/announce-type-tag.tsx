import { announceTypeTagVariant, type TagVariant } from '@/lib/constants/announce-tag';
import { EMPTY_PLACEHOLDER } from '@/lib/constants/domain';

/** 变体 → token 语义类（product-design.md §2.3 语义色规则） */
const VARIANT_CLASSES: Record<TagVariant, string> = {
  brand: 'bg-brand-bg text-brand',
  success: 'bg-success-bg text-success',
  warn: 'bg-warn-bg text-warn',
  muted: 'bg-th text-ink-2',
};

type AnnounceTypeTagProps = {
  announceType: string;
};

/** 公告类型语义 Tag：22px 高、12px 字号、3px 圆角（product-design.md §2.2） */
export function AnnounceTypeTag({ announceType }: AnnounceTypeTagProps) {
  const variant = announceTypeTagVariant(announceType);

  return (
    <span
      className={`inline-flex h-[22px] flex-none items-center whitespace-nowrap rounded-ctl px-2 text-hint font-medium ${VARIANT_CLASSES[variant]}`}
    >
      {announceType || EMPTY_PLACEHOLDER}
    </span>
  );
}
