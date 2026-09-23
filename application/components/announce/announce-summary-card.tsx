import { EmptyState } from '@/components/common/empty-state';
import { SUMMARY_FALLBACK_MAX_LENGTH } from '@/lib/constants/domain';
import type { AnnounceDetail } from '@/types/announce';

/**
 * 正文摘要卡（product-design.md §5.3）多级回退：
 * 1. structured.summary（结构化摘要）；
 * 2. contentText 前 N 字（正文摘录）；
 * 3. 空态「暂无结构化摘要」。
 */
export function AnnounceSummaryCard({ announce }: { announce: AnnounceDetail }) {
  const summary = announce.structured?.summary ?? null;
  const excerpt =
    summary === null && announce.contentText
      ? announce.contentText.slice(0, SUMMARY_FALLBACK_MAX_LENGTH)
      : null;

  return (
    <section className="surface-card p-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-card-title font-medium text-ink-1">正文摘要</h2>
        <span className="flex-none text-hint text-ink-3">结构化字段提取自 bid_detail.structured</span>
      </div>
      <div className="mt-4">
        {summary ? (
          <p className="whitespace-pre-wrap text-body leading-6 text-ink-1">{summary}</p>
        ) : excerpt ? (
          <>
            <p className="mb-2 text-hint text-ink-3">
              以下为正文摘录（前 {SUMMARY_FALLBACK_MAX_LENGTH} 字）
            </p>
            <p className="whitespace-pre-wrap text-body leading-6 text-ink-1">{excerpt}</p>
          </>
        ) : (
          <EmptyState title="暂无结构化摘要" description="详情抓取完成后将展示摘要内容" />
        )}
      </div>
    </section>
  );
}
