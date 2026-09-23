'use client';

type SubscriptionSwitchProps = {
  checked: boolean;
  /** 提交中禁用，防止连续点击造成覆盖错乱 */
  disabled?: boolean;
  onToggle: () => void;
  /** 无可见文本，必须提供可访问名称 */
  ariaLabel: string;
};

/** 启用状态开关（product-design.md §6.1 / §9.2）：36×20，启用蓝 / 停用灰，200ms 滑动过渡 */
export function SubscriptionSwitch({ checked, disabled, onToggle, ariaLabel }: SubscriptionSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onToggle}
      className={`relative inline-flex h-5 w-9 flex-none items-center rounded-full transition-colors duration-micro ${
        checked ? 'bg-brand' : 'bg-ink-3'
      } disabled:cursor-not-allowed disabled:opacity-60`}
    >
      <span
        aria-hidden="true"
        className={`inline-block h-4 w-4 transform rounded-full bg-card shadow transition-transform duration-micro ${
          checked ? 'translate-x-[18px]' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}
