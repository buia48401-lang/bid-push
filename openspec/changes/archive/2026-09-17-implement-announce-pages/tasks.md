# Tasks

## 1. 展示基础：格式化纯函数与语义 Tag 映射

- [x] 1.1 在 `application/lib/constants/domain.ts` 新增摘要回退截断常量（如 `SUMMARY_FALLBACK_MAX_LENGTH = 300`），确认不与既有常量重复；验证 `npm run typecheck` 通过
- [x] 1.2 新增 `application/lib/format.ts`：`formatBudgetWan`（元→万元千分位 2 位小数，null→`EMPTY_PLACEHOLDER`）、`formatDate`（ISO→`YYYY-MM-DD`）、`formatDateTime`（ISO→`YYYY-MM-DD HH:mm`）、`remainingDaysText`（deadline→「（剩余 N 天）」/「已过期」），全部为纯函数；验证新增 `application/tests/format.test.ts` 覆盖空值、边界（当天截止、已过期、跨月）用例且 `npx vitest run tests/format.test.ts` 通过
- [x] 1.3 新增公告类型语义 Tag 映射（招标公告→brand、中标/成交→success、更正→warn、其余→muted，字面量引用 `ANNOUNCE_TYPES`）与 `application/components/announce/announce-type-tag.tsx`（22px 高、12px 字号、未知类型回退中性灰）；验证 `npm run typecheck` 通过

## 2. 数据层：公告查询落地（契约 §3.1/§3.2）

- [x] 2.1 实现 `application/lib/data/announces.ts` 的 `listAnnounces`：`getServerClient()` 惰性获取、显式列名、`.range()` + `{ count: 'exact' }`、过滤链（keyword/region `ilike`，announceType/sourceSite `eq`，startDate `gte`、endDate `lt` 次日 0 点）、排序 `publish_date DESC nullsFirst:false, id DESC`、`mapAnnounceListItem` 映射；验证 `npm run typecheck` 通过且 `unimplemented` 调用已删除
- [x] 2.2 实现同文件 `getAnnounceById`：`bid_announce` 单行查询（无行抛 `ApiError(NOT_FOUND)`）→ `bid_detail` 按 `announce_id` 单行查询（无行传 null）→ `mapAnnounceDetail`；验证 `npm run typecheck` 通过
- [x] 2.3 为数据层编写可测的查询构造辅助（若链式条件内聚在函数内则改用集成断言），并新增 `application/tests/announces-data.test.ts`：mock supabase 客户端断言 range/过滤/排序参数与 NOT_FOUND、structured 降级路径；验证 `npx vitest run tests/announces-data.test.ts` 通过

## 3. 公告列表页 `/announces`

- [x] 3.1 改写 `application/app/announces/page.tsx` 为 Server Component：解析 `searchParams`（沿用 `AnnounceListQuerySchema` 语义）→ 调 `listAnnounces` → 渲染标题行（「公告列表」+ 数据来源说明）与筛选卡、表格卡、分页行；验证 `npm run build` 通过且路由类型检查无错
- [x] 3.2 新增筛选卡 Client Component `application/components/announce/announce-filter-card.tsx`：原生 `<form method="get" action="/announces">`，含关键词输入（placeholder「请输入公告标题关键词」）、地区输入框（占位「请输入地区，如：广东」，design D3 偏差）、公告类型下拉（默认「全部类型」，选项来自 `ANNOUNCE_TYPES`）、时间范围两输入框（`YYYY-MM-DD`）、蓝色「查询」（submit）与白底「重置」；控件样式走 token（高 32px、圆角 3px）；验证手动构造 query 后页面按条件渲染
- [x] 3.3 新增表格组件（`components/announce/announce-table.tsx`）：7 列布局与宽度（标题 flex 蓝色可点 `link-text`、类型 Tag、采购人 150 省略、地区 90、预算 110 右对齐 `formatBudgetWan`、发布时间 110 `formatDate`、操作「查看详情」链接），表头 40px `--th-bg`、行高 48px 行分隔线，空值统一 `EMPTY_PLACEHOLDER`；验证用例：预算 null 行显示「—」
- [x] 3.4 新增 `application/components/common/pagination.tsx`（服务端可用）：接收 page/pageSize/total 与当前查询串，输出「共 N 条记录 · 每页 20 条」+ 页码组（24×24、当前页蓝底白字、`···` 折叠窗口、前后翻页），href 保留既有筛选参数；total≤pageSize 时仅显示统计不渲染页码；验证筛选状态下点第 2 页 URL 携带原条件
- [x] 3.5 新增 `application/app/announces/loading.tsx` 表格骨架屏，并接入空态：total=0 且无筛选时用 `EmptyState`「暂无数据」，有筛选时显示「没有符合条件的公告，试试调整筛选条件」；验证构建后两种空态文案按条件切换

## 4. 公告详情页 `/announces/[id]`

- [x] 4.1 改写 `application/app/announces/[id]/page.tsx`：`IdSchema` 校验 id（非法走 `notFound()`）→ 调 `getAnnounceById` → 渲染标题区（标题 18px/600 + 类型 Tag + 「查看原文」`<a target="_blank" rel="noopener noreferrer">` 跳 `detailUrl`；辅助行 `来源：{sourceSite} · 发布时间：{formatDateTime} · 公告编号：{announceNo}`，缺失显示「—」）；验证访问不存在 id 返回 404 兜底页
- [x] 4.2 新增基本信息卡组件（`components/announce/announce-basic-info.tsx`）：两列栅格，采购人（主表）、预算金额加粗 `formatBudgetWan`、投标截止时间取 `structured.deadline` 用错误红 + `remainingDaysText`、代理机构/联系人/联系电话取 `structured`；标签 12px `--text-3`、值 14px；缺失显示「—」；验证 structured=null 时四个结构化字段显示「—」
- [x] 4.3 新增正文摘要卡组件（`components/announce/announce-summary-card.tsx`）：标题行右注「结构化字段提取自 bid_detail.structured」；正文优先 `structured.summary`，缺失回退 `contentText.slice(0, SUMMARY_FALLBACK_MAX_LENGTH)` 并注明正文摘录，两者皆无显示「暂无结构化摘要」空态；验证三档回退路径渲染正确
- [x] 4.4 新增 `application/app/announces/[id]/loading.tsx` 卡片骨架屏；确认侧栏「公告列表」高亮与三级面包屑（首页 / 公告列表 / 公告详情）不受影响；验证 `npm run build` 通过

## 5. 验收门禁

- [x] 5.1 全量校验：在 `application/` 下执行 `npm run lint && npm run typecheck && npm run build`，三项全绿
- [x] 5.2 全量测试：`npm run test` 全绿（含新增 format/announces-data 用例与既有 envelope/mappers 用例不回归）
- [x] 5.3 红线自查：`components/**` 与页面无硬编码色值/业务中文字面量、无 `select('*')`、无 Supabase client 直连、无越权入口（立即抓取/重新推送），grep 复核并记录结果
