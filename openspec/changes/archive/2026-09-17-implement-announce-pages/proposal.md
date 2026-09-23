# Proposal

## Why

骨架期 5 个页面仅有标题行 + 占位块，`lib/data/announces.ts` 的 `listAnnounces` / `getAnnounceById` 仍是 `unimplemented` 占位，公告列表与公告详情两个核心页面无法使用。这两个页面是平台价值最直接的入口（浏览招投标信息），也是其余三个页面（订阅 / 推送 / 抓取日志）的样式与组件范式先导，需要按 `docs/product-design.md` §4/§5 首个完整落地。

## What Changes

- 实现 `application/lib/data/announces.ts`：
  - `listAnnounces`：分页（`.range()` + `count: 'exact'`）、过滤（keyword/region/announceType/sourceSite/startDate/endDate）、排序（`publish_date DESC`）全部下推数据库，替换 `unimplemented`（契约 §3.1）。
  - `getAnnounceById`：`bid_announce` 单行 + `bid_detail` 关联取回，查不到抛 `NOT_FOUND`，无详情记录时 `structured`/`contentText` 降级为 `null`（契约 §3.2）。
- 实现公告列表页 `application/app/announces/page.tsx`（Server Component + URL query 驱动）：
  - 筛选卡：关键词输入、地区/公告类型/来源站点下拉、发布时间范围、查询/重置按钮。
  - 表格卡：标题（蓝色可点进详情）、类型语义 Tag、采购人、地区、预算（万元右对齐千分位）、发布时间、查看详情；空值统一 `EMPTY_PLACEHOLDER`。
  - 分页行：共 N 条记录 · 每页 20 条 + 页码组。
- 实现公告详情页 `application/app/announces/[id]/page.tsx`（Server Component）：
  - 标题区：标题 + 类型 Tag + 「查看原文」新窗口跳 `detailUrl`；来源/发布时间/公告编号辅助行。
  - 基本信息卡：两列栅格（采购人 / 预算加粗 / 投标截止时间错误红 + 剩余天数 / 代理机构 / 联系人 / 联系电话）。
  - 正文摘要卡：`structured.summary` 优先，缺失回退 `contentText` 前 300 字，再缺失显示空态「暂无结构化摘要」。
- 新增可复用展示组件（`components/announce/**`、`components/common/pagination.tsx` 等）：公告类型语义 Tag、筛选控件、分页器；均消费 camelCase 类型与 `lib/constants/domain.ts` 常量。
- 补充 Vitest 用例（`tests/**`）：覆盖新增映射/展示纯函数与数据层查询语义。

不修改：`docs/**`、`n8n/sql/**`、接口路径与信封结构、错误码集合、5 张表结构、`lib/api/**` 统一处理层。

## Capabilities

### New Capabilities

- `announce-query`: 公告查询数据访问能力——列表分页/过滤/排序的数据库下推语义与详情查询的关联、404、structured 降级、contentText 截断行为（契约 §3.1/§3.2 的实现约束）。
- `announce-list`: 公告列表页能力——筛选卡（关键词/地区/类型/来源站点/时间范围）、表格展示与空值占位、语义 Tag、分页交互、加载/空态/错误态。
- `announce-detail`: 公告详情页能力——标题区与查看原文、基本信息栅格（截止时间剩余天数）、正文摘要的多级回退、404 错误态。

### Modified Capabilities

（无——本项目尚无已归档 specs，接口契约路径与信封均不变，不产生需求级变更。）

## Impact

- **代码**：
  - `application/lib/data/announces.ts`（实现 + 删除 `unimplemented`）
  - `application/app/announces/page.tsx`、`application/app/announces/[id]/page.tsx`（骨架 → 完整页面）
  - `application/components/announce/**`、`application/components/common/**`（新增展示组件）
  - `application/tests/**`（新增用例）
- **接口**：`GET /api/announces`、`GET /api/announces/{id}` 行为从 500 NOT_IMPLEMENTED 变为真实数据，路径/参数/响应结构不变。
- **依赖**：无新增第三方依赖（沿用 shadcn/ui 基元 + lucide-react + 既有 token）。
- **数据**：全部只读（`getServerClient()` anon），不触碰订阅写入链路。
