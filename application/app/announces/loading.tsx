/** 公告列表加载骨架：筛选卡 + 表头 + 数据行占位（product-design.md §9.1） */
export default function AnnouncesLoading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-7 w-40 animate-pulse rounded-ctl bg-th" />
      <div className="surface-card flex flex-col gap-3 p-4">
        <div className="flex gap-3">
          <div className="h-8 w-[220px] animate-pulse rounded-ctl bg-th" />
          <div className="h-8 w-[140px] animate-pulse rounded-ctl bg-th" />
          <div className="h-8 w-[140px] animate-pulse rounded-ctl bg-th" />
        </div>
        <div className="flex gap-3">
          <div className="h-8 w-[240px] animate-pulse rounded-ctl bg-th" />
          <div className="h-8 w-[88px] animate-pulse rounded-ctl bg-th" />
          <div className="h-8 w-[88px] animate-pulse rounded-ctl bg-th" />
        </div>
      </div>
      <div className="surface-card overflow-hidden">
        <div className="h-th-row bg-th" />
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="h-row border-b border-line bg-card last:border-b-0" />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <div className="h-4 w-40 animate-pulse rounded-ctl bg-th" />
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-6 w-6 animate-pulse rounded-ctl bg-th" />
          ))}
        </div>
      </div>
    </div>
  );
}
