# Rules 目录说明（BidPushSystem 定制版）

> 通用 Coding Rules 已按本项目技术栈**裁剪 + 适配**。
> 技术栈：Next.js 15 App Router + React 19 + TypeScript 5(strict) + Tailwind CSS 3.4 + shadcn/ui + Supabase(PostgreSQL) + Zod + Vitest，包管理器 **npm**。

---

## 文件清单（12 个通用 + 4 个项目）

### 通用层（Always，每次自动加载）

| # | 文件 | 主题 | 本项目适配点 |
|---|------|------|-------------|
| 00 | `00-rule-meta.mdc` | 元规则 | 索引已更新为实际生效清单 |
| 01 | `01-coding-style.mdc` | 编码总则 | 语言细则仅保留 TS/SQL；示例改用 `ApiError` |
| 02 | `02-code-comments.mdc` | 注释规范 | 删除 Java/Python 章节；SQL 模板改 PostgreSQL + 幂等/反向 SQL 要求 |
| 03 | `03-ai-safety.mdc` | AI 操作安全红线 | 未改动（完全适用） |
| 04 | `04-api-design.mdc` | API 设计总则 | 顶部新增「本项目差异」块：code 与 HTTP 一一对应、信封与分页字段、7 条固定接口 |
| 05 | `05-modify-safety.mdc` | 修改安全红线 | 未改动（完全适用） |

### 工具层（Agent Requested，按需加载）

| # | 文件 | 主题 | 本项目适配点 |
|---|------|------|-------------|
| 10 | `10-troubleshooting.mdc` | 诊断决策树 | pnpm → npm；新增本项目速查（503 DB_UNAVAILABLE、NOT_IMPLEMENTED、RLS 静默 0 行） |
| 11 | `11-batch-ops.mdc` | 批量操作三步法 | 顶部提示 PostgreSQL 语法 + 应用侧只读边界 |
| 12 | `12-self-check.mdc` | 变更自检 | 模式 A 清单替换为本项目分层/契约/验收命令（lint+typecheck+build+test） |

### 框架层（Auto Attached，按文件类型自动加载）

| 文件 | globs | 主题 | 本项目适配点 |
|------|-------|------|-------------|
| `fe-react.mdc` | `**/*.{ts,tsx,js,jsx}` | React/Next.js | 重写：App Router、Server Component 优先、fetch 信封、禁 TanStack/axios/Zustand、kebab-case 文件名 |
| `fe-css-tailwind.mdc` | `**/*.css` | Tailwind/token | 精简为 Tailwind-only；色值收口 `globals.css`；移除 SCSS/移动端章节 |
| `lang-sql.mdc` | `**/*.sql` | SQL 通用规范 | 顶部新增「本项目差异」：PostgreSQL、`n8n/sql/` 维护规则、审计字段/逻辑删除不适用 |

### 项目层（proj-*，**优先级最高**）

| 文件 | 主题 |
|------|------|
| `proj-nextjs-stack.mdc` | 技术栈锁定、目录命名、接口信封与分页 |
| `proj-layer-boundary.mdc` | 分层单向依赖、Server/Client 边界、Supabase 双客户端选型 |
| `proj-domain-terms.mdc` | 业务术语 ↔ 数据库字段对照 |
| `proj-forbidden.mdc` | 禁止事项红线清单 |

---

## 相对通用版的裁剪记录

**已删除**（与本仓库技术栈不符）：

- `lang-java.mdc` — 无 Java 代码
- `lang-python.mdc` — 无 Python 代码
- `fe-vue.mdc` — 无 Vue 代码
- `fe-uniapp.mdc` — 无 uni-app 代码

---

## 维护约定

1. **优先级**：任务级规则 > `proj-*` > 通用层（00-12 / fe-* / lang-*）；同一约束两处都有时，以 `proj-*` 为准。
2. **新增规则**：先读 `00-rule-meta.mdc` 的 5 原则 / 3 反模式；项目特定细节写进 `proj-*.mdc`，不污染通用层。
3. **验证生效**：用同一需求让 AI 跑两次对比风格是否趋同（方法见 `00-rule-meta` §五）。
