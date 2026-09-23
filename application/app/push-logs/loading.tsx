/** 推送记录加载骨架：标题 + 三张统计卡 + 表头 + 数据行占位（product-design.md §9.1） */
export default function PushLogsLoading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <div className="h-7 w-32 animate-pulse rounded-ctl bg-th" />
        <div className="h-4 w-72 animate-pulse rounded-ctl bg-th" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="surface-card p-4">
            <div className="h-4 w-16 animate-pulse rounded-ctl bg-th" />
            <div className="mt-2 h-8 w-20 animate-pulse rounded-ctl bg-th" />
          </div>
        ))}
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
