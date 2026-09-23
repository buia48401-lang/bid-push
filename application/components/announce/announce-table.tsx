import Link from 'next/link';

import { AnnounceTypeTag } from '@/components/announce/announce-type-tag';
import { EMPTY_PLACEHOLDER } from '@/lib/constants/domain';
import { formatBudgetWan, formatDate } from '@/lib/format';
import type { AnnounceListItem } from '@/types/announce';

type Column = {
  label: string;
  /** 预设列宽（product-design.md §4.2），不设即弹性列 */
  width?: string;
  align?: 'right';
};

const COLUMNS: Column[] = [
  { label: '公告标题' },
  { label: '类型', width: 'w-[88px]' },
  { label: '采购人', width: 'w-[150px]' },
  { label: '地区', width: 'w-[90px]' },
  { label: '预算（万元）', width: 'w-[110px]', align: 'right' },
  { label: '发布时间', width: 'w-[110px]' },
  { label: '操作', width: 'w-[80px]' },
];

/** 表格卡（product-design.md §4.2）：表头 40px 灰底，行高 48px 分隔线，空值统一占位符 */
export function AnnounceTable({ items }: { items: AnnounceListItem[] }) {
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
              <th
                key={column.label}
                scope="col"
                className={`px-3 text-body font-medium text-ink-1 ${column.align === 'right' ? 'text-right' : 'text-left'}`}
              >
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
              <td className="overflow-hidden px-3">
                <Link
                  href={`/announces/${item.id}`}
                  className="link-text block truncate"
                  title={item.title}
                >
                  {item.title || EMPTY_PLACEHOLDER}
                </Link>
              </td>
              <td className="overflow-hidden px-3">
                <AnnounceTypeTag announceType={item.announceType} />
              </td>
              <td className="overflow-hidden px-3 text-body text-ink-1">
                <span className="block truncate" title={item.purchaser}>
                  {item.purchaser || EMPTY_PLACEHOLDER}
                </span>
              </td>
              <td className="overflow-hidden px-3 text-body text-ink-1">
                <span className="block truncate">{item.region || EMPTY_PLACEHOLDER}</span>
              </td>
              <td
                className={`overflow-hidden px-3 text-right text-body ${item.budget === null ? 'text-ink-3' : 'text-ink-1'}`}
              >
                {item.budget === null ? EMPTY_PLACEHOLDER : formatBudgetWan(item.budget)}
              </td>
              <td className="overflow-hidden px-3 text-body text-ink-2">
                {item.publishDate ? formatDate(item.publishDate) : EMPTY_PLACEHOLDER}
              </td>
              <td className="overflow-hidden px-3">
                <Link href={`/announces/${item.id}`} className="link-text text-body">
                  查看详情
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
