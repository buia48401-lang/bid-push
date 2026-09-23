import { SearchX } from 'lucide-react';

import { AnnounceFilterCard } from '@/components/announce/announce-filter-card';
import { AnnounceTable } from '@/components/announce/announce-table';
import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import { Pagination } from '@/components/common/pagination';
import { getNavItem, sourceNote } from '@/lib/constants/nav';
import { listAnnounces } from '@/lib/data/announces';
import { AnnounceListQuerySchema } from '@/lib/validation/announce';

const NAV = getNavItem('announces');

type AnnouncesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * URL 查询串 → 列表查询条件。
 * 沿用契约 §3.1 的 Zod 语义；手输非法 URL 时回退默认条件而非报错，保证页面始终可浏览。
 */
function parseFilters(raw: Record<string, string | string[] | undefined>) {
  const normalized = Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  );
  const parsed = AnnounceListQuerySchema.safeParse(normalized);

  return parsed.success ? parsed.data : AnnounceListQuerySchema.parse({});
}

/** 页面 1 · 公告列表（product-design.md §4）：筛选卡 + 表格卡 + 分页行 */
export default async function AnnouncesPage({ searchParams }: AnnouncesPageProps) {
  const query = parseFilters(await searchParams);
  const result = await listAnnounces(query);

  const hasFilter = Boolean(
    query.keyword ?? query.region ?? query.announceType ?? query.startDate ?? query.endDate,
  );

  const filterValues = {
    keyword: query.keyword ?? '',
    region: query.region ?? '',
    announceType: query.announceType ?? '',
    startDate: query.startDate ?? '',
    endDate: query.endDate ?? '',
  };

  const paginationParams = {
    keyword: query.keyword,
    region: query.region,
    announceType: query.announceType,
    startDate: query.startDate,
    endDate: query.endDate,
  };

  return (
    <>
      <PageHeader title={NAV.label} note={sourceNote(NAV.sourceTable)} />
      {/* key 随条件变化强制重挂载，保证重置 / 翻页后筛选控件与 URL 同步 */}
      <AnnounceFilterCard key={JSON.stringify(filterValues)} initial={filterValues} />
      {result.list.length === 0 ? (
        <section className="surface-card">
          {hasFilter ? (
            <EmptyState icon={SearchX} title="没有符合条件的公告" description="试试调整筛选条件" />
          ) : (
            <EmptyState />
          )}
        </section>
      ) : (
        <section className="surface-card p-4">
          <AnnounceTable items={result.list} />
        </section>
      )}
      {result.list.length > 0 ? (
        <Pagination
          page={result.page}
          pageSize={result.pageSize}
          total={result.total}
          basePath="/announces"
          params={paginationParams}
        />
      ) : null}
    </>
  );
}
