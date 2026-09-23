-- =============================================================
-- 招投标信息推送系统 · PostgreSQL / Supabase 建表脚本（全量基线 · 唯一维护副本）
--
-- 本文件由以下三个脚本合并而成，直接描述系统**最终结构状态**，适用于全新环境一键初始化：
--   · 001_bid_schema.sql           全量基线（5 表 / 索引 / 触发器 / 种子订阅）
--   · 002_app_fields_migration.sql 增量迁移（补字段 / publish_date 改 TIMESTAMPTZ / 补索引 / RLS）
--   · 初始化.sql                   最早历史副本（内容已被 001 覆盖，仅保留末尾验证查询）
--   以上三个原文件已于合并并逐项核对后删除，本文件自此为数据库结构的唯一维护副本。
--
-- 说明：
--   · 后续结构变更仍新建 003_xxx.sql，并同步维护本合并脚本；
--   · 共 5 张表：bid_announce / bid_detail / bid_subscription / bid_crawl_log / bid_push_log
--     （源站配置只在飞书多维表格，Supabase 不做镜像，无 bid_source 表）
--   · 目标：Supabase 项目 public schema（Supabase 不允许 CREATE DATABASE）
--   · 执行方式：Supabase Dashboard → SQL Editor → 粘贴本文件全文 → Run
--
-- 幂等性：建表/建索引带 IF NOT EXISTS，函数用 OR REPLACE，补列用 ADD COLUMN IF NOT EXISTS，
--         publish_date 类型变更用 DO 块按 data_type 判断，策略先 DROP 再 CREATE，
--         种子订阅按 webhook_url 幂等化；无论环境处于「全新 / 仅执行过 001 / 已执行 001+002」
--         哪种状态，均可重复执行且不产生副作用。
--
-- ⚠️ 执行本脚本后 RLS 生效，采集链路的写入方式必须调整：
--   · bid_announce / bid_detail / bid_push_log / bid_crawl_log —— 仅开放 anon 的 SELECT；
--   · bid_subscription —— **不开放任何 anon 策略**（连 SELECT 都会被拒绝）。
--   1) n8n 侧必须使用 service_role（service_role key 绕过 RLS），
--      且该 key 只能存在于 n8n 凭据中，绝不允许下发到浏览器；
--   2) 应用侧读取公告/推送/抓取日志走 anon key（lib/supabase/server.ts），
--      读写订阅走 service_role（lib/supabase/admin.ts）；
--   3) 若用 anon key 读 bid_subscription，会返回 0 行而非报错，
--      **静默失败**是最常见的踩坑点。
-- =============================================================


-- -------------------------------------------------------------
-- 〇、扩展与公共函数
-- -------------------------------------------------------------

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
-- 一、bid_announce：公告主记录
-- -------------------------------------------------------------

-- 最终结构：publish_date 为 TIMESTAMPTZ，announce_no 为增量迁移新增列。
CREATE TABLE IF NOT EXISTS bid_announce (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title         VARCHAR(512)  NOT NULL DEFAULT '',
  detail_url    VARCHAR(768)  NOT NULL,
  announce_type VARCHAR(32)   NOT NULL DEFAULT '',
  publish_date  TIMESTAMPTZ,
  announce_no   VARCHAR(128),
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

-- 兼容「仅执行过 001」的环境：补列（全新环境为无害空操作）
ALTER TABLE bid_announce
  ADD COLUMN IF NOT EXISTS announce_no VARCHAR(128);

-- publish_date：DATE → TIMESTAMPTZ（仅针对「仅执行过 001」的旧环境）。
-- 原 DATE 值按业务时区 Asia/Shanghai 的 0 点解释，避免转换后被当成 UTC 0 点而整体前移 8 小时。
-- 已是 TIMESTAMPTZ（全新库 / 已迁移）的环境会跳过，不会二次转换。
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name   = 'bid_announce'
       AND column_name  = 'publish_date'
       AND data_type    = 'date'
  ) THEN
    ALTER TABLE bid_announce
      ALTER COLUMN publish_date TYPE TIMESTAMPTZ
      USING publish_date::timestamp AT TIME ZONE 'Asia/Shanghai';
  END IF;
END $$;

COMMENT ON TABLE  bid_announce               IS '公告主记录表';
COMMENT ON COLUMN bid_announce.id            IS '主键';
COMMENT ON COLUMN bid_announce.title         IS '公告标题';
COMMENT ON COLUMN bid_announce.detail_url    IS '详情链接（唯一键，全链路去重依据）';
COMMENT ON COLUMN bid_announce.announce_type IS '公告类型：招标公告 / 中标公告 / 成交公告 / 竞争性磋商 / 询价公告 / 更正公告 / 其他';
COMMENT ON COLUMN bid_announce.publish_date  IS '发布日期（TIMESTAMPTZ；原 DATE 值按 Asia/Shanghai 0 点解释）';
COMMENT ON COLUMN bid_announce.announce_no   IS '公告编号（招标文件编号，如 XYZB-2025-0912；非所有站点都提供，故可空，站点未提供时为 NULL）';
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
-- 二、bid_detail：公告详情
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
-- 三、bid_subscription：客户订阅条件
-- -------------------------------------------------------------

-- 最终结构：name / updated_at 为增量迁移新增列
-- （updated_at：PUT /api/subscriptions/{id} 是「全量覆盖」写入，需要更新时间用于列表排序与审计）。
CREATE TABLE IF NOT EXISTS bid_subscription (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name          VARCHAR(128)  NOT NULL DEFAULT '',
  keyword       VARCHAR(255)  NOT NULL DEFAULT '',
  region        VARCHAR(32)   NOT NULL DEFAULT '',
  announce_type VARCHAR(32)   NOT NULL DEFAULT '',
  channel       VARCHAR(32)   NOT NULL DEFAULT 'feishu_webhook',
  webhook_url   VARCHAR(1024) NOT NULL DEFAULT '',
  enabled       BOOLEAN       NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- 兼容「仅执行过 001」的环境：补列（全新环境为无害空操作）
ALTER TABLE bid_subscription
  ADD COLUMN IF NOT EXISTS name       VARCHAR(128) NOT NULL DEFAULT '';
ALTER TABLE bid_subscription
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ  NOT NULL DEFAULT now();

COMMENT ON TABLE  bid_subscription               IS '客户订阅条件表';
COMMENT ON COLUMN bid_subscription.id            IS '主键';
COMMENT ON COLUMN bid_subscription.name          IS '订阅名称（应用侧「订阅管理」列表的可读标识；空串兼容历史数据，新建订阅由接口要求必填）';
COMMENT ON COLUMN bid_subscription.keyword       IS '订阅关键词（空=不限）';
COMMENT ON COLUMN bid_subscription.region        IS '订阅地区（空=不限）';
COMMENT ON COLUMN bid_subscription.announce_type IS '订阅公告类型（空=不限；与 bid_announce.announce_type 对应）';
COMMENT ON COLUMN bid_subscription.channel       IS '推送渠道（默认飞书群机器人 webhook）';
COMMENT ON COLUMN bid_subscription.webhook_url   IS '推送目标 Webhook 地址';
COMMENT ON COLUMN bid_subscription.enabled       IS '启用状态：true=启用，false=停用';
COMMENT ON COLUMN bid_subscription.created_at    IS '创建时间';
COMMENT ON COLUMN bid_subscription.updated_at    IS '更新时间（触发器自动维护，应用层不写入）';

-- 复用上文已定义的 set_updated_at()
DROP TRIGGER IF EXISTS trg_bid_subscription_updated_at ON bid_subscription;
CREATE TRIGGER trg_bid_subscription_updated_at
  BEFORE UPDATE ON bid_subscription
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- -------------------------------------------------------------
-- 四、bid_crawl_log：抓取执行日志
-- -------------------------------------------------------------

-- 最终结构：source_site / site_level 为增量迁移新增列。
CREATE TABLE IF NOT EXISTS bid_crawl_log (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  run_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  source_site VARCHAR(64)   NOT NULL DEFAULT '',
  site_level  VARCHAR(16)   NOT NULL DEFAULT '',
  total       INT           NOT NULL DEFAULT 0,
  success     INT           NOT NULL DEFAULT 0,
  failed      INT           NOT NULL DEFAULT 0,
  manual      INT           NOT NULL DEFAULT 0,
  note        VARCHAR(1024) NOT NULL DEFAULT ''
);

-- 兼容「仅执行过 001」的环境：补列（全新环境为无害空操作）
ALTER TABLE bid_crawl_log
  ADD COLUMN IF NOT EXISTS source_site VARCHAR(64) NOT NULL DEFAULT '';
ALTER TABLE bid_crawl_log
  ADD COLUMN IF NOT EXISTS site_level  VARCHAR(16) NOT NULL DEFAULT '';

COMMENT ON TABLE  bid_crawl_log             IS '抓取执行日志表（审计用）';
COMMENT ON COLUMN bid_crawl_log.id          IS '主键';
COMMENT ON COLUMN bid_crawl_log.run_at      IS '执行时间';
COMMENT ON COLUMN bid_crawl_log.source_site IS '来源站点（与 bid_announce.source_site 同一套站点名称）';
COMMENT ON COLUMN bid_crawl_log.site_level  IS '站点等级：A级 / B级 / C级（不加 CHECK 约束，允许空值与意外取值，避免中断采集链路）';
COMMENT ON COLUMN bid_crawl_log.total       IS '本轮处理总条数（OCR 单行日志为当次尝试计 1）';
COMMENT ON COLUMN bid_crawl_log.success     IS '成功条数';
COMMENT ON COLUMN bid_crawl_log.failed      IS '失败条数';
COMMENT ON COLUMN bid_crawl_log.manual      IS '转待人工条数';
COMMENT ON COLUMN bid_crawl_log.note        IS '备注（轮次汇总说明 / OCR 单次尝试：时间/站点/URL/成败）';

CREATE INDEX IF NOT EXISTS idx_bid_crawl_log_run_at ON bid_crawl_log (run_at);
-- 抓取日志列表：按 source_site 精确过滤 + run_at DESC 排序
CREATE INDEX IF NOT EXISTS idx_bid_crawl_log_source_site_run_at
  ON bid_crawl_log (source_site, run_at DESC);


-- -------------------------------------------------------------
-- 五、bid_push_log：推送结果
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
-- 推送记录列表：按 sent_at DESC 排序（失败记录 sent_at 为 NULL，用 NULLS LAST 保持分页稳定）
CREATE INDEX IF NOT EXISTS idx_bid_push_log_sent_at
  ON bid_push_log (sent_at DESC NULLS LAST);


-- -------------------------------------------------------------
-- 六、种子订阅
-- -------------------------------------------------------------

-- 种子订阅：空条件 = 订阅全部公告。
-- 最早的初始化脚本为无条件 INSERT，重复执行会产生重复订阅；此处按 webhook_url 幂等化（保持「可重复执行」）。
INSERT INTO bid_subscription (keyword, region, announce_type, channel, webhook_url, enabled)
SELECT '', '', '', 'feishu_webhook',
       'https://open.feishu.cn/open-apis/bot/v2/hook/881ed30d-5214-4609-9e75-d7ca14b60c33', true
WHERE NOT EXISTS (
  SELECT 1 FROM bid_subscription
  WHERE webhook_url = 'https://open.feishu.cn/open-apis/bot/v2/hook/881ed30d-5214-4609-9e75-d7ca14b60c33'
);


-- -------------------------------------------------------------
-- 七、行级安全（RLS）
-- -------------------------------------------------------------

ALTER TABLE bid_announce     ENABLE ROW LEVEL SECURITY;
ALTER TABLE bid_detail       ENABLE ROW LEVEL SECURITY;
ALTER TABLE bid_subscription ENABLE ROW LEVEL SECURITY;
ALTER TABLE bid_crawl_log    ENABLE ROW LEVEL SECURITY;
ALTER TABLE bid_push_log     ENABLE ROW LEVEL SECURITY;

-- 1) 只读表：仅放开 SELECT。
--    RLS 采用「白名单」语义：没有匹配策略的操作一律拒绝，
--    所以这里不写 INSERT/UPDATE/DELETE 策略，即等于禁止 anon 写入。
DROP POLICY IF EXISTS pol_bid_announce_anon_select ON bid_announce;
CREATE POLICY pol_bid_announce_anon_select ON bid_announce
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS pol_bid_detail_anon_select ON bid_detail;
CREATE POLICY pol_bid_detail_anon_select ON bid_detail
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS pol_bid_crawl_log_anon_select ON bid_crawl_log;
CREATE POLICY pol_bid_crawl_log_anon_select ON bid_crawl_log
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS pol_bid_push_log_anon_select ON bid_push_log;
CREATE POLICY pol_bid_push_log_anon_select ON bid_push_log
  FOR SELECT TO anon USING (true);

-- 2) bid_subscription：不建任何 anon 策略。
--    应用侧经 service_role 读写（绕过 RLS），n8n 同理；
--    anon 访问会得到空结果集而非报错，属预期行为。
DROP POLICY IF EXISTS pol_bid_subscription_anon_select ON bid_subscription;

-- 注：MVP 无登录体系，故不创建 authenticated 策略。
--     将来接入 Supabase Auth 时，在此追加 `FOR SELECT TO authenticated` 策略即可，不需要改表结构。


-- 验证：确认种子订阅已就位（沿用最早初始化脚本的确认查询）
SELECT id, name, keyword, region, announce_type, webhook_url, enabled FROM bid_subscription;


-- =============================================================
-- 八、回滚脚本（仅在需要撤销增量迁移部分时手工执行；默认不运行）
-- =============================================================
-- DROP POLICY IF EXISTS pol_bid_announce_anon_select ON bid_announce;
-- DROP POLICY IF EXISTS pol_bid_detail_anon_select ON bid_detail;
-- DROP POLICY IF EXISTS pol_bid_crawl_log_anon_select ON bid_crawl_log;
-- DROP POLICY IF EXISTS pol_bid_push_log_anon_select ON bid_push_log;
-- ALTER TABLE bid_announce     DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE bid_detail       DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE bid_subscription DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE bid_crawl_log    DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE bid_push_log     DISABLE ROW LEVEL SECURITY;
-- DROP INDEX IF EXISTS idx_bid_push_log_sent_at;
-- DROP INDEX IF EXISTS idx_bid_crawl_log_source_site_run_at;
-- DROP TRIGGER IF EXISTS trg_bid_subscription_updated_at ON bid_subscription;
-- ALTER TABLE bid_crawl_log    DROP COLUMN IF EXISTS site_level;
-- ALTER TABLE bid_crawl_log    DROP COLUMN IF EXISTS source_site;
-- ALTER TABLE bid_subscription DROP COLUMN IF EXISTS updated_at;
-- ALTER TABLE bid_subscription DROP COLUMN IF EXISTS name;
-- ALTER TABLE bid_announce     DROP COLUMN IF EXISTS announce_no;
-- -- publish_date 回退会丢失时间部分，执行前请先备份：
-- -- ALTER TABLE bid_announce ALTER COLUMN publish_date TYPE DATE
-- --   USING (publish_date AT TIME ZONE 'Asia/Shanghai')::date;
-- =============================================================
