-- =============================================================
-- 招投标信息推送系统 · PostgreSQL / Supabase 建表脚本
-- 唯一事实源：docs/招投标信息推送系统设计方案.md §7 + docs/系统设计：把工具职责和数据流固定下来.md
-- 共 5 张表：bid_announce / bid_detail / bid_subscription / bid_crawl_log / bid_push_log
-- （源站配置只在飞书多维表格，Supabase 不做镜像，无 bid_source 表）
-- 目标：Supabase 项目 public schema（Supabase 不允许 CREATE DATABASE）
-- 执行方式：Supabase Dashboard → SQL Editor → 粘贴本文件全文 → Run（可重复执行）
-- =============================================================

-- pg_trgm：Supabase 自带扩展，用于 title 的三元组模糊/子串检索（中文比 FULLTEXT 更合适）
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- updated_at 自动维护触发器函数（替代 MySQL 的 ON UPDATE CURRENT_TIMESTAMP）
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -------------------------------------------------------------
-- bid_announce：公告主记录
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bid_announce (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title         VARCHAR(512)  NOT NULL DEFAULT '',
  detail_url    VARCHAR(768)  NOT NULL,
  announce_type VARCHAR(32)   NOT NULL DEFAULT '',
  publish_date  DATE,
  purchaser     VARCHAR(255)  NOT NULL DEFAULT '',
  region        VARCHAR(32)   NOT NULL DEFAULT '',
  source_site   VARCHAR(64)   NOT NULL DEFAULT '',
  budget        DECIMAL(18,2),
  crawl_status  VARCHAR(16)   NOT NULL DEFAULT '待抓取',
  remark        VARCHAR(1024) NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  CONSTRAINT uk_detail_url UNIQUE (detail_url)
);

COMMENT ON TABLE  bid_announce               IS '公告主记录表';
COMMENT ON COLUMN bid_announce.id            IS '主键';
COMMENT ON COLUMN bid_announce.title         IS '公告标题';
COMMENT ON COLUMN bid_announce.detail_url    IS '详情链接（唯一键，全链路去重依据）';
COMMENT ON COLUMN bid_announce.announce_type IS '公告类型：招标公告 / 中标公告 / 成交公告 / 竞争性磋商 / 询价公告 / 更正公告 / 其他';
COMMENT ON COLUMN bid_announce.publish_date  IS '发布日期';
COMMENT ON COLUMN bid_announce.purchaser     IS '采购人';
COMMENT ON COLUMN bid_announce.region        IS '地区（全国 + 32 省级行政区）';
COMMENT ON COLUMN bid_announce.source_site   IS '来源站点（与飞书源站配置表的站点名称对应）';
COMMENT ON COLUMN bid_announce.budget        IS '预算金额（元，可空，由 n8n 详情阶段补齐）';
COMMENT ON COLUMN bid_announce.crawl_status  IS '抓取状态：待抓取 / 已入库 / 抓取失败 / 待人工（与飞书状态机一致）';
COMMENT ON COLUMN bid_announce.remark        IS '备注（失败原因等）';
COMMENT ON COLUMN bid_announce.created_at    IS '创建时间';
COMMENT ON COLUMN bid_announce.updated_at    IS '更新时间（触发器自动维护）';

DROP TRIGGER IF EXISTS trg_bid_announce_updated_at ON bid_announce;
CREATE TRIGGER trg_bid_announce_updated_at
  BEFORE UPDATE ON bid_announce
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 普通索引（文档 §7：crawl_status、publish_date）
CREATE INDEX IF NOT EXISTS idx_bid_announce_crawl_status ON bid_announce (crawl_status);
CREATE INDEX IF NOT EXISTS idx_bid_announce_publish_date ON bid_announce (publish_date);
-- title 模糊检索：pg_trgm GIN 索引（中文子串/模糊匹配比 tsvector 分词更稳）；
-- 如需按词全文检索，可改为 tsvector 方案：
--   ALTER TABLE bid_announce ADD COLUMN title_tsv tsvector
--     GENERATED ALWAYS AS (to_tsvector('simple', title)) STORED;
--   CREATE INDEX idx_bid_announce_title_tsv ON bid_announce USING gin (title_tsv);
CREATE INDEX IF NOT EXISTS idx_bid_announce_title_trgm ON bid_announce USING gin (title gin_trgm_ops);

-- -------------------------------------------------------------
-- bid_detail：公告详情
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bid_detail (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  announce_id  BIGINT       NOT NULL,
  content_html TEXT,
  content_text TEXT,
  structured   JSONB,
  crawled_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT fk_detail_announce FOREIGN KEY (announce_id)
    REFERENCES bid_announce (id) ON DELETE CASCADE ON UPDATE CASCADE
);

COMMENT ON TABLE  bid_detail              IS '公告详情表';
COMMENT ON COLUMN bid_detail.id           IS '主键';
COMMENT ON COLUMN bid_detail.announce_id  IS '关联 bid_announce.id';
COMMENT ON COLUMN bid_detail.content_html IS '详情页原文 HTML 快照';
COMMENT ON COLUMN bid_detail.content_text IS '详情页纯文本正文';
COMMENT ON COLUMN bid_detail.structured   IS '结构化抽取结果 JSONB（标题/采购人/地区/预算金额/报名截止时间/联系人/联系电话/代理机构/正文摘要）';
COMMENT ON COLUMN bid_detail.crawled_at   IS '详情抓取时间';

CREATE INDEX IF NOT EXISTS idx_bid_detail_announce_id ON bid_detail (announce_id);

-- -------------------------------------------------------------
-- bid_subscription：客户订阅条件
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bid_subscription (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  keyword       VARCHAR(255)  NOT NULL DEFAULT '',
  region        VARCHAR(32)   NOT NULL DEFAULT '',
  announce_type VARCHAR(32)   NOT NULL DEFAULT '',
  channel       VARCHAR(32)   NOT NULL DEFAULT 'feishu_webhook',
  webhook_url   VARCHAR(1024) NOT NULL DEFAULT '',
  enabled       BOOLEAN       NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

COMMENT ON TABLE  bid_subscription               IS '客户订阅条件表';
COMMENT ON COLUMN bid_subscription.id            IS '主键';
COMMENT ON COLUMN bid_subscription.keyword       IS '订阅关键词（空=不限）';
COMMENT ON COLUMN bid_subscription.region        IS '订阅地区（空=不限）';
COMMENT ON COLUMN bid_subscription.announce_type IS '订阅公告类型（空=不限；与 bid_announce.announce_type 对应）';
COMMENT ON COLUMN bid_subscription.channel       IS '推送渠道（默认飞书群机器人 webhook）';
COMMENT ON COLUMN bid_subscription.webhook_url   IS '推送目标 Webhook 地址';
COMMENT ON COLUMN bid_subscription.enabled       IS '启用状态：true=启用，false=停用';
COMMENT ON COLUMN bid_subscription.created_at    IS '创建时间';

-- -------------------------------------------------------------
-- bid_crawl_log：抓取执行日志
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bid_crawl_log (
  id      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  run_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
  total   INT           NOT NULL DEFAULT 0,
  success INT           NOT NULL DEFAULT 0,
  failed  INT           NOT NULL DEFAULT 0,
  manual  INT           NOT NULL DEFAULT 0,
  note    VARCHAR(1024) NOT NULL DEFAULT ''
);

COMMENT ON TABLE  bid_crawl_log         IS '抓取执行日志表（审计用）';
COMMENT ON COLUMN bid_crawl_log.id      IS '主键';
COMMENT ON COLUMN bid_crawl_log.run_at  IS '执行时间';
COMMENT ON COLUMN bid_crawl_log.total   IS '本轮处理总条数（OCR 单行日志为当次尝试计 1）';
COMMENT ON COLUMN bid_crawl_log.success IS '成功条数';
COMMENT ON COLUMN bid_crawl_log.failed  IS '失败条数';
COMMENT ON COLUMN bid_crawl_log.manual  IS '转待人工条数';
COMMENT ON COLUMN bid_crawl_log.note    IS '备注（轮次汇总说明 / OCR 单次尝试：时间/站点/URL/成败）';

CREATE INDEX IF NOT EXISTS idx_bid_crawl_log_run_at ON bid_crawl_log (run_at);

-- -------------------------------------------------------------
-- bid_push_log：推送结果
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bid_push_log (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  subscription_id BIGINT        NOT NULL,
  announce_id     BIGINT        NOT NULL,
  channel         VARCHAR(32)   NOT NULL DEFAULT 'feishu_webhook',
  status          VARCHAR(16)   NOT NULL DEFAULT '待重试',
  sent_at         TIMESTAMPTZ,
  error_message   VARCHAR(1024) NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  CONSTRAINT uk_push UNIQUE (announce_id, subscription_id),
  CONSTRAINT fk_push_subscription FOREIGN KEY (subscription_id)
    REFERENCES bid_subscription (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_push_announce FOREIGN KEY (announce_id)
    REFERENCES bid_announce (id) ON DELETE CASCADE ON UPDATE CASCADE
);

COMMENT ON TABLE  bid_push_log                 IS '推送结果表（同一公告对同一订阅不重复发送，uk_push 幂等）';
COMMENT ON COLUMN bid_push_log.id              IS '主键';
COMMENT ON COLUMN bid_push_log.subscription_id IS '关联 bid_subscription.id';
COMMENT ON COLUMN bid_push_log.announce_id     IS '关联 bid_announce.id';
COMMENT ON COLUMN bid_push_log.channel         IS '推送渠道（默认飞书群机器人 webhook）';
COMMENT ON COLUMN bid_push_log.status          IS '推送状态：成功 / 失败 / 待重试';
COMMENT ON COLUMN bid_push_log.sent_at         IS '发送成功时间';
COMMENT ON COLUMN bid_push_log.error_message   IS '失败原因（HTTP 状态码 + 错误摘要）';
COMMENT ON COLUMN bid_push_log.created_at      IS '记录创建时间';

CREATE INDEX IF NOT EXISTS idx_bid_push_log_subscription_id ON bid_push_log (subscription_id);
CREATE INDEX IF NOT EXISTS idx_bid_push_log_status ON bid_push_log (status);

-- 空条件 = 订阅全部公告；按需可加 keyword/region/announce_type 过滤
INSERT INTO bid_subscription (keyword, region, announce_type, channel, webhook_url, enabled)
VALUES ('', '', '', 'feishu_webhook',
        'https://open.feishu.cn/open-apis/bot/v2/hook/881ed30d-5214-4609-9e75-d7ca14b60c33', true);

-- 顺便确认表里有数据了
SELECT id, keyword, region, webhook_url, enabled FROM bid_subscription;