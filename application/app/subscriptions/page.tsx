import { SubscriptionBoard } from '@/components/subscription/subscription-board';
import { listSubscriptions } from '@/lib/data/subscriptions';

/** 订阅为可写资源，禁止任何形式的静态化（与 /api/subscriptions 的 Route Handler 同约束） */
export const dynamic = 'force-dynamic';

/** 页面 3 · 订阅管理（product-design.md §6）：标题行 + 表格卡 + 新建/编辑弹窗，无分页 */
export default async function SubscriptionsPage() {
  const result = await listSubscriptions();

  return <SubscriptionBoard initial={result} />;
}
