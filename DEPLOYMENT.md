# 启动、调试、部署指南 · BidPushSystem

> 适用范围：本仓库应用消费侧（`application/`）的本地启动、日常调试与生产部署。
> 事实源：`CODEBUDDY.md`、`docs/`（只读）；硬约束正文在 `.codebuddy/rules/proj-*.mdc`。

---

## 一、技术路线与架构

### 1.1 整体链路（含上下游边界）

```
WorkBuddy（列表发现）→ 飞书（队列+状态机）→ n8n（深抓+推送）→ Supabase（5 张表）
                                                                    │ 只读消费
                                                    本应用 Next.js 15（展示 + 订阅维护）
```

| 角色 | 职责 | 边界 |
| --- | --- | --- |
| WorkBuddy | 列表页发现新公告，投递飞书 | 不深抓、不推送 |
| 飞书 | 多维表格队列与状态机 | 不抓取、不落库 |
| n8n | 深抓详情、写 Supabase、按订阅推送 | 使用 `service_role` 写库 |
| 本应用 | 公告/日志只读展示、订阅增改 | 🔴 不抓外网、不改 `crawl_status`、不触发重推 |

三条系统红线：

1. 推送顺序固定：**写库 → 发消息 → 记推送日志**（`bid_push_log` 是幂等凭据）。
2. 应用侧唯一可写表是 `bid_subscription`。
3. `待人工` 状态只能人工处理，应用不得自动修改。

### 1.2 应用技术栈（版本锁定，不得擅自升大版本）

| 维度 | 选型 |
| --- | --- |
| 框架 | Next.js 15.5（App Router）+ React 19 |
| 语言 | TypeScript 5（`strict: true`） |
| 样式 | Tailwind CSS 3.4 + CSS 变量设计 token（`app/globals.css`） |
| UI 基座 | shadcn/ui + lucide-react |
| 数据访问 | `@supabase/supabase-js`（仅服务端使用） |
| 校验 | Zod |
| 测试 | Vitest |
| 包管理器 | **npm**（禁止 pnpm / yarn，避免锁文件分叉） |
| 数据库 | Supabase / PostgreSQL（`pg_trgm` + RLS） |

### 1.3 分层架构（单向依赖）

```
app/**/page.tsx    (Server Component) ──直调──▶ lib/data/** ──▶ lib/supabase/server.ts（anon 只读）
components/**      (Client Component) ──fetch('/api/*')──▶ app/api/**/route.ts
                                                            └─ withRouteHandler：traceId + Zod + 统一信封
                                                               ──▶ lib/data/** ──▶ lib/supabase/admin.ts（service_role，仅订阅读写）
```

关键设计决策：

| 决策 | 说明 |
| --- | --- |
| 双 Supabase 客户端 | `getServerClient()`（anon，受 RLS）读公告/日志；`getAdminClient()`（service_role）读写订阅。均**函数体内惰性获取**，禁止模块顶层调用 |
| 统一信封 | `{ code, message, data, traceId }`，错误码仅 `0/400/404/500/503`，全部由 `withRouteHandler` 处理，禁止手写响应 |
| 字段映射集中 | snake_case ↔ camelCase 只在 `lib/data/mappers.ts`；页面与组件只消费 `types/**` |
| 查询下推 | 禁用 `select('*')`、全表拉取、N+1；分页用 `.range()` + `count` |
| 接口共 7 条 | 公告 ×2、订阅 ×3、推送日志 ×1、抓取日志 ×1；全量契约见 `docs/api-contract.md` |

---

## 二、目录说明与关键文件

### 2.1 仓库顶层

| 路径 | 说明 |
| --- | --- |
| `CODEBUDDY.md` | AI/开发入口索引（事实与规则导航） |
| `docs/` | 🔴 **只读设计事实源**（系统设计 / 架构 / api-contract / 产品设计），不得修改 |
| `n8n/sql/` | 数据库唯一维护副本：`001_bid_schema.sql`（基线）+ `002_app_fields_migration.sql`（迁移+RLS） |
| `.codebuddy/rules/` | 项目硬约束（技术栈 / 分层边界 / 术语 / 禁止清单） |
| `openspec/` | 变更管理（changes / specs） |
| `application/` | Next.js 应用主体 |

### 2.2 application/ 目录结构

```
application/
├─ app/
│  ├─ announces/page.tsx + [id]/page.tsx     公告列表 / 公告详情
│  ├─ subscriptions/page.tsx                 订阅管理（唯一可写页面）
│  ├─ push-logs/page.tsx                     推送记录（统计卡 + 明细）
│  ├─ crawl-logs/page.tsx                    抓取日志
│  ├─ api/**/route.ts                        6 个文件承载 7 条契约接口
│  ├─ layout.tsx / error.tsx / not-found.tsx 外壳与兜底（字体 <link> 运行时加载，离线可构建）
│  └─ globals.css                            设计 token 唯一处（色值只允许写这里）
├─ components/    announce/ subscription/ push-log/ crawl-log/ layout/ common/ ui/
├─ lib/
│  ├─ api/        handler.ts（统一包装器）· response.ts（信封）· error-codes.ts · errors.ts · request.ts
│  ├─ data/       announces.ts · subscriptions.ts · push-logs.ts · crawl-logs.ts · mappers.ts（字段映射唯一处）
│  ├─ supabase/   server.ts（anon 只读）· admin.ts（service_role）· env.ts（缺变量抛 503）
│  ├─ validation/ Zod schema ×6
│  ├─ constants/  domain.ts（业务枚举）· nav.ts（导航）
│  └─ format.ts / utils.ts
├─ types/         接口与数据表类型
├─ tests/         7 个测试文件、55 个用例
├─ .env.example   环境变量模板（真实凭据只放 .env / .env.local，已 gitignore）
└─ 配置：next.config.ts · tailwind.config.ts · vitest.config.ts · eslint.config.mjs · tsconfig.json
```

关键文件速查：

| 要改什么 | 去哪里 |
| --- | --- |
| 接口逻辑 | `app/api/**/route.ts` + `lib/data/**` |
| 字段映射（snake_case ↔ camelCase） | `lib/data/mappers.ts` |
| 业务枚举与中文文案 | `lib/constants/domain.ts` |
| 表结构变更 | 新建 `n8n/sql/003_xxx.sql`（🔴 禁止修改 001 基线） |
| 设计问题 | 先改 `docs/` 并确认（docs 只读，需人工审核） |

---

## 三、启动、调试、部署

### 3.1 前置条件

| 项 | 要求 |
| --- | --- |
| Node.js | ≥ 18.18（Next.js 15.5 要求） |
| npm | 随 Node 安装；包管理器固定为 npm |
| Supabase | 一个项目实例，具备 URL / anon key / service_role key |
| 网络 | 构建**不需要**联网（字体运行时加载）；运行时需能访问 Supabase |

### 3.2 首次启动（5 步）

```bash
# ① 安装依赖（有 lockfile，用 ci 保证一致）
cd application
npm ci

# ② 配置环境变量：复制 .env.example 为 .env.local（或 .env），填三项
#    NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY
#    🔴 service_role 只留服务端，禁止加 NEXT_PUBLIC_ 前缀，禁止提交入库

# ③ 初始化数据库：Supabase Dashboard → SQL Editor，按序粘贴执行
#    n8n/sql/001_bid_schema.sql            （基线：5 表 / 索引 / 触发器 / 种子订阅）
#    n8n/sql/002_app_fields_migration.sql  （补字段 / 改类型 / RLS）
#    两份脚本均幂等，可重复执行
#    ⚠️ 002 执行后 RLS 生效：订阅表无 anon 策略，读写订阅必须走 service_role

# ④ 启动开发服务
npm run dev        # http://localhost:3000

# ⑤ 冒烟验证
curl http://localhost:3000/api/announces
# 期望：{ "code": 0, "message": "...", "data": { ... }, "traceId": "..." }
```

### 3.3 调试

**质量命令（提交 / 发版前必跑）**

```bash
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm run test       # 全量 55 个用例
npx vitest run tests/announces-data.test.ts   # 单文件
npx vitest run -t "用例名"                     # 单用例
npm run build      # 生产构建（含 Next 路由类型校验）
```

**调试手段**

| 场景 | 方法 |
| --- | --- |
| 页面数据异常 | 页面是 Server Component，直接看终端日志；筛选条件在 URL 查询串上，可手改 URL 复现 |
| 接口异常 | 响应体 `traceId` 与服务端 `[api] traceId=...` 日志一一对应，据此定位 |
| 数据层异常 | 读路径 DB 故障 → `503 DB_UNAVAILABLE`；写路径失败 → `500 INTERNAL`；`structured` 脏数据自动降级 `null`，不阻塞详情 |
| 信封不符合预期 | 检查是否绕过 `withRouteHandler` 手写了 `NextResponse.json` |

**常见故障排查**

| 现象 | 原因 / 处置 |
| --- | --- |
| 所有接口返回 `503 缺少环境变量` | 未配置 `.env.local` / `.env`，或变量名拼错 |
| 订阅列表返回空数组且无报错 | 🔴 经典 RLS 静默失败：anon 读 `bid_subscription` 返回 0 行而非报错，确认走 `getAdminClient()` |
| `npm run build` 无凭据即失败 | 有人在模块顶层调用了 `createClient`，必须改为函数体内惰性获取 |
| 页面白屏 | 已由 `app/error.tsx` + `not-found.tsx` 兜底，查看终端堆栈 |

### 3.4 生产部署（标准 Node 部署）

```bash
cd application

# ① 安装 + 全量验收（三件套必须通过）
npm ci
npm run lint && npm run typecheck && npm run test
npm run build                    # 产物在 .next/

# ② 注入环境变量（生产不要拷贝 .env 文件，由进程环境 / 密钥管理下发）
#    NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY

# ③ 启动（默认端口 3000）
npm run start                    # 等价 next start

# 指定端口
PORT=8080 npm run start          # Linux / macOS
set PORT=8080 && npm run start   # Windows cmd
```

部署要点：

| 项 | 建议 |
| --- | --- |
| 运行形态 | 必须 Node 常驻服务（存在 API Routes 与 `force-dynamic` 页面，**不能静态导出**） |
| 进程守护 | Linux 用 systemd 或 PM2：`pm2 start npm --name bid-push -- start` |
| 反向代理 | Nginx 反代 `127.0.0.1:3000` 并配置 HTTPS；无需为 `/api` 额外规则 |
| 数据库 | 部署前确保目标 Supabase 已执行 001 → 002；结构变更走新编号脚本（003+） |
| 安全核对 | ① service_role 不出现在浏览器 bundle（`server-only` 护栏保证）② `webhook_url` 展示已脱敏 ③ 生产环境不留 `dev.log` |
| 上线验收 | `curl /api/announces` 信封正确；5 个页面可打开；订阅新增 / 停用（PUT 全量覆盖）生效 |

**升级发布流程**：

```bash
git pull
cd application
npm ci
npm run lint && npm run typecheck && npm run test && npm run build
pm2 reload bid-push    # 或 systemctl restart bid-push
```
