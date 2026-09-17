/**
 * snake_case（数据库）↔ camelCase（接口）映射的唯一落点。
 *
 * 依据 docs/api-contract.md §5 与 docs/architecture.md §5.1：
 * 映射动作只允许发生在 lib/data/**，页面、组件、Route Handler 一律直接消费 camelCase 类型。
 *
 * ⚠️ 这里的归一化不是「美化」而是防御（见 types/database.ts 注释）：
 * - numeric 列（budget 等）经 PostgREST 可能返回字符串；
 * - 时间列可能为 null 或非法串，直接交给前端会导致 Invalid Date；
 * - 单字段脏数据不应让整个列表返回 500，因此异常只降级为 null / 空串。
 */

import { CONTENT_TEXT_MAX_LENGTH } from '@/lib/constants/domain';
import { BidDetailStructuredRowSchema } from '@/lib/validation/structured';
import type { AnnounceDetail, AnnounceListItem } from '@/types/announce';
import type { CrawlLogItem } from '@/types/crawl-log';
import type {
  BidAnnounceRow,
  BidCrawlLogRow,
  BidDetailRow,
  BidPushLogJoinedRow,
  BidSubscriptionRow,
} from '@/types/database';
import type { PushLogItem } from '@/types/push-log';
import type { BidDetailStructured } from '@/types/structured';
import type { SubscriptionItem } from '@/types/subscription';

/* ------------------------------------------------------------------ *
 * 通用归一化
 * ------------------------------------------------------------------ */

/** numeric 列 → number；空值、空白串、非数字串均归一为 null */
export function toNumber(value: number | string | null | undefined): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  // 注意 Number('') === 0，空白串必须先拦掉，否则「未披露金额」会变成 0 元
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

/** 计数列 → number；脏数据回退 0，保证统计不出现 NaN */
export function toCount(value: number | string | null | undefined): number {
  return toNumber(value) ?? 0;
}

/** NOT NULL 文本列 → string；null / undefined 归一为空串 */
export function toText(value: string | null | undefined): string {
  return typeof value === 'string' ? value : '';
}

/** 可空文本列 → string | null；空白串视为 null，避免前端渲染出空字段 */
export function toNullableText(value: string | null | undefined): string | null {
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }

  return value;
}

/** 时间列 → ISO 串；空值与非法值归一为 null（history: publish_date 迁移前为纯日期） */
export function toIsoString(value: string | null | undefined): string | null {
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }

  const timestamp = Date.parse(value);

  return Number.isNaN(timestamp) ? null : new Date(timestamp).toISOString();
}

/** boolean 列 → boolean；异常值回退 fallback（enabled 列有 NOT NULL 默认值） */
export function toBoolean(value: boolean | null | undefined, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

/** snake_case → camelCase（structured 之外的通用场景） */
export function snakeToCamel(key: string): string {
  return key.replace(/_+([a-z0-9])/g, (_match, char: string) => char.toUpperCase());
}

/** camelCase → snakeCase（写入库前的反向映射） */
export function camelToSnake(key: string): string {
  return key.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`);
}

/** 公告正文摘要：截断至 2000 字（api-contract.md §3.2），空值返回 null */
export function truncateContentText(value: string | null | undefined): string | null {
  const text = toNullableText(value);

  if (text === null) {
    return null;
  }

  return text.length <= CONTENT_TEXT_MAX_LENGTH ? text : text.slice(0, CONTENT_TEXT_MAX_LENGTH);
}

/* ------------------------------------------------------------------ *
 * structured（JSONB）：内部键保持 snake_case，输出映射为 camelCase
 * ------------------------------------------------------------------ */

/**
 * `bid_detail.structured` → 接口形态。
 *
 * 契约 §3.2：解析失败或无内容时降级为 null，绝不抛错。
 * 校验使用 safeParse（lib/validation/structured.ts），未知键忽略、缺字段不报错，
 * 尽量展示已有数据而不是让整块降级。
 */
export function mapStructured(value: unknown): BidDetailStructured | null {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = BidDetailStructuredRowSchema.safeParse(value);

  if (!parsed.success) {
    console.error('[data] bid_detail.structured 解析失败，已降级为 null', parsed.error.issues);
    return null;
  }

  const row = parsed.data;

  const normalized: Record<keyof BidDetailStructured, string | number | null> = {
    title: toNullableText(row.title),
    purchaser: toNullableText(row.purchaser),
    region: toNullableText(row.region),
    budget: toNumber(row.budget),
    deadline: toIsoString(row.deadline),
    contactPerson: toNullableText(row.contact_person),
    contactPhone: toNullableText(row.contact_phone),
    agency: toNullableText(row.agency),
    summary: toNullableText(row.summary),
  };

  // 丢掉空值键：JSON 序列化虽会忽略 undefined，但保留会让对象形状污染断言与日志；
  // 全字段为空时视为「无结构化信息」，与解析失败同样降级为 null。
  const entries = Object.entries(normalized).filter(([, value]) => !isBlank(value));

  return entries.length === 0 ? null : (Object.fromEntries(entries) as BidDetailStructured);
}

function isBlank(value: unknown): boolean {
  return value === undefined || value === null || value === '';
}

/* ------------------------------------------------------------------ *
 * 实体映射
 * ------------------------------------------------------------------ */

/** bid_announce → 公告列表项（api-contract.md §3.1） */
export function mapAnnounceListItem(row: BidAnnounceRow): AnnounceListItem {
  return {
    id: row.id,
    title: toText(row.title),
    announceType: toText(row.announce_type),
    purchaser: toText(row.purchaser),
    region: toText(row.region),
    budget: toNumber(row.budget),
    publishDate: toIsoString(row.publish_date),
    sourceSite: toText(row.source_site),
    crawlStatus: toText(row.crawl_status),
  };
}

/** bid_announce + bid_detail → 公告详情（api-contract.md §3.2） */
export function mapAnnounceDetail(
  row: BidAnnounceRow,
  detail: BidDetailRow | null,
): AnnounceDetail {
  return {
    id: row.id,
    title: toText(row.title),
    announceType: toText(row.announce_type),
    announceNo: toNullableText(row.announce_no),
    detailUrl: toText(row.detail_url),
    publishDate: toIsoString(row.publish_date),
    purchaser: toText(row.purchaser),
    region: toText(row.region),
    sourceSite: toText(row.source_site),
    budget: toNumber(row.budget),
    crawlStatus: toText(row.crawl_status),
    remark: toText(row.remark),
    structured: mapStructured(detail?.structured ?? null),
    contentText: truncateContentText(detail?.content_text),
    crawledAt: toIsoString(detail?.crawled_at),
  };
}

/** bid_subscription → 订阅列表项（api-contract.md §3.3） */
export function mapSubscriptionItem(row: BidSubscriptionRow): SubscriptionItem {
  return {
    id: row.id,
    name: toText(row.name),
    keyword: toText(row.keyword),
    region: toText(row.region),
    announceType: toText(row.announce_type),
    channel: toText(row.channel),
    webhookUrl: toText(row.webhook_url),
    enabled: toBoolean(row.enabled),
    createdAt: toIsoString(row.created_at) ?? '',
    updatedAt: toIsoString(row.updated_at) ?? '',
  };
}

/** bid_push_log（含嵌套关联）→ 推送记录（api-contract.md §3.6） */
export function mapPushLogItem(row: BidPushLogJoinedRow): PushLogItem {
  return {
    id: row.id,
    sentAt: toIsoString(row.sent_at),
    createdAt: toIsoString(row.created_at) ?? '',
    subscriptionId: row.subscription_id,
    subscriptionName: toText(row.subscription?.name),
    announceId: row.announce_id,
    announceTitle: toText(row.announce?.title),
    channel: toText(row.channel),
    status: toText(row.status),
    errorMessage: toText(row.error_message),
  };
}

/** bid_crawl_log → 抓取日志（api-contract.md §3.7） */
export function mapCrawlLogItem(row: BidCrawlLogRow): CrawlLogItem {
  return {
    id: row.id,
    runAt: toIsoString(row.run_at) ?? '',
    sourceSite: toText(row.source_site),
    siteLevel: toText(row.site_level),
    total: toCount(row.total),
    success: toCount(row.success),
    failed: toCount(row.failed),
    manual: toCount(row.manual),
    note: toText(row.note),
  };
}
