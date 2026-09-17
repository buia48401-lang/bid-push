import { PageHeader } from '@/components/common/page-header';
import { PagePlaceholder } from '@/components/common/page-placeholder';
import { getNavItem, sourceNote } from '@/lib/constants/nav';

const NAV = getNavItem('announces');

/** 页面 1 · 公告列表（骨架，业务界面待实现） */
export default function AnnouncesPage() {
  return (
    <>
      <PageHeader title={NAV.label} note={sourceNote(NAV.sourceTable)} />
      <PagePlaceholder description="关键词 / 地区 / 公告类型 / 发布时间 / 来源站点筛选与公告表格将在页面模块中实现" />
    </>
  );
}
