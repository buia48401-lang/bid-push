# Next Admin Template · 中后台管理框架

基于 Next.js 15 + Supabase + shadcn/ui + Zod 的中后台框架骨架：统一响应信封、双数据库客户端、通用组件与布局外壳已就绪；业务代码已全部抽离，仅保留 `/demo` 示例模块演示完整分层链路。开发新业务时按 demo 的文件结构复制即可。

## 快速开始

```bash
# 1. 安装依赖（仅 npm，禁止 pnpm / yarn）
npm install

# 2. 复制 .env.example 为 .env.local（默认 DEMO_USE_MOCK=true，开箱即演示，无需数据库）
# 3. 启动 —— /demo 立即可见 25 条演示数据、搜索与分页
npm run dev
```

**开箱即演示（默认）**：`DEMO_USE_MOCK=true` 时 demo 模块返回内置示例数据，不连接 Supabase，页面标题下方会明示「演示数据 · 未连接数据库」。

**连接真实数据库**（三步）：

1. `.env.local` 中 `DEMO_USE_MOCK` 改为 `false`（或删除该行），并填入 Supabase 凭据；
2. 执行下文「示例数据」中的 demo 表 SQL；
3. 重启 `npm run dev`。

未配置凭据且演示模式关闭时，接口统一返回 `503 DB_UNAVAILABLE`，页面展示错误态。

## 技术栈

| 维度 | 选型 |
| --- | --- |
| 框架 | Next.js 15（App Router）+ React 19 |
| 语言 | TypeScript 5（`strict: true`） |
| 样式 | Tailwind CSS 3.4 + 设计 token（`app/globals.css`） |
| UI 基座 | shadcn/ui（`components.json`，基元在 `components/ui`） |
| 图标 | lucide-react |
| 数据访问 | `@supabase/supabase-js`（仅服务端） |
| 校验 | Zod |
| 测试 | Vitest |

## 环境变量

| 变量 | 用途 | 可见性 |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目地址 | 浏览器可见 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 只读查询（受 RLS 约束） | 浏览器可见 |
| `SUPABASE_SERVICE_ROLE_KEY` | 绕过 RLS 的高权限读写 | 🔴 仅服务端 |
| `DEMO_USE_MOCK` | demo 演示模式（`true` = 内置示例数据，不连库；缺省 `false`） | 仅服务端 |

> `service_role` 只允许出现在 `lib/supabase/admin.ts`，禁止加 `NEXT_PUBLIC_` 前缀。

## 网络与代理（境外 Supabase 实例必读）

Supabase 云端域名（`*.supabase.co`）在国内网络直连经常被重置，症状为：

- 页面错误态提示「数据库连接失败」/ 接口返回 `503 DB_UNAVAILABLE`；
- 服务端日志出现 `TypeError: fetch failed`、`ECONNRESET`。

解决方案（任选其一）：

1. **代理工具开 TUN / 系统级接管**（推荐）：透明代理所有流量，Node 无需任何额外配置。
2. **Node ≥ 24 环境变量代理**：内置 fetch 支持 `NODE_USE_ENV_PROXY`：

   ```bash
   # cmd（7897 换成你的代理端口；注意仅开系统代理对 Node 无效）
   set NODE_USE_ENV_PROXY=1
   set HTTPS_PROXY=http://127.0.0.1:7897
   npm run dev
   ```

3. 使用国内可达的自建 Supabase / 中转地址，改 `.env` 的 `NEXT_PUBLIC_SUPABASE_URL`。

## 脚本

```bash
npm run dev        # 本地开发
npm run build      # 生产构建（含 Next 路由类型校验）
npm run start      # 启动生产产物
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm run test       # Vitest（tests/**/*.test.ts）
npx vitest run tests/demo.test.ts  # 运行单个测试文件
```

改动完成后必须至少跑通 `npm run lint && npm run typecheck && npm run build`。

## 目录结构

```
app/                页面路由 + Route Handlers（app/api/**）
 ├─ demo/           示例模块页面（Server Component 直调 lib/data）
 └─ api/demo/       示例列表接口（withRouteHandler 标准写法）
components/
 ├─ layout/         布局外壳：侧栏 / 顶栏 / 面包屑
 ├─ common/         通用状态块：EmptyState / ErrorState / PageHeader / PagePlaceholder / Pagination
 └─ ui/             shadcn 基元（Button 等，按需增补）
lib/
 ├─ api/            统一信封、错误码、withRouteHandler、请求体解析
 ├─ constants/      nav（导航元数据）、ui（占位符 / 品牌常量）
 ├─ data/           normalize（行归一化）+ demo（示例数据层）
 ├─ supabase/       server（anon 只读）/ admin（service_role）
 ├─ utils/          format（日期 / 千分位 / 脱敏）
 ├─ validation/     common（分页 / 日期 / 文本构造器）+ demo
 └─ utils.ts        cn()（Tailwind 类名合并）
types/              api（信封类型）+ demo（Row / Item 双形态示范）
tests/              Vitest 单测
```

## 框架内置能力

| 能力 | 位置 | 说明 |
| --- | --- | --- |
| 统一响应信封 | `lib/api/response.ts` | `{ code, message, data, traceId }`；错误码固定 `0 / 400 / 404 / 500 / 503` |
| 路由包装器 | `lib/api/handler.ts` | `withRouteHandler` 固化 traceId → 参数校验异常映射 → 业务调用 → 信封包装；🔴 禁止在 Route Handler 手写 `NextResponse.json` / `try-catch` / `traceId` |
| 错误类型 | `lib/api/errors.ts` | `ApiError`（带错误码的异常）+ `unimplemented()`（查询体未实现时的统一出口，实现后必须删除） |
| 双 Supabase 客户端 | `lib/supabase/` | `getServerClient()`（anon，受 RLS）/ `getAdminClient()`（service_role，`server-only` 护栏）；🔴 均须在函数体内惰性获取，禁止业务代码 `createClient(...)` |
| 查询错误翻译 | `lib/supabase/errors.ts` | `toQueryError(scope, error)`：网络失败 → `503 DB_UNAVAILABLE`（提示检查代理）；表不存在（PGRST205）→ 提示执行建表 SQL；其余 → `500` 携带原始原因 |
| 行归一化 | `lib/data/normalize.ts` | `toNumber / toText / toIsoString / snakeToCamel / truncateText` 等：numeric 列可能返回字符串、脏数据降级为 null / 空串而不抛错 |
| 通用组件 | `components/common/` | 空态 / 错误态（含重试）/ 标题行 / 占位块 / 分页 |
| 布局外壳 | `components/layout/` | 240px 侧栏 + 56px 顶栏（面包屑 / 通知 / 用户）+ 灰底内容区；品牌常量在 `lib/constants/ui.ts` |
| 导航元数据 | `lib/constants/nav.ts` | `NAV_ITEMS` / `DETAIL_ROUTES` 纯数据驱动侧栏高亮、面包屑、页面标题；详情路由自动复用父级菜单高亮 |
| 格式化工具 | `lib/utils/format.ts` | 固定时区日期（`Asia/Shanghai`）、千分位、Webhook 地址脱敏 |
| 通用校验构造器 | `lib/validation/common.ts` | `PageQuerySchema` / `DateOnlySchema` / `optionalText()` / `IdSchema` / `emptyAsUndefined` |

## 示例数据（demo_item 表）

demo 模块依赖一张示例表，在 Supabase SQL Editor 中执行：

```sql
create table if not exists demo_item (
  id bigint generated always as identity primary key,
  title text not null,
  category text,
  amount numeric(18, 2),
  status text,
  created_at timestamptz not null default now()
);

insert into demo_item (title, category, amount, status) values
  ('第一条示例记录', '分类A', 1234.50, '启用'),
  ('第二条示例记录', '分类B', 67890.00, '停用'),
  ('第三条示例记录', '分类A', null, '启用');
```

若项目启用了 RLS，还需给 anon 只读策略（demo 查询走 anon key）：

```sql
alter table demo_item enable row level security;
create policy "anon read demo_item"
  on demo_item for select
  to anon
  using (true);
```

## 如何新增一个业务模块

> 🔴 demo 模块与演示模式（`DEMO_USE_MOCK`）**仅为框架展示服务，不参与后续业务开发**：新模块禁止在 demo 上扩展、禁止 import `lib/data/demo*` 等任何 demo 文件；业务模块成型后 demo（页面 / 接口 / 数据层 / mock / 导航项）会被整体隐藏或移除。demo 仅作为结构参照。

以新增「文章 article」模块为例，按 demo 的结构复制 7 步：

1. **建表**：在 Supabase 建表；需要 anon 读取的表按上文示例补 RLS 策略。
2. **类型** `types/article.ts`：定义 `ArticleRow`（snake_case，对齐建表语句）与 `ArticleItem`（camelCase，页面消费）；列表返回值复用 `types/api.ts` 的 `PageResult<T>`。
3. **校验** `lib/validation/article.ts`：`PageQuerySchema.extend({ ... })` 组装查询参数，文本筛选用 `optionalText(列宽, '字段名')`。
4. **数据层** `lib/data/article.ts`：显式列常量 + `getServerClient()`（或高权限表用 `getAdminClient()`）+ `.range()` + `{ count: 'exact' }` + `mapArticleItem()`（归一化函数来自 `lib/data/normalize.ts`）；查询体未实现前可先 `unimplemented('article 列表')` 占位。
5. **接口** `app/api/article/route.ts`：`export const GET = withRouteHandler(async (request) => { ... })`，内部 schema.parse + 调数据层，仅此三件事。
6. **页面** `app/article/page.tsx`：Server Component 直调 `lib/data/**`；需要交互（筛选、弹窗）时拆 Client Component 放 `components/article/`，数据经 `fetch('/api/article?...')`。
7. **导航** `lib/constants/nav.ts`：在 `NAV_ITEMS` 登记一条（`key / label / href / icon / sourceTable / matchPrefixes`）；有详情页再在 `DETAIL_ROUTES` 登记，即可复用父级菜单高亮。

配套测试放 `tests/article.test.ts`：映射函数与 schema 是纯函数，直接单测（参考 `tests/demo.test.ts`）。

## 分层边界（红线）

```
app/**/page.tsx (Server)  ──直调──▶  lib/data/**  ──▶  lib/supabase/**
app/api/**/route.ts       ──▶  lib/api + lib/validation  ──▶  lib/data/**
components/**             ──▶  fetch('/api/*')   🔴 到此为止
lib/**  types/**          ──▶  纯类型与纯函数，禁止 import app/ 或 components/
```

- 🔴 禁止 `select('*')`：显式列出需要的列。
- 🔴 禁止全表拉回应用层分页 / 过滤 / 统计：分页用 `.range()` + `{ count: 'exact' }`，过滤排序用链式条件下推，禁止 N+1（关联用嵌套 select 一次取回）。
- 🔴 Server Component 禁止向 Client Component 传递函数、`Date` 实例、Supabase client。
- 🔴 色值只允许写在 `app/globals.css` 的 token 定义处；组件禁止硬编码十六进制色值。
- 🔴 展示用中文字面量一律放 `lib/constants/**`，组件禁止硬编码。
- 🔴 新增 Client Component 前先自问能否做成 Server Component（当前仅 sidebar / breadcrumb / error-state / error.tsx 四处）。
