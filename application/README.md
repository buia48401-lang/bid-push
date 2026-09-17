# BidPushSystem · 应用消费侧

招投标信息平台内部后台。本应用**只消费** Supabase 中的稳定数据，不参与列表发现、深抓与推送：

```
WorkBuddy（列表发现）→ 飞书（队列）→ n8n（深抓 + 推送）→ Supabase（存储）→ 本应用（只读展示 + 订阅维护）
```

## 技术栈

| 维度 | 选型 |
| --- | --- |
| 框架 | Next.js 15（App Router）+ React 19 |
| 语言 | TypeScript 5（`strict: true`） |
| 样式 | Tailwind CSS 3.4 + 设计 token（`app/globals.css`） |
| UI 基座 | shadcn/ui（`components.json`，基元在 `components/ui`） |
| 数据访问 | `@supabase/supabase-js`（仅服务端） |
| 校验 | Zod |
| 测试 | Vitest |

## 环境变量

复制 `.env.example` 为 `.env.local` 并填写：

| 变量 | 用途 | 可见性 |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目地址 | 浏览器可见 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 服务端只读查询（受 RLS 约束） | 浏览器可见 |
| `SUPABASE_SERVICE_ROLE_KEY` | 订阅写入，绕过 RLS | 🔴 仅服务端 |

> `service_role` 只允许出现在 `lib/supabase/admin.ts`，禁止加 `NEXT_PUBLIC_` 前缀。

## 脚本

```bash
npm run dev        # 本地开发
npm run build      # 生产构建
npm run start      # 启动生产产物
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm run test       # Vitest
```

## 目录导航

```
app/            页面路由与 Route Handlers（app/api/**）
components/     布局外壳、通用状态组件、shadcn 基元
lib/api/        统一响应信封、错误码、路由包装器
lib/data/       数据访问与 snake_case ↔ camelCase 映射
lib/supabase/   server（anon 只读）/ admin（service_role 写入）
lib/validation/ Zod 校验 schema
lib/constants/  导航元数据、业务枚举
types/          接口类型与数据表行类型
tests/          Vitest 单测
```

## 数据库脚本

建表与迁移脚本在 `../n8n/sql/`，与 n8n 采集写入侧共用同一份结构定义：

| 文件 | 说明 |
| --- | --- |
| `001_bid_schema.sql` | 基线：5 张表 / 索引 / 触发器 / 种子订阅，可重复执行 |
| `002_app_fields_migration.sql` | 增量：补字段、`publish_date` 改 `TIMESTAMPTZ`、索引、RLS 策略 |

🔴 执行 `002` 后 RLS 生效：`anon` 只能读公告 / 详情 / 推送日志 / 抓取日志，订阅表无任何 `anon` 策略。
因此 n8n 与应用侧的订阅读写都必须使用 `service_role`。

完整设计见 `../docs/`（`architecture.md`、`api-contract.md`、`product-design.md`）。
