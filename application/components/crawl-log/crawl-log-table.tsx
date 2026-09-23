import { SiteLevelTag } from '@/components/crawl-log/site-level-tag';
import { EMPTY_PLACEHOLDER } from '@/lib/constants/domain';
import { formatDateTime } from '@/lib/format';
import type { CrawlLogItem } from '@/types/crawl-log';

type Column = {
  label: string;
  width?: string;
};

const COLUMNS: Column[] = [
  { label: '执行时间', width: 'w-[130px]' },
  { label: '源站', width: 'w-[190px]' },
  { label: '抓取总数', width: 'w-[100px]' },
  { label: '成功', width: 'w-[80px]' },
  { label: '失败', width: 'w-[80px]' },
  { label: '人工处理', width: 'w-[90px]' },
  { label: '备注' },
];

/** 数值为 0 时降低视觉权重，避免整屏红绿（product-design.md §9.3） */
function countClass(value: number, activeClass: string, zeroClass: string): string {
  return value > 0 ? `font-medium ${activeClass}` : zeroClass;
}

/** 抓取日志表（product-design.md §8.1）：源站 + 等级小标签，成功/失败/人工数按 0 降权 */
export function CrawlLogTable({ items }: { items: CrawlLogItem[] }) {
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
                {formatDateTime(item.runAt)}
              </td>
              <td className="overflow-hidden px-3">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-body text-ink-1" title={item.sourceSite}>
                    {item.sourceSite || EMPTY_PLACEHOLDER}
                  </span>
                  <SiteLevelTag level={item.siteLevel} />
                </div>
              </td>
              <td className="overflow-hidden px-3 text-body text-ink-1">{item.total}</td>
              <td
                className={`overflow-hidden px-3 text-body ${countClass(item.success, 'text-success', 'text-ink-3')}`}
              >
                {item.success}
              </td>
              <td
                className={`overflow-hidden px-3 text-body ${countClass(item.failed, 'text-error', 'text-ink-3')}`}
              >
                {item.failed}
              </td>
              <td
                className={`overflow-hidden px-3 text-body ${countClass(item.manual, 'text-warn', 'text-ink-2')}`}
              >
                {item.manual}
              </td>
              <td className="overflow-hidden px-3">
                <span
                  className={`block truncate text-body ${item.note ? 'text-ink-2' : 'text-ink-3'}`}
                  title={item.note}
                >
                  {item.note || EMPTY_PLACEHOLDER}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
