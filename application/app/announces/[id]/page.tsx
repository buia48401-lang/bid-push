import { ExternalLink } from 'lucide-react';
import { notFound } from 'next/navigation';

import { AnnounceBasicInfo } from '@/components/announce/announce-basic-info';
import { AnnounceSummaryCard } from '@/components/announce/announce-summary-card';
import { AnnounceTypeTag } from '@/components/announce/announce-type-tag';
import { ErrorCode } from '@/lib/api/error-codes';
import { ApiError } from '@/lib/api/errors';
import { EMPTY_PLACEHOLDER } from '@/lib/constants/domain';
import { getAnnounceById } from '@/lib/data/announces';
import { formatDateTime } from '@/lib/format';
import { IdSchema } from '@/lib/validation/common';
import type { AnnounceDetail } from '@/types/announce';

type AnnounceDetailPageProps = {
  params: Promise<{ id: string }>;
};

/** 详情页标题区 + 基本信息卡 + 正文摘要卡（product-design.md §5） */
export default async function AnnounceDetailPage({ params }: AnnounceDetailPageProps) {
  const { id } = await params;

  // id 非正整数 → 404 兜底，不进入数据层
  const parsedId = IdSchema.safeParse(id);

  if (!parsedId.success) {
    notFound();
  }

  let announce: AnnounceDetail;

  try {
    announce = await getAnnounceById(parsedId.data);
  } catch (error) {
    // 公告不存在 → 404 兜底页；其余（如 503）交给全局错误边界
    if (error instanceof ApiError && error.code === ErrorCode.NOT_FOUND) {
      notFound();
    }

    throw error;
  }

  return (
    <>
      <section className="surface-card p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="truncate text-[18px] font-semibold leading-[26px] text-ink-1" title={announce.title}>
              {announce.title || EMPTY_PLACEHOLDER}
            </h1>
            <AnnounceTypeTag announceType={announce.announceType} />
          </div>
          <a
            href={announce.detailUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-8 flex-none items-center gap-1.5 rounded-ctl border border-border bg-card px-3 text-body text-ink-1 transition-colors duration-micro hover:border-brand hover:text-brand"
          >
            查看原文
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>
        <p className="mt-2 truncate text-hint text-ink-3">
          来源：{announce.sourceSite || EMPTY_PLACEHOLDER} · 发布时间：
          {announce.publishDate ? formatDateTime(announce.publishDate) : EMPTY_PLACEHOLDER} · 公告编号：
          {announce.announceNo ?? EMPTY_PLACEHOLDER}
        </p>
      </section>
      <AnnounceBasicInfo announce={announce} />
      <AnnounceSummaryCard announce={announce} />
    </>
  );
}
