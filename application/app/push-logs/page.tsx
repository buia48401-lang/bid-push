import { PageHeader } from '@/components/common/page-header';
import { PagePlaceholder } from '@/components/common/page-placeholder';
import { getNavItem, sourceNote } from '@/lib/constants/nav';

const NAV = getNavItem('push-logs');

/** 页面 4 · 推送记录（骨架，业务界面待实现） */
export default function PushLogsPage() {
  return (
    <>
      <PageHeader title={NAV.label} note={sourceNote(NAV.sourceTable)} />
      <PagePlaceholder description="今日推送 / 成功 / 失败统计卡与推送明细（含失败原因）将在页面模块中实现" />
    </>
  );
}
