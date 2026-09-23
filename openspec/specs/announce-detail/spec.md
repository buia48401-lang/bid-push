# 公告详情页

## Purpose

公告详情页能力：按 `docs/product-design.md` §5 展示单条公告的结构化字段与正文摘要，并提供跳转原文链接，帮助用户快速判断公告价值。

## Requirements

### Requirement: 标题区与查看原文

页面顶部 SHALL 展示公告标题（18px/600）与公告类型语义 Tag，右侧提供「查看原文」按钮（新窗口打开 `detailUrl`）；下一行 SHALL 以 12px 辅助色展示「来源：{source_site} · 发布时间：{publish_date YYYY-MM-DD HH:mm} · 公告编号：{announce_no}」，缺失项显示「—」。侧栏 SHALL 保持「公告列表」高亮，面包屑为「首页 / 公告列表 / 公告详情」。

#### Scenario: 打开原文链接

- **WHEN** 用户点击「查看原文」
- **THEN** 浏览器在新窗口/标签页打开该公告的 `detailUrl`，当前页面不跳转

#### Scenario: 辅助信息缺失占位

- **WHEN** 公告编号为 null
- **THEN** 辅助行显示「公告编号：—」，页面其余部分正常渲染

### Requirement: 基本信息卡

页面 SHALL 提供「基本信息」卡片，以两列栅格展示：采购人、预算金额（加粗，`X,XXX.XX 万元`）、投标截止时间（取 `structured.deadline`，错误红色，附「（剩余 N 天）」）、代理机构、联系人、联系电话（后四项取自 `structured`）。任一字段缺失 SHALL 显示「—」。

#### Scenario: 截止时间临近提示

- **WHEN** `structured.deadline` 为 3 天后
- **THEN** 该字段以错误红展示时间，并附「（剩余 3 天）」

#### Scenario: 截止时间已过

- **WHEN** `structured.deadline` 早于当前时间
- **THEN** 该字段展示「已过期」状态而非负数天数

#### Scenario: 无结构化字段

- **WHEN** 公告 `structured` 为 null
- **THEN** 采购人、预算之外的结构化字段均显示「—」，页面不报错

### Requirement: 正文摘要多级回退

「正文摘要」卡 SHALL 优先展示 `structured.summary`；无 summary 时 SHALL 回退展示 `contentText` 前 300 字并注明为正文摘录；两者皆无时 SHALL 显示空态「暂无结构化摘要」。卡片标题行 SHALL 右侧以 12px 灰字注明数据出处（结构化字段提取自 bid_detail.structured）。

#### Scenario: 优先结构化摘要

- **WHEN** 公告同时具有 `structured.summary` 与 `contentText`
- **THEN** 正文区展示 `structured.summary` 原文

#### Scenario: 回退正文摘录

- **WHEN** `structured.summary` 缺失且 `contentText` 存在
- **THEN** 正文区展示 `contentText` 前 300 字，超长部分截断

#### Scenario: 摘要全缺失

- **WHEN** `structured` 为 null 且 `contentText` 为 null
- **THEN** 正文卡显示「暂无结构化摘要」空态

### Requirement: 详情页错误态

`id` 非正整数或公告不存在时，页面 SHALL 呈现 404 兜底页（复用全局 not-found）；数据库不可用等服务端异常 SHALL 由全局错误边界呈现错误提示与重试入口，SHALL NOT 白屏。

#### Scenario: 访问不存在的公告

- **WHEN** 用户访问 `/announces/999999`
- **THEN** 展示 404 兜底页而非错误堆栈
