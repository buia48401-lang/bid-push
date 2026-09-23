/** 订阅管理加载骨架：标题 + 表头 + 数据行占位（product-design.md §9.1） */
export default function SubscriptionsLoading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <div className="h-7 w-32 animate-pulse rounded-ctl bg-th" />
          <div className="h-4 w-64 animate-pulse rounded-ctl bg-th" />
        </div>
        <div className="h-8 w-[88px] animate-pulse rounded-ctl bg-th" />
      </div>
      <div className="surface-card overflow-hidden">
        <div className="h-th-row bg-th" />
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="h-row border-b border-line bg-card last:border-b-0" />
        ))}
      </div>
    </div>
  );
}
