import { toIsoString, toNumber, toText } from '@/lib/data/normalize';
import { toQueryError } from '@/lib/supabase/errors';
import { getServerClient } from '@/lib/supabase/server';
import type { PageResult } from '@/types/api';
import type { DemoItem, DemoRow } from '@/types/demo';
import type { DemoQuery } from '@/lib/validation/demo';

/** 显式列清单：契约需要哪些列就查哪些（🔴 禁止 select('*')） */
const DEMO_COLUMNS = 'id,title,category,amount,status,created_at';

/**
 * demo_item 行 → 接口字段。
 * snake_case → camelCase 的映射只允许发生在 lib/data/**（本函数是唯一落点）。
 */
export function mapDemoItem(row: DemoRow): DemoItem {
  return {
    id: row.id,
    title: toText(row.title),
    category: toText(row.category),
    amount: toNumber(row.amount),
    status: toText(row.status),
    createdAt: toIsoString(row.created_at),
  };
}

/**
 * 分页查询示例：过滤、排序、计数全部下推数据库。
 * - `.range()` + `{ count: 'exact' }`：禁止拉全表回应用层分页；
 * - `keyword` 用 ilike 下推模糊匹配，空值（schema 已归一 undefined）不下发条件。
 */
export async function listDemoItems(query: DemoQuery): Promise<PageResult<DemoItem>> {
  const supabase = getServerClient();

  const from = (query.page - 1) * query.pageSize;

  let builder = supabase
    .from('demo_item')
    .select(DEMO_COLUMNS, { count: 'exact' })
    .order('id', { ascending: false })
    .range(from, from + query.pageSize - 1);

  if (query.keyword) {
    builder = builder.ilike('title', `%${query.keyword}%`);
  }

  const { data, error, count } = await builder;

  if (error) {
    // 网络失败 → 503 DB_UNAVAILABLE；表不存在 → 提示建表；其余 → 500 携带原因
    throw toQueryError('demo_item', error);
  }

  return {
    list: (data ?? []).map(mapDemoItem),
    total: count ?? 0,
    page: query.page,
    pageSize: query.pageSize,
  };
}
