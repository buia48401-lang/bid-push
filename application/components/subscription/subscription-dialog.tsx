'use client';

import { useState, type FormEvent } from 'react';
import { X } from 'lucide-react';

import {
  ALL_TYPES_LABEL,
  ANNOUNCE_TYPES,
  CHANNEL_LABELS,
  SUBSCRIPTION_CHANNELS,
  UNLIMITED_LABEL,
} from '@/lib/constants/domain';
import { SubscriptionUpsertSchema } from '@/lib/validation/subscription';
import type { SubscriptionItem } from '@/types/subscription';

export type SubscriptionDialogTarget = { mode: 'create' } | { mode: 'edit'; item: SubscriptionItem };

type SubscriptionDialogProps = {
  target: SubscriptionDialogTarget;
  /** 地区下拉选项：现有订阅地区去重（无字典表，product-design.md §6.2） */
  regionOptions: string[];
  onClose: () => void;
  onSaved: () => void;
};

/** 控件样式与公告筛选卡一致：高 32px、3px 圆角、描边 --border */
const CONTROL_CLASS =
  'h-8 rounded-ctl border border-border bg-card px-2.5 text-body text-ink-1 outline-none transition-colors duration-micro placeholder:text-ink-3 focus:border-brand disabled:bg-th';
const PRIMARY_BUTTON_CLASS =
  'h-8 w-[88px] flex-none rounded-ctl bg-brand text-body text-white transition-colors duration-micro hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60';
const DEFAULT_BUTTON_CLASS =
  'flex h-8 w-[88px] flex-none items-center justify-center rounded-ctl border border-border bg-card text-body text-ink-1 transition-colors duration-micro hover:border-brand hover:text-brand';
const FIELD_ERROR_CLASS = 'text-hint text-error';

type FormState = {
  name: string;
  keyword: string;
  region: string;
  announceType: string;
  channel: string;
  webhookUrl: string;
};

/**
 * 新建 / 编辑订阅弹窗（product-design.md §6.2）。
 *
 * - 前端复用 SubscriptionUpsertSchema 校验（与接口同 schema），错误行内红字显示；
 * - 🔴 PUT 为全量覆盖：编辑时必须携带原 enabled 提交，否则停用中的订阅会被默认值重新启用；
 * - webhookUrl 仅作为可编辑表单值出现，页面只读文本不做完整展示。
 */
export function SubscriptionDialog({ target, regionOptions, onClose, onSaved }: SubscriptionDialogProps) {
  const item = target.mode === 'edit' ? target.item : null;

  const [form, setForm] = useState<FormState>({
    name: item?.name ?? '',
    keyword: item?.keyword ?? '',
    region: item?.region ?? '',
    announceType: item?.announceType ?? '',
    channel: item?.channel ?? 'feishu_webhook',
    webhookUrl: item?.webhookUrl ?? '',
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  /** 编辑原地区可能不在现有选项中，追加保证回显 */
  const regions =
    form.region && !regionOptions.includes(form.region) ? [...regionOptions, form.region] : regionOptions;

  function updateField<K extends keyof FormState>(key: K, value: string): void {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function renderFieldError(key: keyof FormState) {
    return fieldErrors[key] ? <span className={FIELD_ERROR_CLASS}>{fieldErrors[key]}</span> : null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError('');

    const parsed = SubscriptionUpsertSchema.safeParse(form);

    if (!parsed.success) {
      const errors: Record<string, string> = {};

      for (const issue of parsed.error.issues) {
        const key = issue.path[0];

        if (typeof key === 'string' && !errors[key]) {
          errors[key] = issue.message;
        }
      }

      setFieldErrors(errors);

      return;
    }

    setFieldErrors({});
    setSubmitting(true);

    try {
      const res = await fetch(
        item ? `/api/subscriptions/${item.id}` : '/api/subscriptions',
        {
          method: item ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...parsed.data, enabled: item?.enabled ?? true }),
        },
      );
      const body = (await res.json()) as { code: number; message?: string };

      if (!res.ok || body.code !== 0) {
        setSubmitError(body.message || '保存失败，请稍后重试');

        return;
      }

      onSaved();
    } catch {
      setSubmitError('网络异常，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={item ? '编辑订阅' : '新建订阅'}
        className="surface-card max-h-full w-full max-w-[480px] overflow-y-auto p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-card-title font-medium text-ink-1">{item ? '编辑订阅' : '新建订阅'}</h2>
          <button
            type="button"
            aria-label="关闭"
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded-ctl text-ink-3 transition-colors duration-micro hover:bg-th hover:text-ink-1"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} noValidate className="mt-4 flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-hint text-ink-2">
              订阅名称 <span aria-hidden="true" className="text-error">*</span>
            </span>
            <input
              type="text"
              value={form.name}
              onChange={(event) => updateField('name', event.target.value)}
              placeholder="如：广东智慧城市项目"
              maxLength={128}
              className={CONTROL_CLASS}
            />
            {renderFieldError('name')}
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-hint text-ink-2">关键词（多个用 / 分隔，空 = 不限）</span>
            <input
              type="text"
              value={form.keyword}
              onChange={(event) => updateField('keyword', event.target.value)}
              placeholder="如：智慧城市/数据中心"
              maxLength={255}
              className={CONTROL_CLASS}
            />
            {renderFieldError('keyword')}
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-hint text-ink-2">地区（空 = 不限）</span>
              <select
                value={form.region}
                onChange={(event) => updateField('region', event.target.value)}
                className={CONTROL_CLASS}
              >
                <option value="">{UNLIMITED_LABEL}</option>
                {regions.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
              {renderFieldError('region')}
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-hint text-ink-2">公告类型（空 = 全部类型）</span>
              <select
                value={form.announceType}
                onChange={(event) => updateField('announceType', event.target.value)}
                className={CONTROL_CLASS}
              >
                <option value="">{ALL_TYPES_LABEL}</option>
                {ANNOUNCE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              {renderFieldError('announceType')}
            </label>
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-hint text-ink-2">推送渠道</span>
            <select
              value={form.channel}
              onChange={(event) => updateField('channel', event.target.value)}
              className={CONTROL_CLASS}
            >
              {SUBSCRIPTION_CHANNELS.map((channel) => (
                <option key={channel} value={channel}>
                  {CHANNEL_LABELS[channel]}
                </option>
              ))}
            </select>
            {renderFieldError('channel')}
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-hint text-ink-2">
              Webhook 地址 <span aria-hidden="true" className="text-error">*</span>
            </span>
            <input
              type="url"
              value={form.webhookUrl}
              onChange={(event) => updateField('webhookUrl', event.target.value)}
              placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/..."
              maxLength={1024}
              className={CONTROL_CLASS}
            />
            {renderFieldError('webhookUrl')}
          </label>
          {submitError ? (
            <p role="alert" className={FIELD_ERROR_CLASS}>
              {submitError}
            </p>
          ) : null}
          <div className="mt-1 flex items-center justify-end gap-3">
            <button type="button" onClick={onClose} className={DEFAULT_BUTTON_CLASS}>
              取消
            </button>
            <button type="submit" disabled={submitting} className={PRIMARY_BUTTON_CLASS}>
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
