import { PageHeader } from '@/components/common/page-header';
import { PagePlaceholder } from '@/components/common/page-placeholder';
import { getNavItem, sourceNote } from '@/lib/constants/nav';

const NAV = getNavItem('subscriptions');

/** 页面 3 · 订阅管理（骨架，业务界面待实现） */
export default function SubscriptionsPage() {
  return (
    <>
      <PageHeader title={NAV.label} note={sourceNote(NAV.sourceTable)} />
      <PagePlaceholder description="订阅列表、启用状态开关与新建 / 编辑弹窗（Zod 校验）将在页面模块中实现" />
    </>
  );
}
