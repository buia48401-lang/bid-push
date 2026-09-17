# 系统架构

> 来源：`docs/系统设计.md`（原始设计稿，**只读，不得改写**）
> 本文件是该稿的规范化整理，并记录了开发阶段确认的变更。

## 1. 设计意图

把「招投标信息从发现到送达客户」这条链路，按**工具能力**切成几段各自稳定、可独立验证的工作：

- 采集链路先跑通 → 应用再消费稳定数据 → 最后验证订阅推送
- 避免"页面先做完、数据却没有来源"导致的返工

核心原则：**每个工具只负责一段工作任务，明确不负责什么。**

## 2. 工具职责矩阵

| 工具 | 在本项目中的任务 | 明确不负责的内容 |
| --- | --- | --- |
| WorkBuddy | 定时访问目标站点列表页，解析标题、链接、类型、日期、地区等字段，去重后写入飞书 | 不抓详情页，不直接写 Supabase，不做客户推送 |
| 飞书 | 维护源站配置表和公告列表队列，提供人工查看、修正和状态回写入口 | 不承担最终历史数据存储，不承担复杂查询页面 |
| n8n | 定时通过 MCP 读取飞书待抓记录，按链接抓详情，处理验证码，结构化抽取并写 Supabase；入库后匹配订阅，调用飞书群机器人推送，并记录推送结果 | 不重新抓列表页，不替代应用页面 |
| Supabase | 保存公告、详情、订阅和执行日志，向后端提供稳定的数据层 | 不直接访问外部招投标网站 |
| CodeBuddy | 按需求确认单、架构文档和 Rules 生成前后端代码、接口和测试 | 不猜测文档外的功能 |

## 3. 数据流

### 3.1 列表发现（WorkBuddy → 飞书）

```
读取启用的站点配置 → 抓取列表页
→ 解析：公告标题 / 详情链接 / 公告类型 / 发布日期 / 地区 / 来源站点
→ 按 detail_url 查重 → 写入飞书「公告数据表」，状态统一设为「待抓取」
```

列表阶段**不追求补齐详情字段**。不同网站详情页结构差异很大，预算、联系人、截止时间等留给 n8n 深抓阶段处理。
这样 WorkBuddy 任务足够简单，也不会因某个详情页的验证码或异构结构拖慢列表发现。

### 3.2 深抓入库（n8n → Supabase）

```
定时触发器 → MCP 读取飞书「抓取状态=待抓取」→ 按批次取详情链接
→ 按站点选择解析方式：静态 HTML 直接解析 / 浏览器渲染 / 验证码子流程识别并重试
→ 抽取：标题、采购人、地区、预算金额、报名或截止时间、联系人、联系电话、代理机构、正文摘要
→ 写入 Supabase → 回写飞书「已入库」
```

### 3.3 推送（n8n 子流程）

**推送是真正产生业务价值的一步**：采集解决"信息能不能找到"，推送解决"客户能不能及时收到"。
因此推送不是应用页面上的附属按钮，而是 n8n 深抓成功后的**自动子流程**。

```
公告详情成功写入 Supabase
  → 读取启用的订阅
  → 按 关键词 / 地区 / 公告类型 匹配（空条件 = 不限制该项）
  → 调用飞书群机器人发送公告摘要 + 原文链接
  → 每个订阅的发送结果写入 bid_push_log
```

**🔴 必须坚守的顺序**：先写 Supabase → 再发机器人消息 → 最后记录推送结果。

- 若先发消息后写库，网络抖动会出现"客户已收到、系统无记录"
- 推送失败**不删除**已保存的公告，只按推送日志重试

### 3.4 应用消费（本仓库）

```
Supabase（只读）→ Next.js Server Components / Route Handlers → 内部后台页面
bid_subscription ← 应用唯一可写的表
```

应用**不参与**列表发现、深抓、推送的任何环节。

## 4. 数据设计

### 4.1 五张核心表

| 表 | 用途 | 关键字段 |
| --- | --- | --- |
| `bid_announce` | 公告主记录 | `title`、`detail_url`、`announce_type`、`publish_date`、`purchaser`、`region`、`source_site`、`budget`、`crawl_status` |
| `bid_detail` | 详情正文和结构化字段 | `announce_id`、`content_html`、`content_text`、`structured`、`crawled_at` |
| `bid_subscription` | 客户订阅条件 | `keyword`、`region`、`announce_type`、`channel`、`webhook_url`、`enabled` |
| `bid_crawl_log` | 抓取和运行日志 | `run_at`、`total`、`success`、`failed`、`manual`、`note` |
| `bid_push_log` | 推送结果 | `subscription_id`、`announce_id`、`channel`、`status`、`sent_at`、`error_message` |

**唯一键**：`detail_url` 是全链路唯一键（`uk_detail_url`），列表写入、详情 upsert、应用查询都以它作为去重基础。

**设计取舍**：公告正文保留原文快照，结构化字段放 JSONB。
不同站点字段存在差异时可以**先落库**，后续再逐步完善解析规则。

**无 `bid_source` 表**：源站配置只在飞书多维表格，Supabase 不做镜像。

### 4.2 索引

| 表 | 索引 | 用途 |
| --- | --- | --- |
| `bid_announce` | `uk_detail_url` UNIQUE | 全链路去重 |
| `bid_announce` | `idx_bid_announce_crawl_status` | 状态筛选 |
| `bid_announce` | `idx_bid_announce_publish_date` | 时间筛选与排序 |
| `bid_announce` | `idx_bid_announce_title_trgm`（pg_trgm GIN） | 中文标题模糊检索 |
| `bid_detail` | `idx_bid_detail_announce_id` | 详情关联查询 |
| `bid_crawl_log` | `idx_bid_crawl_log_run_at` | 日志按时间排序 |
| `bid_push_log` | `uk_push UNIQUE (announce_id, subscription_id)` | **推送幂等** |
| `bid_push_log` | `idx_bid_push_log_subscription_id`、`idx_bid_push_log_status` | 按订阅/状态查询 |

### 4.3 应用层字段扩展（迁移 002）

产品原型需要的字段在原建表脚本中缺失，经确认后以**增量迁移**补齐，详见 `n8n/sql/002_app_fields_migration.sql`：

| 表 | 新增/变更 | 原因 |
| --- | --- | --- |
| `bid_subscription` | + `name` | 订阅列表需要可读的「订阅名称」 |
| `bid_subscription` | + `updated_at` + 触发器 | 原脚本只建了 `set_updated_at()` 函数，订阅表缺该列，`PUT` 接口需要 |
| `bid_crawl_log` | + `source_site`、`site_level` | 抓取日志页需要展示源站与 A/B/C 级标签 |
| `bid_announce` | + `announce_no` | 详情页需要展示「公告编号」 |
| `bid_announce` | `publish_date`：DATE → TIMESTAMPTZ | 详情页发布时间需精确到分钟 |

迁移同时新增两个索引（支持按来源站点筛选）：

- `idx_bid_announce_source_site`（公告列表页按源站筛选）
- `idx_bid_crawl_log_source_site`（抓取日志页按源站筛选）

`site_level` 刻意**不加 CHECK 约束**：`bid_crawl_log` 由 n8n 写入，加约束会在 n8n 写入意外取值时
直接报错中断采集链路，风险大于收益。允许取值（`A级` / `B级` / `C级` / 空）在列注释中约定，
前端对空值显示「—」。

## 5. 应用架构

### 5.1 分层

```
app/**/page.tsx  (Server Component)  →  lib/data/**  →  Supabase
app/api/**/route.ts (Route Handler)  →  lib/data/**  →  Supabase
components/**    (展示/交互)          →  fetch /api/* （禁止 import Supabase SDK）
```

单向依赖，禁止反向。业务访问统一经过服务端函数或 API Route，页面组件不直接操作高权限数据库连接。

### 5.2 凭据与权限

| 客户端 | 凭据 | 用途 |
| --- | --- | --- |
| `lib/supabase/server.ts` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 服务端只读查询 |
| `lib/supabase/admin.ts` | `SUPABASE_SERVICE_ROLE_KEY` | 订阅写入（绕过 RLS） |

配套 RLS 策略（迁移 002）：

- `bid_announce` / `bid_detail` / `bid_push_log` / `bid_crawl_log`：对 `anon` 开放**只读**
- `bid_subscription`：**不向 anon 开放**（只能经服务端 service_role 读写）

双保险：即使误用 anon key 也无法越权写订阅。

## 6. 变更记录

### 变更 001：页面数 4 → 5

- **原文**：系统设计「系统设计阶段的验收点」第 4 条写"应用是否严格**只有四个业务页面**"
- **实际**：产品原型 `docs/招投标信息平台-产品设计.html` 有 5 页，多出**抓取日志**页，
  且该页已有完整表格、分页、源站等级标签设计
- **决策（2026-09-17 用户确认）**：**按原型做 5 页**，新增 `GET /api/crawl-logs` 接口，
  侧栏 4 个菜单项（公告列表 / 订阅管理 / 推送记录 / 抓取日志）
- **理由**：`bid_crawl_log` 表已存在且由 n8n 持续写入，不展示则故障排查完全依赖查库；
  抓取日志页是**纯只读**页，不违反"应用不抓外部网站"的红线

### 变更 002：不做「立即抓取」按钮

- **原文**：原型抓取日志页右上角有「立即抓取」按钮
- **冲突**：设计红线"不允许应用绕过后端抓外部网站"，且 n8n 是经 MCP 读飞书启动的
- **决策（2026-09-17 用户确认）**：**不做该按钮**，抓取日志页纯只读，抓取入口只在 n8n

## 7. 验收点

系统设计完成后进入开发前，逐项检查：

- [ ] WorkBuddy 是否只写飞书列表队列，是否没有越过职责直接写数据库
- [ ] n8n 是否能通过 MCP 读取待抓链接，并在成功、失败、验证码超限时分别回写状态
- [ ] Supabase 是否有唯一键、必要索引和可追溯日志
- [ ] 应用是否只有 5 个业务页面（见变更 001），是否没有重复实现飞书已有的源站管理
- [ ] CodeBuddy 是否能根据 Rules、产品设计和接口契约生成代码，而不是自己猜功能
- [ ] 验收是否能从一条列表公告追踪到详情入库、页面展示、订阅匹配和推送记录
