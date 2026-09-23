# bid-push

招投标信息推送平台。本仓库的 `application/` 已抽离为**通用中后台框架骨架**，开箱即用地提供分层架构、统一接口契约与常见中后台 UI 基元，业务代码可按模块逐步填充。

## 系统链路

```
WorkBuddy（列表发现）→ 飞书（队列 + 状态机）→ n8n（深抓 + 推送）→ Supabase（存储）→ 本应用（展示 + 维护）
```

应用侧只负责数据展示与订阅维护，不抓外网、不执行推送。

## 技术栈

| 维度 | 选型 |
| --- | --- |
| 框架 | Next.js 15（App Router）+ React 19 |
| 语言 | TypeScript 5（`strict: true`） |
| 样式 / UI | Tailwind CSS 3.4 + CSS 变量设计 token + shadcn/ui + lucide-react |
| 数据 | Supabase / PostgreSQL（`@supabase/supabase-js`，仅服务端） |
| 校验 | Zod |
| 测试 | Vitest |
| 包管理 | npm |

## 框架核心能力

- **统一接口契约**：所有 Route Handler 经 `withRouteHandler` 包裹，返回固定信封 `{ code, message, data, traceId }`，错误码仅 `0 / 400 / 404 / 500 / 503`。
- **分层单向依赖**：`app → lib/data → lib/supabase`，组件层止步于 `fetch('/api/*')`；字段映射集中在 `lib/data/**`。
- **双 Supabase 客户端**：`getServerClient()`（anon 只读，受 RLS）与 `getAdminClient()`（service_role 高权限），惰性初始化 + `server-only` 编译期护栏。
- **防御性数据层**：行归一化处理 numeric 字符串与脏数据降级；查询错误统一翻译为标准错误码。
- **通用 UI 与布局**：侧栏 / 面包屑由导航元数据驱动，内置空态、错误态、分页等通用组件。
- **示例模块**：`/demo` 全链路演示（支持 `DEMO_USE_MOCK=true` 纯本地演示模式），并附「新增业务模块」七步指引（见 `application/README.md`）。

## 快速开始

```bash
cd application
cp .env.example .env.local   # 填入 Supabase 凭据
npm install
npm run dev                  # 本地开发
```

常用命令：`npm run build`（生产构建）、`npm run lint`、`npm run typecheck`、`npm run test`。

## 开源协议

本项目基于 [Apache License 2.0](./LICENSE) 开源。
