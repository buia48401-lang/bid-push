import { PageHeader } from '@/components/common/page-header';
import { PagePlaceholder } from '@/components/common/page-placeholder';
import { getNavItem, sourceNote } from '@/lib/constants/nav';

const NAV = getNavItem('crawl-logs');

/**
 * 页面 5 · 抓取日志（骨架）。
 * 🔴 纯只读页：不提供「立即抓取」按钮，抓取入口只在 n8n。
 */
export default function CrawlLogsPage() {
  return (
    <>
      <PageHeader title={NAV.label} note={sourceNote(NAV.sourceTable)} />
      <PagePlaceholder description="按执行轮次的源站等级、抓取总数、成功 / 失败 / 人工处理与备注将在页面模块中实现" />
    </>
  );
}
