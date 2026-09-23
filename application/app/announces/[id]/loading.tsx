/** 公告详情加载骨架：标题区 + 基本信息栅格 + 摘要卡占位 */
export default function AnnounceDetailLoading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="surface-card p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="h-6 w-[360px] animate-pulse rounded-ctl bg-th" />
          <div className="h-8 w-[88px] animate-pulse rounded-ctl bg-th" />
        </div>
        <div className="mt-3 h-4 w-[280px] animate-pulse rounded-ctl bg-th" />
      </div>
      <div className="surface-card p-4">
        <div className="h-5 w-24 animate-pulse rounded-ctl bg-th" />
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-5 animate-pulse rounded-ctl bg-th" />
          ))}
        </div>
      </div>
      <div className="surface-card p-4">
        <div className="h-5 w-24 animate-pulse rounded-ctl bg-th" />
        <div className="mt-4 flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-4 animate-pulse rounded-ctl bg-th" />
          ))}
        </div>
      </div>
    </div>
  );
}
