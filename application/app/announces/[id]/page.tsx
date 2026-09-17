import { PageHeader } from '@/components/common/page-header';
import { PagePlaceholder } from '@/components/common/page-placeholder';
import { getNavItem, sourceNote } from '@/lib/constants/nav';

const NAV = getNavItem('announces');

type AnnounceDetailPageProps = {
  params: Promise<{ id: string }>;
};

/**
 * 页面 2 · 公告详情（骨架）。
 * 侧栏仍高亮「公告列表」，面包屑走三级：首页 / 公告列表 / 公告详情。
 */
export default async function AnnounceDetailPage({ params }: AnnounceDetailPageProps) {
  const { id } = await params;

  return (
    <>
      <PageHeader title="公告详情" note={sourceNote(NAV.sourceTable)} />
      <PagePlaceholder
        description={`公告 #${id} 的基本信息、投标截止时间、正文摘要与「查看原文」将在页面模块中实现`}
      />
    </>
  );
}
