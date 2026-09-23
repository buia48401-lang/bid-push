import type { DemoItem } from '@/types/demo';
import type { PageResult } from '@/types/api';
import type { DemoQuery } from '@/lib/validation/demo';

/**
 * demo 模块的内置演示数据 —— 配合 `DEMO_USE_MOCK=true` 使用：
 * 不配置 Supabase 凭据 / 网络不可达时，仍可完整体验框架的列表、搜索与分页效果。
 *
 * 🔴 仅用于框架演示：数据在内存中模拟数据库行为（过滤 / 排序 / 分页 / 计数），
 * 页面会明示「演示数据」，不与真实业务数据混用。
 */

/** 8 条种子数据，按框架能力命名，循环扩充为 25 条以便演示翻页 */
const MOCK_SEEDS: Array<Pick<DemoItem, 'title' | 'category' | 'amount' | 'status'>> = [
  { title: '框架内置演示条目', category: '入门', amount: 1000.5, status: '启用' },
  { title: '统一信封响应示例', category: '接口', amount: 2345.67, status: '启用' },
  { title: '分页组件演示行', category: '组件', amount: 3456.78, status: '停用' },
  { title: '空态与错误态示例', category: '组件', amount: null, status: '启用' },
  { title: '双客户端演示记录', category: '数据层', amount: 45678.9, status: '启用' },
  { title: 'Zod 校验构造器示例', category: '校验', amount: 567.89, status: '停用' },
  { title: '导航元数据演示条目', category: '布局', amount: null, status: '启用' },
  { title: '格式化工具演示行', category: '工具', amount: 8901.23, status: '启用' },
];

const MOCK_TOTAL = 25;

/** 最新一条的创建时间基准（北京时间 2026-09-23 10:30），逐条递减 1 小时，保证确定性便于测试 */
const NEWEST_CREATED_AT = Date.UTC(2026, 8, 23, 2, 30);

export const MOCK_DEMO_ITEMS: DemoItem[] = Array.from({ length: MOCK_TOTAL }, (_, index) => {
  const id = MOCK_TOTAL - index;
  const seed = MOCK_SEEDS[index % MOCK_SEEDS.length];

  return {
    id,
    title: `${seed.title} #${id}`,
    category: seed.category,
    amount: seed.amount,
    status: seed.status,
    createdAt: new Date(NEWEST_CREATED_AT - (id - 1) * 3600_000).toISOString(),
  };
});

/**
 * 演示模式查询：在内存中模拟数据库行为（与真实链路语义对齐）——
 * title 模糊过滤（近似 ilike）、id 倒序、range 分页、total 精确计数。
 */
export function queryMockDemoItems(query: DemoQuery): PageResult<DemoItem> {
  const keyword = query.keyword?.trim().toLowerCase();

  const filtered = keyword
    ? MOCK_DEMO_ITEMS.filter((item) => item.title.toLowerCase().includes(keyword))
    : MOCK_DEMO_ITEMS;

  const from = (query.page - 1) * query.pageSize;

  return {
    list: filtered.slice(from, from + query.pageSize),
    total: filtered.length,
    page: query.page,
    pageSize: query.pageSize,
  };
}
