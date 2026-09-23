# Spec Delta

## Purpose

公告查询数据访问能力：为公告列表页与公告详情页提供服务端查询行为，覆盖契约 `docs/api-contract.md` §3.1/§3.2 的分页、过滤、排序、关联与降级约束。它是页面的唯一数据来源，也是「查询下推数据库、应用侧只读」红线的落点。

## ADDED Requirements

### Requirement: 公告列表分页查询

系统 SHALL 在数据库层完成公告列表的分页（`range` + 精确总数），返回 `{ list, total, page, pageSize }`，并 SHALL NOT 将全表数据拉到应用层再切片。

#### Scenario: 默认分页

- **WHEN** 查询不携带 `page` 与 `pageSize`
- **THEN** 返回第 1 页、每页 20 条，`total` 为满足条件的数据库总条数

#### Scenario: 页码超出范围

- **WHEN** 请求的 `page` 超过总页数
- **THEN** `list` 为空数组且 `total` 保持真实总数，不报错

### Requirement: 公告列表过滤语义

系统 SHALL 支持以下过滤条件且全部在数据库层执行：`keyword` 标题模糊包含、`region` 地区包含匹配、`announceType` 与 `sourceSite` 精确匹配、`startDate`/`endDate` 构成发布日期闭区间（`endDate` 含当日）。所有条件为空时 SHALL 返回不过滤的全量分页结果。

#### Scenario: 关键词模糊匹配

- **WHEN** `keyword=智慧城市`
- **THEN** 仅返回标题包含「智慧城市」的公告

#### Scenario: 时间范围含边界

- **WHEN** `startDate=2026-09-01&endDate=2026-09-15`
- **THEN** 返回发布日期在 9 月 1 日 00:00 至 9 月 15 日 24:00（含）之间的公告

#### Scenario: 地区包含匹配

- **WHEN** `region=广东`
- **THEN** 返回地区字段包含「广东」的公告（如「广东广州」「广东省深圳市」）

### Requirement: 公告列表排序稳定

列表 SHALL 按 `publish_date` 降序、次级键升序/降序一致的固定规则排序，空发布日期 SHALL 排在有效日期之后，保证翻页不重不漏。

#### Scenario: 空发布日期不抢占首位

- **WHEN** 存在 `publish_date` 为 null 的公告
- **THEN** 它们排列在所有有日期的公告之后，且多次翻页无重复或遗漏

### Requirement: 公告列表不返回大字段

列表项 SHALL 仅包含契约 §3.1 的 9 个字段（id、title、announceType、purchaser、region、budget、publishDate、sourceSite、crawlStatus），SHALL NOT 返回 `content_html` / `content_text`，SHALL NOT 使用 `select('*')`。

#### Scenario: 列表响应字段受控

- **WHEN** 调用公告列表查询
- **THEN** 每个列表项恰好包含契约 §3.1 声明的字段，无正文类大字段

### Requirement: 公告详情关联查询

系统 SHALL 按 `id` 单行取回 `bid_announce` 并关联 `bid_detail`（单次关联查询，禁止先取全表再在应用层查找）；公告不存在时 SHALL 返回 404 语义错误。

#### Scenario: 公告不存在

- **WHEN** 以不存在的 `id` 查询详情
- **THEN** 返回 404 NOT_FOUND，不泄露内部查询细节

#### Scenario: 无详情记录不是错误

- **WHEN** 公告存在但尚无对应 `bid_detail` 记录
- **THEN** `structured` 与 `contentText` 返回 null，接口整体成功

### Requirement: 详情结构化字段安全降级

`bid_detail.structured` SHALL 使用安全解析（safeParse）：解析失败或全空时降级为 null，SHALL NOT 抛错导致整条详情失败；`contentText` SHALL 截断至 2000 字以内返回。

#### Scenario: structured 为脏数据

- **WHEN** `bid_detail.structured` 不是合法 JSON 对象或字段类型不符
- **THEN** 详情仍成功返回，`structured` 为 null，其余字段完整

#### Scenario: 正文截断

- **WHEN** `bid_detail.content_text` 超过 2000 字
- **THEN** 返回值仅含前 2000 字

### Requirement: 公告查询只读

公告查询 SHALL 仅使用 anon 只读客户端（受 RLS 约束），SHALL NOT 写入任何表，SHALL NOT 提供任何触发抓取或修改 `crawl_status` 的能力。

#### Scenario: 查询不产生写入

- **WHEN** 任意公告列表或详情查询执行
- **THEN** `bid_announce`、`bid_detail` 等表数据不变，`crawl_status` 不被应用侧修改
