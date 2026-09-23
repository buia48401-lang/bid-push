# CODEBUDDY.md · BidPushSystem

This file provides guidance to CodeBuddy when working with code in this repository.

本文件是 AI 在本仓库工作的**唯一入口**：先读这里，再按指引读 `.codebuddy/rules/` 与 `docs/`。
本文件只承载「事实与索引」；**可执行的硬约束只写一份**，放在 `.codebuddy/rules/proj-*.mdc`，此处不重复正文。

---

## 1. 系统做什么

> **2026-09 框架化改造**：`application/` 已从招投标业务后台**抽离为通用中后台框架骨架**（业务页面 / 接口 / 数据层已删除，保留通用层 + `/demo` 示例模块）。下表描述的是**原业务系统形态**，`docs/` 与 `n8n/sql/` 仍为其只读事实源；`application/` 的当前形态见 `application/README.md`。

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
| 本应用（`application/`） | **现已框架化**：通用中后台骨架 + demo 示例 | 🔴 不抓外网、不改抓取状态 |

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
└─ application/                 ← Next.js 框架骨架（详见 application/README.md）
   ├─ app/                      页面路由（/demo）+ app/api/demo Route Handler
   ├─ components/               layout（外壳）/ common（状态块）/ ui（shadcn 基元）
   ├─ lib/api/                  统一信封、错误码、withRouteHandler
   ├─ lib/data/                 normalize（行归一化）+ demo（示例数据层）
   ├─ lib/supabase/             server（anon 只读）/ admin（service_role）
   ├─ lib/validation/           通用构造器（common）+ demo
   ├─ lib/constants/            导航元数据（nav）、通用 UI 常量（ui）
   ├─ types/                    接口类型（api）+ demo（Row/Item 双形态）
   └─ tests/                    Vitest
```

### 一次请求的完整链路（理解本仓库的关键）

```
Server Component (app/**/page.tsx) ──直接调用──▶ lib/data/** ──▶ lib/supabase/server|admin ──▶ Supabase
Client Component (components/**)  ──fetch('/api/*')──▶ app/api/**/route.ts
                                                        │ withRouteHandler 包裹：取参 → Zod 校验
                                                        │ (lib/validation) → 调 lib/data → 返回数据
                                                        └─ 信封 { code, message, data, traceId } 与
                                                           错误码映射由 lib/api 统一处理
```

- 依赖方向单向：`app → lib/data → lib/supabase`；`components` 到 `fetch('/api/*')` 为止；`lib/**` 不得反向 import `app/**`、`components/**`。
- **双 Supabase 客户端**：只读查询走 `getServerClient()`（anon，受 RLS）；高权限读写走 `getAdminClient()`（service_role）。两者均须**在函数体内惰性获取**，禁止模块顶层调用，禁止业务代码里直接 `createClient(...)`。
- 字段映射只发生在 `lib/data/**`（归一化函数在 `lib/data/normalize.ts`，映射示范见 `lib/data/demo.ts`）；页面与组件只消费 camelCase 类型（`types/**`）。
- 响应信封 `{ code, message, data, traceId }` 与错误码 `0/400/404/500/503` 固定，不可新增（原业务契约事实源 `docs/api-contract.md`，框架侧实现于 `lib/api/**`）。

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

先准备环境变量：复制 `.env.example` 为 `.env.local` 并填入 Supabase 凭据（`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`）。缺失时接口统一返回 `503 DB_UNAVAILABLE`。

```bash
npm run dev        # 本地开发
npm run build      # 生产构建（含 Next 路由类型校验）
npm run start      # 启动生产产物
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm run test                           # 全量 Vitest（tests/**/*.test.ts）
npx vitest run tests/demo.test.ts      # 运行单个测试文件
npx vitest run -t "用例名"              # 运行单个用例
```

改动完成后**必须**至少跑通 `npm run lint && npm run typecheck && npm run build`。

---

## 5. 规则索引（硬约束正文只在这些文件里）

| 规则 | 主题 | 什么时候会命中 |
| --- | --- | --- |
| `.codebuddy/rules/proj-nextjs-stack.mdc` | 技术栈版本、目录与命名、接口信封与分页格式 | 任何新建文件 / 新增接口 |
| `.codebuddy/rules/proj-layer-boundary.mdc` | 分层单向依赖、Server/Client 边界、数据客户端选型 | 任何跨层调用、数据访问 |
| `.codebuddy/rules/proj-domain-terms.mdc` | 业务术语 ↔ 数据库字段对照（描述原业务形态） | 命名、写注释、写文案 |
| `.codebuddy/rules/proj-forbidden.mdc` | 项目禁止事项清单 | 动手前先过一遍 |

> `proj-domain-terms` / `proj-forbidden` 中的**业务专属条款**（5 张 bid 表、7 条接口、订阅推送红线等）描述框架化之前的原系统；`application/` 现为通用框架，业务无关的分层 / 代码 / 契约红线仍然全部有效，新业务的操作指引以 `application/README.md` 为准。
>
> 通用层规则（编码风格、注释、AI 安全、API 设计、修改安全、排障、批量操作、自检、lang-*、fe-*）由用户级 rules 提供，**本项目不重复创建**。

---

## 6. 当前交付状态（2026-09 框架骨架）

`application/` 已完成**框架抽离改造**（业务代码删除、通用层保留、demo 示例就绪）。

已就绪：

- 可运行工程：`dev / build / lint / typecheck / test` 全部可执行且通过。
- 通用层完整保留：
  - `lib/api/**`：统一信封 `{ code, message, data, traceId }`、错误码 `0/400/404/500/503`、`withRouteHandler`、`ApiError` + `unimplemented()`。
  - `lib/supabase/**`：双客户端（anon 只读 / service_role 高权限），惰性初始化 + `server-only` 护栏 + 查询错误统一翻译 `toQueryError`（网络失败 → 503、表不存在提示建表 SQL）。
  - `lib/data/normalize.ts`：防御性行归一化（numeric 字符串、脏数据降级）。
  - `components/common`（空态 / 错误态 / 标题行 / 占位块 / 分页）+ `components/layout` 外壳 + `components/ui/button`。
  - 导航元数据机制（`lib/constants/nav.ts` 数据驱动侧栏 / 面包屑 / 标题）、通用格式化与校验构造器。
- demo 全链路示例：`/demo` 页面（Server Component 直调数据层）+ `GET /api/demo`（withRouteHandler + Zod + 分页下推），建表 SQL 见 `application/README.md`。
- 框架使用手册：`application/README.md`（内置能力清单、demo 表 SQL、「如何新增一个业务模块」七步指引、分层红线）。

**待办**：

- `application/.env.local` 尚未配置，未配置时接口返回 `503 DB_UNAVAILABLE`（页面展示错误态，属预期行为）。
- demo 表 `demo_item` 尚未在 Supabase 中创建，创建后 `/demo` 即可展示数据。
