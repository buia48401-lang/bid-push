'use client';

import Link from 'next/link';

import { ALL_TYPES_LABEL, ANNOUNCE_TYPES } from '@/lib/constants/domain';

export type AnnounceFilterValues = {
  keyword: string;
  region: string;
  announceType: string;
  startDate: string;
  endDate: string;
};

/** 控件统一走 token：高 32px、3px 圆角、描边 --border（product-design.md §2.2） */
const CONTROL_CLASS =
  'h-8 rounded-ctl border border-border bg-card px-2.5 text-body text-ink-1 outline-none transition-colors duration-micro placeholder:text-ink-3 focus:border-brand';

const PRIMARY_BUTTON_CLASS =
  'h-8 w-[88px] flex-none rounded-ctl bg-brand text-body text-white transition-colors duration-micro hover:bg-brand-hover';

const DEFAULT_BUTTON_CLASS =
  'flex h-8 w-[88px] flex-none items-center justify-center rounded-ctl border border-border bg-card text-body text-ink-1 transition-colors duration-micro hover:border-brand hover:text-brand';

type AnnounceFilterCardProps = {
  initial: AnnounceFilterValues;
};

/**
 * 筛选卡（product-design.md §4.1）。
 *
 * 原生 `<form method="get">` 渐进增强：提交即导航到 /announces?<条件>，
 * 服务端渲染结果，无需请求库；空参数由服务端 Zod 按未传处理。
 * 地区为输入框而非下拉：地区无字典表（5 表固定），见 design.md D3。
 */
export function AnnounceFilterCard({ initial }: AnnounceFilterCardProps) {
  return (
    <form action="/announces" method="get" role="search" className="surface-card flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          name="keyword"
          defaultValue={initial.keyword}
          placeholder="请输入公告标题关键词"
          aria-label="关键词"
          className={`${CONTROL_CLASS} w-[220px]`}
        />
        <input
          type="text"
          name="region"
          defaultValue={initial.region}
          placeholder="请输入地区，如：广东"
          aria-label="地区"
          className={`${CONTROL_CLASS} w-[140px]`}
        />
        <select
          name="announceType"
          defaultValue={initial.announceType}
          aria-label="公告类型"
          className={`${CONTROL_CLASS} w-[140px]`}
        >
          <option value="">{ALL_TYPES_LABEL}</option>
          {ANNOUNCE_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <input
            type="date"
            name="startDate"
            defaultValue={initial.startDate}
            aria-label="发布开始日期"
            className={`${CONTROL_CLASS} w-[112px]`}
          />
          <span aria-hidden="true" className="text-body text-ink-3">
            ~
          </span>
          <input
            type="date"
            name="endDate"
            defaultValue={initial.endDate}
            aria-label="发布结束日期"
            className={`${CONTROL_CLASS} w-[112px]`}
          />
        </div>
        <button type="submit" className={PRIMARY_BUTTON_CLASS}>
          查询
        </button>
        <Link href="/announces" className={DEFAULT_BUTTON_CLASS}>
          重置
        </Link>
      </div>
    </form>
  );
}
