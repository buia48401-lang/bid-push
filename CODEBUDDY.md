# BidPushSystem · AI 协作入口

> 本文件是 AI 在本仓库工作的**唯一入口**：先读这里，再按指引读 `.codebuddy/rules/` 与 `docs/`。
> 本文件只承载「事实与索引」；**可执行的硬约束只写一份**，放在 `.codebuddy/rules/proj-*.mdc`，此处不重复正文。

---

## 1. 系统做什么

招投标信息推送平台的内部后台。整条链路的职责边界：

```
WorkBuddy（列表发现）→ 飞书（队列 + 状态机）→ n8n（深抓 + 推送）→ Supabase（存储）→ 本应用（只读展示 + 订阅维护）
```

| 角色 | 职责 | 不做什么 |
| --- | --- | --- |
| WorkBuddy | 列表页发现新公告，投递到飞书 | 不深抓、不推送 |
| 飞书 | 多维表格队列与状态机 | 不抓取、不落库 |
| n8n | 深抓详情、写 Supabase、按订阅推送 | 不判断列表、不改页面 |
| Supabase | 5 张表存储 | 不含源站配置（源站只在飞书） |
| 本应用（`application/`） | 公告/日志只读展示、订阅增改 | 🔴 不抓外网、不改抓取状态 |

**三条系统级红线**（不属任何单条规则，先记住）：

1. 推送顺序不可换：**先写库 → 再发消息 → 后记推送日志**（`bid_push_log` 是幂等凭据）。
2. 应用侧不主动抓外网；`bid_subscription` 是应用侧**唯一**可写表。
3. 应用侧不自动篡改 `crawl_status`，`待人工` 只能由人工处理。

---

## 2. 仓库结构

```
BidPushSystem/
├─ CODEBUDDY.md                 ← 本文件（AI 入口）
├─ .codebuddy/rules/            ← 项目级差异规则（proj-*.mdc）
├─ docs/                        ← 🔴 只读设计事实源，不得修改
│  ├─ 系统设计.md  requirements.md  architecture.md  api-contract.md  product-design.md
│  ├─ 招投标信息平台-产品设计.html   （视觉原型）
│  └─ 初始化.sql                 （历史副本，已被 n8n/sql/001 取代，不再维护）
├─ n8n/sql/                     ← 数据库结构唯一维护副本
│  ├─ 001_bid_schema.sql             基线（5 表 / 索引 / 触发器 / 种子订阅）
│  └─ 002_app_fields_migration.sql   增量（补字段 / 改类型 / 索引 / RLS）
└─ application/                 ← Next.js 应用（详见 application/README.md）
   ├─ app/                      页面路由 + app/api/** Route Handlers
   ├─ components/               layout（外壳）/ common（状态块）/ ui（shadcn 基元）
   ├─ lib/api/                  统一信封、错误码、withRouteHandler
   ├─ lib/data/                 数据访问与字段映射（snake_case ↔ camelCase）
   ├─ lib/supabase/             server（anon 只读）/ admin（service_role）
   ├─ lib/validation/           Zod schema
   ├─ lib/constants/            导航元数据、业务枚举
   ├─ types/                    接口类型与数据表行类型
   └─ tests/                    Vitest
```

---

## 3. 技术栈与版本（锁定，不得擅自升大版本）

| 维度 | 版本 / 选型 |
| --- | --- |
| 框架 | Next.js 15（App Router）+ React 19 |
| 语言 | TypeScript 5，`strict: true` |
| 样式 | Tailwind CSS 3.4 + CSS 变量设计 token（`app/globals.css`） |
| UI 基座 | shadcn/ui（`components.json`） |
| 图标 | lucide-react |
| 数据访问 | `@supabase/supabase-js`（仅服务端） |
| 校验 | Zod |
| 测试 | Vitest（`tests/**/*.test.ts`） |
| 包管理器 | **npm**（禁止换成 pnpm / yarn，避免锁文件分叉） |
| 数据库 | Supabase / PostgreSQL（`pg_trgm` + RLS） |

---

## 4. 常用命令（在 `application/` 下执行）

```bash
npm run dev        # 本地开发
npm run build      # 生产构建（含 Next 路由类型校验）
npm run start      # 启动生产产物
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm run test       # Vitest
```

改动完成后**必须**至少跑通 `npm run lint && npm run typecheck && npm run build`。

---

## 5. 规则索引（硬约束正文只在这些文件里）

| 规则 | 主题 | 什么时候会命中 |
| --- | --- | --- |
| `.codebuddy/rules/proj-nextjs-stack.mdc` | 技术栈版本、目录与命名、接口信封与分页格式 | 任何新建文件 / 新增接口 |
| `.codebuddy/rules/proj-layer-boundary.mdc` | 分层单向依赖、Server/Client 边界、数据客户端选型 | 任何跨层调用、数据访问 |
| `.codebuddy/rules/proj-domain-terms.mdc` | 业务术语 ↔ 数据库字段对照 | 命名、写注释、写文案 |
| `.codebuddy/rules/proj-forbidden.mdc` | 项目禁止事项清单 | 动手前先过一遍 |

> 通用层规则（编码风格、注释、AI 安全、API 设计、修改安全、排障、批量操作、自检、lang-*、fe-*）由用户级 rules 提供，**本项目不重复创建**。

---

## 6. 当前交付状态（2026-09 骨架期）

已就绪：

- 可运行工程：`dev / build / lint / typecheck / test` 全部可执行且通过。
- 统一外壳：240px 侧栏（公告列表 / 订阅管理 / 推送记录 / 抓取日志）+ 56px 顶栏（面包屑 / 铃铛 / 用户「陈钢」）+ 灰底内容区。
- 5 个占位路由：`/announces`、`/announces/{id}`、`/subscriptions`、`/push-logs`、`/crawl-logs`；`app/not-found.tsx` + `app/error.tsx` 兜底，不白屏。
- 7 个接口骨架：`app/api/**` 已全部接入 `withRouteHandler`（traceId + Zod + 错误码 + 信封）。
- 数据层基座：双 Supabase 客户端（惰性初始化）、字段映射、Zod schema、领域类型。

**待实现（下一步）**：

- `lib/data/**` 的查询体目前统一走 `unimplemented('<契约章节>')` → 返回 `500 NOT_IMPLEMENTED`。实现某个函数后**必须删掉对应的 `unimplemented` 调用**。
- 5 个页面仅有标题行 + 占位块，表格 / 筛选卡 / 分页 / 表单弹窗尚未开发。
- `application/.env.local` 尚未配置，所有接口当前会返回 `503 DB_UNAVAILABLE`。
