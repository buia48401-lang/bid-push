import { EmptyState } from '@/components/common/empty-state';
import { ErrorState } from '@/components/common/error-state';
import { PageHeader } from '@/components/common/page-header';
import { Pagination } from '@/components/common/pagination';
import { getNavItem, sourceNote } from '@/lib/constants/nav';
import { EMPTY_PLACEHOLDER } from '@/lib/constants/ui';
import { listDemoItems } from '@/lib/data/demo';
import { formatCount, formatDateTime } from '@/lib/utils/format';
import { DemoQuerySchema } from '@/lib/validation/demo';
import type { DemoItem } from '@/types/demo';
import type { PageResult } from '@/types/api';

/**
 * 示例列表页 —— Server Component 直调 lib/data 的标准写法：
 * 1. searchParams（Next.js 15 为 Promise）→ Zod 归一为查询对象，非法值回退默认分页；
 * 2. 直接调用 lib/data 拿 PageResult，无需经过 /api 路由；
 * 3. 空态 / 错误态 / 分页全部复用 components/common。
 * Client Component 场景请改用 fetch('/api/demo?...')，见 README。
 */

const NAV = getNavItem('demo');

const TABLE_HEAD_CLASS = 'px-4 py-3 text-hint font-medium text-ink-3';
const TABLE_CELL_CLASS = 'px-4 py-3 text-body text-ink-2';

function DemoTable({ list }: { list: DemoItem[] }) {
  return (
    <table className="w-full border-collapse text-left">
      <thead>
        <tr className="border-b border-border">
          <th className={TABLE_HEAD_CLASS}>ID</th>
          <th className={TABLE_HEAD_CLASS}>标题</th>
          <th className={TABLE_HEAD_CLASS}>分类</th>
          <th className={TABLE_HEAD_CLASS}>金额</th>
          <th className={TABLE_HEAD_CLASS}>状态</th>
          <th className={TABLE_HEAD_CLASS}>创建时间</th>
        </tr>
      </thead>
      <tbody>
        {list.map((item) => (
          <tr key={item.id} className="border-b border-border last:border-b-0 hover:bg-row-hover">
            <td className={TABLE_CELL_CLASS}>{item.id}</td>
            <td className="max-w-[320px] truncate px-4 py-3 text-body text-ink-1">{item.title}</td>
            <td className={TABLE_CELL_CLASS}>{item.category || EMPTY_PLACEHOLDER}</td>
            <td className={TABLE_CELL_CLASS}>
              {item.amount === null ? EMPTY_PLACEHOLDER : formatCount(item.amount)}
            </td>
            <td className={TABLE_CELL_CLASS}>{item.status || EMPTY_PLACEHOLDER}</td>
            <td className={TABLE_CELL_CLASS}>{formatDateTime(item.createdAt)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

type DemoPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DemoPage({ searchParams }: DemoPageProps) {
  const raw = await searchParams;
  const parsed = DemoQuerySchema.safeParse(raw);
  const query = parsed.success ? parsed.data : { page: 1, pageSize: 20 };

  let result: PageResult<DemoItem> | null = null;
  let failed = false;

  try {
    result = await listDemoItems(query);
  } catch (error) {
    console.error('[demo] 列表查询失败', error);
    failed = true;
  }

  return (
    <>
      <PageHeader title={NAV.label} note={sourceNote(NAV.sourceTable)} />

      {failed ? (
        <section className="surface-card flex flex-1 items-center justify-center">
          <ErrorState />
        </section>
      ) : result && result.list.length > 0 ? (
        <>
          <section className="surface-card flex-1 overflow-x-auto">
            <DemoTable list={result.list} />
          </section>
          <Pagination
            page={result.page}
            pageSize={result.pageSize}
            total={result.total}
            basePath="/demo"
            params={{ keyword: query.keyword }}
          />
        </>
      ) : result ? (
        <section className="surface-card flex flex-1 items-center justify-center">
          <EmptyState description="当前条件下没有可展示的记录，可先执行 README 中的示例表 SQL" />
        </section>
      ) : null}
    </>
  );
}
