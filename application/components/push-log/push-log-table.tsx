import Link from 'next/link';

import { PushStatusTag } from '@/components/push-log/push-status-tag';
import { EMPTY_PLACEHOLDER } from '@/lib/constants/domain';
import { channelLabel } from '@/lib/constants/domain';
import { formatDateTime } from '@/lib/format';
import type { PushLogItem } from '@/types/push-log';

type Column = {
  label: string;
  width?: string;
};

const COLUMNS: Column[] = [
  { label: '推送时间', width: 'w-[120px]' },
  { label: '接收订阅', width: 'w-[150px]' },
  { label: '匹配公告' },
  { label: '渠道', width: 'w-[90px]' },
  { label: '状态', width: 'w-[80px]' },
  { label: '失败原因', width: 'w-[220px]' },
];

/** 推送明细表（product-design.md §7.2）：失败时回退展示创建时间，失败原因红色 */
export function PushLogTable({ items }: { items: PushLogItem[] }) {
  return (
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
              <th key={column.label} scope="col" className="px-3 text-left text-body font-medium text-ink-1">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.id}
              className="h-row border-b border-line bg-card transition-colors duration-micro last:border-b-0 hover:bg-row-hover"
            >
              <td className="overflow-hidden px-3 text-body text-ink-2">
                {formatDateTime(item.sentAt ?? item.createdAt)}
              </td>
              <td className="overflow-hidden px-3 text-body text-ink-1">
                <span className="block truncate" title={item.subscriptionName}>
                  {item.subscriptionName || EMPTY_PLACEHOLDER}
                </span>
              </td>
              <td className="overflow-hidden px-3">
                <Link
                  href={`/announces/${item.announceId}`}
                  className="link-text block truncate text-body"
                  title={item.announceTitle}
                >
                  {item.announceTitle || EMPTY_PLACEHOLDER}
                </Link>
              </td>
              <td className="overflow-hidden px-3 text-body text-ink-1">
                {channelLabel(item.channel) || EMPTY_PLACEHOLDER}
              </td>
              <td className="overflow-hidden px-3">
                <PushStatusTag status={item.status} />
              </td>
              <td className="overflow-hidden px-3">
                {item.errorMessage ? (
                  <span className="block truncate text-body text-error" title={item.errorMessage}>
                    {item.errorMessage}
                  </span>
                ) : (
                  <span className="text-body text-ink-3">{EMPTY_PLACEHOLDER}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
