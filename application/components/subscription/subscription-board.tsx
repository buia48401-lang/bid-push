'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { AnnounceTypeTag } from '@/components/announce/announce-type-tag';
import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import {
  SubscriptionDialog,
  type SubscriptionDialogTarget,
} from '@/components/subscription/subscription-dialog';
import { SubscriptionSwitch } from '@/components/subscription/subscription-switch';
import {
  ALL_TYPES_LABEL,
  channelLabel,
  EMPTY_PLACEHOLDER,
  UNLIMITED_LABEL,
} from '@/lib/constants/domain';
import { getNavItem, sourceNote } from '@/lib/constants/nav';
import type { SubscriptionItem, SubscriptionListResult } from '@/types/subscription';

type Column = {
  label: string;
  width?: string;
};

const COLUMNS: Column[] = [
  { label: '订阅名称' },
  { label: '关键词', width: 'w-[170px]' },
  { label: '地区', width: 'w-[90px]' },
  { label: '公告类型', width: 'w-[100px]' },
  { label: '推送渠道', width: 'w-[130px]' },
  { label: '状态', width: 'w-[90px]' },
  { label: '操作', width: 'w-[120px]' },
];

const PRIMARY_BUTTON_CLASS =
  'h-8 w-[88px] flex-none rounded-ctl bg-brand text-body text-white transition-colors duration-micro hover:bg-brand-hover';

/** 行操作链接（停用用错误红，product-design.md §6.1） */
const EDIT_BUTTON_CLASS = 'link-text text-body';
const DISABLE_BUTTON_CLASS =
  'cursor-pointer text-body text-error transition-colors duration-micro hover:underline disabled:cursor-not-allowed disabled:opacity-60';
const ENABLE_BUTTON_CLASS =
  'cursor-pointer text-body text-ink-1 transition-colors duration-micro hover:text-brand hover:underline disabled:cursor-not-allowed disabled:opacity-60';

/**
 * 订阅管理面板（product-design.md §6）：标题行 + 表格卡 + 新建/编辑弹窗。
 *
 * Client Component 原因：开关切换（乐观更新）、弹窗表单与路由刷新均需要交互。
 * 列表主体始终以服务端数据渲染（router.refresh() 后 props 更新自动生效），
 * enabledOverrides 只承载开关的瞬时乐观差异，成功清除、失败回滚。
 */
export function SubscriptionBoard({ initial }: { initial: SubscriptionListResult }) {
  const router = useRouter();
  const NAV = getNavItem('subscriptions');

  const [dialog, setDialog] = useState<SubscriptionDialogTarget | null>(null);
  const [enabledOverrides, setEnabledOverrides] = useState<Record<number, boolean>>({});
  const [actionError, setActionError] = useState('');
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const list = initial.list.map((item) => ({
    ...item,
    enabled: item.id in enabledOverrides ? (enabledOverrides[item.id] as boolean) : item.enabled,
  }));
  const enabledCount = list.filter((item) => item.enabled).length;

  /** 现有订阅地区去重，供弹窗地区下拉（无字典表） */
  const regionOptions = [...new Set(initial.list.map((item) => item.region).filter(Boolean))];

  function clearOverride(id: number): void {
    setEnabledOverrides((prev) => {
      const next = { ...prev };

      delete next[id];

      return next;
    });
  }

  /**
   * 切换启用状态：乐观翻转 → PUT 完整对象（全量覆盖）→ 成功后以服务端数据为准。
   * 失败回滚显示原状态，并在标题行下方提示原因。
   */
  async function toggleEnabled(item: SubscriptionItem) {
    const next = !item.enabled;

    setActionError('');
    setTogglingId(item.id);
    setEnabledOverrides((prev) => ({ ...prev, [item.id]: next }));

    try {
      const res = await fetch(`/api/subscriptions/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...item, enabled: next }),
      });
      const body = (await res.json()) as { code: number; message?: string };

      if (!res.ok || body.code !== 0) {
        throw new Error(body.message || '操作失败，请稍后重试');
      }

      clearOverride(item.id);
      router.refresh();
    } catch (error) {
      clearOverride(item.id);
      setActionError(error instanceof Error ? error.message : '操作失败，请稍后重试');
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <>
      <PageHeader
        title={NAV.label}
        note={sourceNote(NAV.sourceTable, `已启用 ${enabledCount} / 共 ${list.length} 条订阅`)}
        actions={
          <button type="button" onClick={() => setDialog({ mode: 'create' })} className={PRIMARY_BUTTON_CLASS}>
            新建订阅
          </button>
        }
      />
      {actionError ? (
        <p role="alert" className="text-hint text-error">
          {actionError}
        </p>
      ) : null}
      {list.length === 0 ? (
        <section className="surface-card">
          <EmptyState description="还没有订阅，点击右上角「新建订阅」开始接收推送" />
        </section>
      ) : (
        <section className="surface-card p-4">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] table-fixed border-collapse">
              <colgroup>
                {COLUMNS.map((column) => (
                  <col key={column.label} className={column.width} />
                ))}
              </colgroup>
              <thead>
                <tr className="h-th-row bg-th">
                  {COLUMNS.map((column) => (
                    <th
                      key={column.label}
                      scope="col"
                      className="px-3 text-left text-body font-medium text-ink-1"
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.map((item) => (
                  <tr
                    key={item.id}
                    className="h-row border-b border-line bg-card transition-colors duration-micro last:border-b-0 hover:bg-row-hover"
                  >
                    <td className="overflow-hidden px-3">
                      <span className="block truncate text-body text-ink-1" title={item.name}>
                        {item.name || EMPTY_PLACEHOLDER}
                      </span>
                    </td>
                    <td className="overflow-hidden px-3 text-body text-ink-1">
                      <span className="block truncate" title={item.keyword || UNLIMITED_LABEL}>
                        {item.keyword || UNLIMITED_LABEL}
                      </span>
                    </td>
                    <td className="overflow-hidden px-3 text-body text-ink-1">
                      <span className="block truncate">{item.region || UNLIMITED_LABEL}</span>
                    </td>
                    <td className="overflow-hidden px-3">
                      {item.announceType ? (
                        <AnnounceTypeTag announceType={item.announceType} />
                      ) : (
                        <AnnounceTypeTag announceType={ALL_TYPES_LABEL} />
                      )}
                    </td>
                    <td className="overflow-hidden px-3 text-body text-ink-1">
                      {channelLabel(item.channel)}
                    </td>
                    <td className="overflow-hidden px-3">
                      <SubscriptionSwitch
                        checked={item.enabled}
                        disabled={togglingId === item.id}
                        onToggle={() => toggleEnabled(item)}
                        ariaLabel={`订阅「${item.name}」启用状态`}
                      />
                    </td>
                    <td className="overflow-hidden px-3">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setDialog({ mode: 'edit', item })}
                          className={EDIT_BUTTON_CLASS}
                        >
                          编辑
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleEnabled(item)}
                          disabled={togglingId === item.id}
                          className={item.enabled ? DISABLE_BUTTON_CLASS : ENABLE_BUTTON_CLASS}
                        >
                          {item.enabled ? '停用' : '启用'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {dialog ? (
        <SubscriptionDialog
          key={dialog.mode === 'edit' ? `edit-${dialog.item.id}` : 'create'}
          target={dialog}
          regionOptions={regionOptions}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            setEnabledOverrides({});
            router.refresh();
          }}
        />
      ) : null}
    </>
  );
}
