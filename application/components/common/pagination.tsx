import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export type PaginationParams = Record<string, string | undefined>;

type PaginationProps = {
  /** 当前页，从 1 开始 */
  page: number;
  pageSize: number;
  total: number;
  /** 目标路由（列表页路径，翻页即 URL 导航，供 Server Component 直接渲染） */
  basePath: string;
  /** 需要透传的筛选条件；翻页 href 会保留这些参数 */
  params: PaginationParams;
};

function buildHref(basePath: string, params: PaginationParams, page: number): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      search.set(key, value);
    }
  });
  search.set('page', String(page));

  const queryString = search.toString();

  return queryString ? `${basePath}?${queryString}` : basePath;
}

/** 页码窗口：≤7 页全量展开，否则保留首尾页 + 当前页 ±1，间隔以省略号折叠 */
function buildPageItems(current: number, totalPages: number): Array<number | 'ellipsis'> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set(
    [1, totalPages, current - 1, current, current + 1].filter(
      (value) => value >= 1 && value <= totalPages,
    ),
  );
  const ordered = [...pages].sort((a, b) => a - b);
  const items: Array<number | 'ellipsis'> = [];

  ordered.forEach((value, index) => {
    if (index > 0 && value - (ordered[index - 1] as number) > 1) {
      items.push('ellipsis');
    }
    items.push(value);
  });

  return items;
}

const PAGE_SIZE_CLASS =
  'flex h-6 w-6 flex-none items-center justify-center rounded-ctl border text-hint transition-colors duration-micro';
const IDLE_PAGE_CLASS = `${PAGE_SIZE_CLASS} border-border bg-card text-ink-1 hover:border-brand hover:text-brand`;
const DISABLED_PAGE_CLASS = `${PAGE_SIZE_CLASS} border-border bg-card text-ink-3`;

/** 分页行（product-design.md §4.3）：左统计 + 右页码组（24×24，当前页蓝底白字） */
export function Pagination({ page, pageSize, total, basePath, params }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const showPager = total > pageSize;

  return (
    <div className="flex items-center justify-between">
      <p className="text-hint text-ink-2">
        共 {total} 条记录 · 每页 {pageSize} 条
      </p>
      {showPager ? (
        <nav aria-label="分页" className="flex items-center gap-2">
          {page > 1 ? (
            <Link href={buildHref(basePath, params, page - 1)} aria-label="上一页" className={IDLE_PAGE_CLASS}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <span aria-hidden="true" className={DISABLED_PAGE_CLASS}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </span>
          )}
          {buildPageItems(page, totalPages).map((item, index) =>
            item === 'ellipsis' ? (
              <span key={`ellipsis-${index}`} aria-hidden="true" className="text-hint text-ink-3">
                ···
              </span>
            ) : item === page ? (
              <span
                key={item}
                aria-current="page"
                className={`${PAGE_SIZE_CLASS} border-brand bg-brand font-medium text-white`}
              >
                {item}
              </span>
            ) : (
              <Link key={item} href={buildHref(basePath, params, item)} className={IDLE_PAGE_CLASS}>
                {item}
              </Link>
            ),
          )}
          {page < totalPages ? (
            <Link href={buildHref(basePath, params, page + 1)} aria-label="下一页" className={IDLE_PAGE_CLASS}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <span aria-hidden="true" className={DISABLED_PAGE_CLASS}>
              <ChevronRight className="h-3.5 w-3.5" />
            </span>
          )}
        </nav>
      ) : null}
    </div>
  );
}
