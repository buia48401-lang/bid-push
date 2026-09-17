# 接口契约

> 所有接口均为 Next.js Route Handlers，位于 `application/app/api/**`。
> **实现必须严格遵循本契约**，变更需先改本文件并经人确认。

## 1. 通用约定

### 1.1 响应信封

所有接口（成功与失败）统一返回：

```ts
type ApiOk<T>  = { code: 0;     message: 'ok';        data: T;    traceId: string };
type ApiErr    = { code: number; message: string;     data: null; traceId: string };
type ApiResult<T> = ApiOk<T> | ApiErr;
```

- `code: 0` 表示成功，非 0 为错误码
- `traceId` 每次请求生成（用于串联服务端日志）
- 失败时 `data` 恒为 `null`
- HTTP 状态码与业务 `code` 保持一致（400/404/500）

### 1.2 错误码

| code | 常量 | HTTP | 含义 |
| --- | --- | --- | --- |
| 0 | `OK` | 200 | 成功 |
| 400 | `INVALID_PARAM` | 400 | 入参校验失败（Zod） |
| 404 | `NOT_FOUND` | 404 | 资源不存在 |
| 500 | `INTERNAL` | 500 | 服务端异常 |
| 503 | `DB_UNAVAILABLE` | 503 | 数据库连接/查询失败 |

### 1.3 分页

所有列表接口的 `data` 统一为：

```ts
type PageResult<T> = {
  list: T[];
  total: number;     // 总条数
  page: number;      // 从 1 开始
  pageSize: number;  // 默认 20
};
```

查询参数固定命名：`page`（默认 1）、`pageSize`（默认 20，最大 100）。

### 1.4 排序

列表默认 `publish_date DESC, id DESC`（日志类为 `run_at DESC, id DESC` / `sent_at DESC, id DESC`），
保证翻页不重不漏。首个接口不支持自定义排序。

---

## 2. 接口清单

| # | 方法 | 路径 | 用途 |
| --- | --- | --- | --- |
| 1 | GET | `/api/announces` | 分页查询公告 |
| 2 | GET | `/api/announces/{id}` | 公告详情（含结构化字段与正文摘要） |
| 3 | GET | `/api/subscriptions` | 查询订阅列表 |
| 4 | POST | `/api/subscriptions` | 新增订阅 |
| 5 | PUT | `/api/subscriptions/{id}` | 修改或停用订阅 |
| 6 | GET | `/api/push-logs` | 推送记录 + 今日统计 |
| 7 | GET | `/api/crawl-logs` | 抓取日志（新增，对应第 5 个页面） |

---

## 3. 接口详细定义

### 3.1 `GET /api/announces` 分页查询公告

**Query 参数**

| 参数 | 类型 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| `keyword` | string | 否 | — | 标题模糊匹配（`title ILIKE %kw%`） |
| `region` | string | 否 | — | 地区，**包含匹配**；空 = 不限 |
| `announceType` | string | 否 | — | 公告类型，精确匹配；空 = 不限 |
| `sourceSite` | string | 否 | — | 来源站点，精确匹配；空 = 不限 |
| `startDate` | string | 否 | — | `YYYY-MM-DD`，`publish_date >= startDate` |
| `endDate` | string | 否 | — | `YYYY-MM-DD`，`publish_date < endDate + 1 天` |
| `page` | number | 否 | 1 | ≥ 1 |
| `pageSize` | number | 否 | 20 | 1 ~ 100 |

**响应** `ApiResult<PageResult<AnnounceListItem>>`

```ts
type AnnounceListItem = {
  id: number;
  title: string;
  announceType: string;      // announce_type
  purchaser: string;
  region: string;
  budget: number | null;      // 单位：元
  publishDate: string | null; // ISO 串
  sourceSite: string;
  crawlStatus: string;        // crawl_status
};
```

**示例**

```
GET /api/announces?keyword=智慧城市&region=广东&page=1&pageSize=20

{
  "code": 0,
  "message": "ok",
  "data": {
    "list": [{
      "id": 1,
      "title": "广州市智慧城市大数据中心平台建设项目招标公告",
      "announceType": "招标公告",
      "purchaser": "广州市政数局",
      "region": "广东广州",
      "budget": 35000000,
      "publishDate": "2026-09-15T09:30:00+08:00",
      "sourceSite": "中国政府采购网",
      "crawlStatus": "已入库"
    }],
    "total": 1248,
    "page": 1,
    "pageSize": 20
  },
  "traceId": "..."
}
```

**实现约束**

- 禁止 `select('*')`；不返回 `content_html` / `content_text`
- 过滤必须在数据库层完成
- `startDate` / `endDate` 需做格式校验，非法返回 `400`

---

### 3.2 `GET /api/announces/{id}` 公告详情

**Path 参数**：`id` — `bid_announce.id`，正整数

**响应** `ApiResult<AnnounceDetail>`

```ts
type AnnounceDetail = {
  id: number;
  title: string;
  announceType: string;
  announceNo: string | null;      // announce_no
  detailUrl: string;              // detail_url，供「查看原文」
  publishDate: string | null;     // ISO 串
  purchaser: string;
  region: string;
  sourceSite: string;
  budget: number | null;          // 单位：元
  crawlStatus: string;
  remark: string;
  structured: BidDetailStructured | null;  // 解析失败为 null
  contentText: string | null;     // 结构化摘要缺失时回退展示
  crawledAt: string | null;
};

type BidDetailStructured = {
  title?: string;
  purchaser?: string;
  region?: string;
  budget?: number | null;   // 单位：元
  deadline?: string;        // 报名/投标截止时间，ISO 串
  contactPerson?: string;
  contactPhone?: string;
  agency?: string;
  summary?: string;
};
```

**错误**

- `id` 非正整数 → `400 INVALID_PARAM`
- 公告不存在 → `404 NOT_FOUND`
- 无 `bid_detail` 记录时 `structured` 与 `contentText` 返回 `null`，**不报错**

**实现约束**

- `structured` 用 Zod `safeParse` 解析，**失败降级为 `null`**，禁止抛错
- `contentText` 需截断（取前 2000 字），避免大字段全量传输

---

### 3.3 `GET /api/subscriptions` 查询订阅列表

**Query 参数**：无（订阅量小，不分页）

**响应** `ApiResult<{ list: SubscriptionItem[]; enabledCount: number; total: number }>`

```ts
type SubscriptionItem = {
  id: number;
  name: string;                 // 迁移 002 新增
  keyword: string;              // 空 = 不限
  region: string;               // 空 = 不限
  announceType: string;         // 空 = 全部类型
  channel: string;              // feishu_webhook / email / webhook
  webhookUrl: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};
```

**实现约束**

- 不返回完整 `webhookUrl` 给列表场景以外的调用（列表返回即可，但前端展示需脱敏为 `https://open.feishu.cn/.../881ed***`）

---

### 3.4 `POST /api/subscriptions` 新增订阅

**Body**（JSON）

```ts
{
  name: string;          // 必填，1~128
  keyword?: string;      // 默认 ''，空 = 不限；多关键词用 '/' 分隔
  region?: string;       // 默认 ''，空 = 不限
  announceType?: string; // 默认 ''，空 = 全部类型
  channel?: 'feishu_webhook' | 'email' | 'webhook';  // 默认 'feishu_webhook'
  webhookUrl: string;    // 必填，合法 URL，≤1024
  enabled?: boolean;     // 默认 true
}
```

**响应** `ApiResult<{ id: number }>`

**错误**

- Zod 校验失败 → `400 INVALID_PARAM`，`message` 携带首个字段错误
- 写入失败 → `500 INTERNAL`

**实现约束**

- 必须走 `lib/supabase/admin.ts`（`bid_subscription` 不向 anon 开放写权限）
- 校验 schema：`lib/validation/subscription.ts` 的 `SubscriptionUpsertSchema`

---

### 3.5 `PUT /api/subscriptions/{id}` 修改或停用订阅

**Path 参数**：`id` — `bid_subscription.id`

**Body**（JSON，全量覆盖）

```ts
{
  name: string;
  keyword?: string;
  region?: string;
  announceType?: string;
  channel?: 'feishu_webhook' | 'email' | 'webhook';
  webhookUrl: string;
  enabled: boolean;
}
```

**响应** `ApiResult<{ id: number }>`

**错误**

- `id` 非正整数 / Body 校验失败 → `400 INVALID_PARAM`
- 订阅不存在 → `404 NOT_FOUND`

**实现约束**

- 校验 schema 与 `POST` 共用 `SubscriptionUpsertSchema`
- 单独切换启用状态时，前端需传完整字段；禁止为「只改 enabled」另开接口
- `updated_at` 由数据库触发器自动维护

---

### 3.6 `GET /api/push-logs` 推送记录

**Query 参数**

| 参数 | 类型 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| `status` | string | 否 | — | `成功` / `失败` / `待重试`；空 = 全部 |
| `page` | number | 否 | 1 | |
| `pageSize` | number | 否 | 20 | |

**响应** `ApiResult<PageResult<PushLogItem> & { stats: PushLogStats }>`

```ts
type PushLogItem = {
  id: number;
  sentAt: string | null;        // 失败时为 null，前端回退用 createdAt
  createdAt: string;
  subscriptionId: number;
  subscriptionName: string;     // 关联 bid_subscription.name
  announceId: number;
  announceTitle: string;        // 关联 bid_announce.title
  channel: string;
  status: string;               // 成功 / 失败 / 待重试
  errorMessage: string;         // 成功时为 ''
};

type PushLogStats = {
  todayTotal: number;     // 今日推送次数
  todaySuccess: number;   // 今日成功
  todayFailed: number;    // 今日失败
  successRate: number;    // 0~100，保留 1 位小数；无数据为 0
};
```

**实现约束**

- 关联查询用 Supabase 嵌套 select（`subscription:bid_subscription(name)`、`announce:bid_announce(title)`），
  禁止 N+1 逐条查询
- 统计口径：`created_at` 落在今日 00:00 ~ 次日 00:00（服务端时区）

---

### 3.7 `GET /api/crawl-logs` 抓取日志

**Query 参数**

| 参数 | 类型 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| `sourceSite` | string | 否 | — | 源站名称，精确匹配；空 = 全部 |
| `page` | number | 否 | 1 | |
| `pageSize` | number | 否 | 20 | |

**响应** `ApiResult<PageResult<CrawlLogItem> & { todayRounds: number; todayTotal: number }>`

```ts
type CrawlLogItem = {
  id: number;
  runAt: string;          // ISO 串
  sourceSite: string;     // 迁移 002 新增
  siteLevel: string;      // 迁移 002 新增：A级 / B级 / C级
  total: number;
  success: number;
  failed: number;
  manual: number;
  note: string;
};
```

- `todayRounds`：今日执行轮次（今日 `bid_crawl_log` 记录数）
- `todayTotal`：今日 `total` 求和

**实现约束**

- **纯只读**。本接口不提供任何触发抓取的能力
- 排序 `run_at DESC, id DESC`

---

## 4. 数据访问与权限

| 接口 | 读/写 | 客户端 |
| --- | --- | --- |
| 3.1 / 3.2 公告 | 读 | `lib/supabase/server.ts`（anon） |
| 3.3 订阅列表 | 读 | `lib/supabase/admin.ts`（`bid_subscription` 不对 anon 开放） |
| 3.4 / 3.5 订阅写入 | 写 | `lib/supabase/admin.ts`（service_role） |
| 3.6 推送记录 | 读 | `lib/supabase/server.ts`（anon） |
| 3.7 抓取日志 | 读 | `lib/supabase/server.ts`（anon） |

🔴 应用**不写** `bid_announce` / `bid_detail` / `bid_push_log` / `bid_crawl_log`。

## 5. 字段命名对照（snake_case ↔ camelCase）

数据库为 `snake_case`，接口响应为 `camelCase`，映射固定在 `lib/data/**` 中完成：

| 数据库 | 接口 |
| --- | --- |
| `announce_type` | `announceType` |
| `announce_no` | `announceNo` |
| `detail_url` | `detailUrl` |
| `publish_date` | `publishDate` |
| `source_site` | `sourceSite` |
| `site_level` | `siteLevel` |
| `crawl_status` | `crawlStatus` |
| `webhook_url` | `webhookUrl` |
| `sent_at` | `sentAt` |
| `error_message` | `errorMessage` |
| `run_at` | `runAt` |
| `created_at` / `updated_at` | `createdAt` / `updatedAt` |

**例外**：`bid_detail.structured` 的 JSONB 内部键保持 `snake_case`
（`contact_person`、`contact_phone`），由 `types/structured.ts` 单独映射为 camelCase。
