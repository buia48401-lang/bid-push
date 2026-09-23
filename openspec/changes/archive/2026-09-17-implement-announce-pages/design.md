# Design

## Context

骨架已就绪：统一外壳（侧栏/顶栏/灰底内容区）、7 个 Route Handler 全部接入 `withRouteHandler`、双 Supabase 客户端（惰性初始化）、`lib/data/mappers.ts` 实体映射、Zod schema（`AnnounceListQuerySchema`）、设计 token（`app/globals.css`）与领域常量（`lib/constants/domain.ts`）均可用。`lib/data/announces.ts` 两个函数留有详细落地要点注释（分页下推、日期边界、NOT_FOUND）。契约 §3.1/§3.2 的路径、参数、响应结构固定不可改。设计目标见 proposal.md，行为见 specs/。

## Goals / Non-Goals

**Goals:**

- 打通「列表页 → 详情页」完整读链路：URL → Zod → 数据层（下推数据库）→ 映射 → 页面渲染。
- 建立可复用的页面范式与展示组件（语义 Tag、分页器、空/错态），作为后续订阅 / 推送 / 抓取日志三页的模板。
- 全部用既有 token 与 shadcn/ui 基元实现视觉规范，不新增依赖。

**Non-Goals:**

- 不实现其余三个页面（订阅 / 推送 / 抓取日志）。
- 不修改接口契约、信封、错误码、数据库结构与 `docs/**`。
- 不引入客户端请求库 / 状态库；不做「立即抓取」「重新推送」等越权入口。
- 不提供来源站点（sourceSite）筛选 UI——视觉原型筛选卡（§4.1）未含该控件，接口参数保留但首期不出入口。

## Decisions

### D1 · 列表页用 URL query 驱动 + Server Component 直调数据层

- 列表页 `app/announces/page.tsx` 为 Server Component，从 `searchParams` 读筛选条件直调 `listAnnounces`。
- **理由**：筛选结果可分享、可回退、刷新不丢；符合 `app → lib/data` 单向依赖，避免 Client Component 里拼 `fetch` 再处理信封的重复代码。
- 备选（放弃）：Client Component + `fetch('/api/announces')` —— 需要额外 loading/error 状态机，且 Route Handler 与数据层能力重复暴露给页面。

### D2 · 筛选交互用原生 `<form method="get">` 渐进增强

- 筛选卡是一个 Client Component（需要聚焦回车与受控默认值），但提交方式为 `GET /announces`：查询按钮 `type="submit"`，重置为跳转 `/announces` 的链接（或 `form.reset` + 提交）。
- **理由**：无 JS 环境也能查询；浏览器原生序列化查询串，免去手写 query 编解码；回车提交是原生行为。
- 服务端 `AnnounceListQuerySchema` 已把空串按未传处理（`emptyAsUndefined`），GET 表单产生的空参数天然安全。

### D3 · 地区筛选实现为输入框而非下拉（与视觉原型的一处偏差）

- 原型 §4.1 地区为下拉，但地区是自由文本且**不存在地区字典表**（5 表固定、禁止新增 `bid_region`），下拉枚举无事实来源，硬编码地区清单属于自造数据。
- 决策：首期实现为输入框（包含匹配语义与契约一致），占位「请输入地区，如：广东」；若后续飞书源站配置提供地区字典，再升级为下拉。此偏差记录于本文档，不改动 `docs/`。

### D4 · 展示格式化收敛为纯函数模块 `lib/format.ts`

- 新增 `formatBudgetWan`（元 → 万元千分位 2 位小数，null → `EMPTY_PLACEHOLDER`）、`formatDate`（ISO → `YYYY-MM-DD`）、`formatDateTime`（ISO → `YYYY-MM-DD HH:mm`）、`remainingDaysText`（deadline → 「（剩余 N 天）」/「已过期」）等纯函数，配 Vitest 用例。
- **理由**：列表与详情复用；日期边界（跨时区、Invalid Date）集中测试；组件保持纯渲染。
- 金额换算只在展示层做（契约 budget 单位为元，映射层不动）。

### D5 · 公告类型语义 Tag 映射表放 `lib/constants/announce-tag.tsx`（或 domain 扩展）

- 映射：招标公告 → 品牌蓝、中标公告 / 成交公告 → 成功绿、更正公告 → 警告橙、竞争性磋商 / 询价公告 / 其他 → 中性灰（依据 product-design §2.3）。
- **理由**：后续推送记录、订阅管理也要渲染类型/状态 Tag，单一映射防止语义色漂移；中文字面量继续引用 `ANNOUNCE_TYPES` 常量。
- 组件 `components/announce/announce-type-tag.tsx` 消费该映射，未知类型回退中性灰。

### D6 · 分页器为服务端可用的 Link 组件

- `components/common/pagination.tsx` 接收 `page/pageSize/total` 与当前查询串，构造各页 `href`（保留既有筛选参数），用 `next/link` 渲染页码组（24×24、当前页蓝底白字、省略号窗口）。
- **理由**：翻页即 URL 导航，与 D1 一致；无需事件回调，Server Component 可直接渲染，无需 `'use client'`。
- 省略号算法：当前页 ±1 + 首尾页，中间以 `···` 折叠。

### D7 · 加载与错误态复用全局机制

- 列表页 / 详情页各加 `loading.tsx`（表格骨架 / 卡片骨架，静态 Server 组件）。
- 数据层抛出的 `ApiError`（NOT_FOUND → 404、DB_UNAVAILABLE → 503）由既有 `app/error.tsx` 与 `app/not-found.tsx` 兜底；详情页对「公告不存在」显式调 `notFound()` 走 404 兜底页。
- **理由**：与骨架期既有约定一致，不为两个页面另建错误 UI。

### D8 · 详情页查询实现要点（沿用 `lib/data/announces.ts` 既有注释）

- `getAnnounceById`：两次单行查询（`bid_announce` by id → 无则抛 `ApiError(NOT_FOUND)`；`bid_detail` by `announce_id`），避免嵌套 select 在单行场景的复杂性；映射走既有 `mapAnnounceDetail`。
- `listAnnounces`：`.range(offset, offset+pageSize-1)` + `{ count: 'exact' }`；过滤链 `ilike`（keyword/region）、`eq`（announceType/sourceSite）、`gte`/`lt`（startDate / endDate+1 天）；排序 `publish_date DESC, nullsFirst: false` + `id DESC` 次级键。

## Risks / Trade-offs

- [GET 表单查询串含中文与特殊字符] → 浏览器自动 URL 编码，服务端 Zod 校验兜底；不手工 `encodeURIComponent` 拼接。
- [`publish_date` 为 null 的行干扰排序] → `nullsFirst: false` 显式声明，spec 已覆盖该场景。
- [「剩余 N 天」服务端渲染后随时间漂移] → MVP 接受（刷新即更新）；不引入客户端时钟避免水合不一致。
- [structured 内 deadline/budget 与主表口径不一致] → 明确口径：基本信息卡预算取主表 `budget`，截止时间取 `structured.deadline`，与契约 §3.2 一致。
- [大表 `count: 'exact'` 开销] → 单查询附带计数，可接受；后续如成瓶颈再评估估算计数（契约 total 语义不变）。

## Migration Plan

纯增量实现，无数据库迁移、无部署开关。实现顺序：`lib/format.ts` 与 Tag 映射 → 数据层两个函数（删除 `unimplemented`）→ 列表页（筛选卡 / 表格 / 分页 / loading）→ 详情页（三卡 / notFound / loading）→ 测试。回滚 = revert 提交即可，页面回到占位骨架。

验收门禁：`npm run lint && npm run typecheck && npm run build && npm run test` 全绿。

## Open Questions

无。（地区下拉偏差已在 D3 决策；摘要回退长度 300 字记入 `lib/constants/domain.ts` 常量，如需调整只改常量。）
