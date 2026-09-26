-- =============================================================
-- 招投标信息推送系统 · 增量迁移 002（应用侧字段 / 类型 / 索引 / RLS）
--
-- 依赖：必须先执行 001_bid_schema.sql（本脚本假设 5 张表已存在）
-- 目标：Supabase 项目 public schema
-- 执行方式：Supabase Dashboard → SQL Editor → 粘贴全文 → Run
-- 幂等性：全部使用 ADD COLUMN IF NOT EXISTS / CREATE INDEX IF NOT EXISTS /
--         DROP POLICY IF EXISTS 后再 CREATE POLICY；类型变更用 DO 块按 data_type 判断后执行，
--         因此本脚本可重复执行且不产生副作用。
-- 依据：docs/api-contract.md §3、docs/architecture.md §4.3、docs/系统设计.md
--
-- =============================================================
-- 🔴🔴 执行本脚本后，采集链路的写入方式必须调整 🔴🔴
--
-- 本脚本会为 5 张表启用 RLS：
--   · bid_announce / bid_detail / bid_push_log / bid_crawl_log —— 仅开放 anon 的 SELECT；
--   · bid_subscription —— **不开放任何 anon 策略**（连 SELECT 都会被拒绝）。
--
-- 因此：
--   1) n8n 侧必须使用 service_role（service_role key 绕过 RLS），
--      且该 key 只能存在于 n8n 凭据中，绝不允许下发到浏览器；
--   2) 应用侧读取公告/推送/抓取日志走 anon key（lib/supabase/server.ts），
--      读写订阅走 service_role（lib/supabase/admin.ts）；
--   3) 若在 n8n 或测试脚本里用 anon key 读 bid_subscription，会返回 0 行而非报错，
--      **静默失败**是最常见的踩坑点。
-- =============================================================


-- -------------------------------------------------------------
-- 一、bid_announce：补字段 + publish_date 类型变更
-- -------------------------------------------------------------

-- 公告编号（招标文件编号，如 XYZB-2025-0912）；非所有站点都提供，故可空。
ALTER TABLE bid_announce
  ADD COLUMN IF NOT EXISTS announce_no VARCHAR(128);

COMMENT ON COLUMN bid_announce.announce_no IS '公告编号（迁移 002 新增，可空，站点未提供时为 NULL）';

-- publish_date：DATE → TIMESTAMPTZ。
-- 原 DATE 值按业务时区 Asia/Shanghai 的 0 点解释，避免转换后被当成 UTC 0 点而整体前移 8 小时。
-- 已迁移过的环境（data_type 已是 timestamp with time zone）会跳过，不会二次转换。
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

COMMENT ON COLUMN bid_announce.publish_date IS '发布日期（迁移 002 起为 TIMESTAMPTZ；原 DATE 值按 Asia/Shanghai 0 点解释）';


-- -------------------------------------------------------------
-- 二、bid_subscription：补字段 + updated_at 触发器
-- -------------------------------------------------------------

-- 订阅名称（应用侧「订阅管理」列表的可读标识；原表只有条件字段，无法一眼识别用途）。
ALTER TABLE bid_subscription
  ADD COLUMN IF NOT EXISTS name VARCHAR(128) NOT NULL DEFAULT '';

COMMENT ON COLUMN bid_subscription.name IS '订阅名称（迁移 002 新增；空串兼容历史数据，新建订阅由接口要求必填）';

-- updated_at：PUT /api/subscriptions/{id} 是「全量覆盖」写入，需要更新时间用于列表排序与审计。
ALTER TABLE bid_subscription
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

COMMENT ON COLUMN bid_subscription.updated_at IS '更新时间（迁移 002 新增，触发器自动维护，应用层不写入）';

-- 复用 001 已定义的 set_updated_at()；若函数不存在说明 001 未执行，此处会直接报错（预期行为）。
DROP TRIGGER IF EXISTS trg_bid_subscription_updated_at ON bid_subscription;
CREATE TRIGGER trg_bid_subscription_updated_at
  BEFORE UPDATE ON bid_subscription
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- -------------------------------------------------------------
-- 三、bid_crawl_log：补字段（来源站点 / 站点等级）
-- -------------------------------------------------------------

-- 原表只记录轮次汇总，无法区分是哪个源站的结果。
ALTER TABLE bid_crawl_log
  ADD COLUMN IF NOT EXISTS source_site VARCHAR(64) NOT NULL DEFAULT '';

COMMENT ON COLUMN bid_crawl_log.source_site IS '来源站点（迁移 002 新增，与 bid_announce.source_site 同一套站点名称）';

-- 站点等级：A级 / B级 / C级。
-- 🔴 刻意**不加 CHECK 约束**：n8n 若写入契约外的取值（新等级、空值、临时标记），
--    加了 CHECK 会直接让整批 INSERT 失败，从而中断采集链路；此处允许写入，
--    取值口径由飞书源站配置表约束，前端对空值显示「—」。
ALTER TABLE bid_crawl_log
  ADD COLUMN IF NOT EXISTS site_level VARCHAR(16) NOT NULL DEFAULT '';

COMMENT ON COLUMN bid_crawl_log.site_level IS '站点等级：A级 / B级 / C级（迁移 002 新增；不加 CHECK 约束，允许空值与意外取值，避免中断采集链路）';


-- -------------------------------------------------------------
-- 四、索引：为应用侧列表的排序 / 过滤补齐支撑
-- -------------------------------------------------------------

-- 推送记录列表：按 sent_at DESC 排序（失败记录 sent_at 为 NULL，用 NULLS LAST 保持分页稳定）
CREATE INDEX IF NOT EXISTS idx_bid_push_log_sent_at
  ON bid_push_log (sent_at DESC NULLS LAST);

-- 抓取日志列表：按 source_site 精确过滤 + run_at DESC 排序
CREATE INDEX IF NOT EXISTS idx_bid_crawl_log_source_site_run_at
  ON bid_crawl_log (source_site, run_at DESC);


-- -------------------------------------------------------------
-- 五、行级安全（RLS）
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


-- =============================================================
-- 六、回滚脚本（仅在需要撤销本迁移时手工执行；默认不运行）
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
