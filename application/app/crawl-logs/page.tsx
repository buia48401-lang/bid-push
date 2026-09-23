import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import { Pagination } from '@/components/common/pagination';
import { CrawlLogTable } from '@/components/crawl-log/crawl-log-table';
import { getNavItem, sourceNote } from '@/lib/constants/nav';
import { listCrawlLogs } from '@/lib/data/crawl-logs';
import { CrawlLogQuerySchema } from '@/lib/validation/crawl-log';

const NAV = getNavItem('crawl-logs');

type CrawlLogsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * URL 查询串 → 列表查询条件（与公告列表同模式）。
 * 手输非法 URL 时回退默认条件而非报错。
 */
function parseFilters(raw: Record<string, string | string[] | undefined>) {
  const normalized = Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  );
  const parsed = CrawlLogQuerySchema.safeParse(normalized);

  return parsed.success ? parsed.data : CrawlLogQuerySchema.parse({});
}

/**
 * 页面 5 · 抓取日志（product-design.md §8）。
 * 🔴 纯只读页：不提供「立即抓取」按钮，抓取入口只在 n8n。
 */
export default async function CrawlLogsPage({ searchParams }: CrawlLogsPageProps) {
  const query = parseFilters(await searchParams);
  const result = await listCrawlLogs(query);

  return (
    <>
      <PageHeader
        title={NAV.label}
        note={sourceNote(
          NAV.sourceTable,
          `今日执行 ${result.todayRounds} 轮，累计抓取 ${result.todayTotal} 条`,
        )}
      />
      {result.list.length === 0 ? (
        <section className="surface-card">
          <EmptyState />
        </section>
      ) : (
        <section className="surface-card p-4">
          <CrawlLogTable items={result.list} />
        </section>
      )}
      {result.list.length > 0 ? (
        <Pagination
          page={result.page}
          pageSize={result.pageSize}
          total={result.total}
          basePath="/crawl-logs"
          params={{ sourceSite: query.sourceSite }}
        />
      ) : null}
    </>
  );
}
