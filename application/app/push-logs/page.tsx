import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import { Pagination } from '@/components/common/pagination';
import { PushLogTable } from '@/components/push-log/push-log-table';
import { PushStatsCards } from '@/components/push-log/push-stats-cards';
import { getNavItem, sourceNote } from '@/lib/constants/nav';
import { listPushLogs } from '@/lib/data/push-logs';
import { PushLogQuerySchema } from '@/lib/validation/push-log';

const NAV = getNavItem('push-logs');

type PushLogsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * URL 查询串 → 列表查询条件。
 * 手输非法 URL 时回退默认条件而非报错，保证页面始终可浏览（与公告列表同模式）。
 */
function parseFilters(raw: Record<string, string | string[] | undefined>) {
  const normalized = Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  );
  const parsed = PushLogQuerySchema.safeParse(normalized);

  return parsed.success ? parsed.data : PushLogQuerySchema.parse({});
}

/** 页面 4 · 推送记录（product-design.md §7）：统计卡行 + 推送明细表 */
export default async function PushLogsPage({ searchParams }: PushLogsPageProps) {
  const query = parseFilters(await searchParams);
  const result = await listPushLogs(query);

  return (
    <>
      <PageHeader
        title={NAV.label}
        note={sourceNote(
          NAV.sourceTable,
          `今日推送 ${result.stats.todayTotal} 次，成功率 ${result.stats.successRate}%`,
        )}
      />
      <PushStatsCards stats={result.stats} />
      {result.list.length === 0 ? (
        <section className="surface-card">
          <EmptyState />
        </section>
      ) : (
        <section className="surface-card p-4">
          <PushLogTable items={result.list} />
        </section>
      )}
      {result.list.length > 0 ? (
        <Pagination
          page={result.page}
          pageSize={result.pageSize}
          total={result.total}
          basePath="/push-logs"
          params={{ status: query.status }}
        />
      ) : null}
    </>
  );
}
