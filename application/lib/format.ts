import { EMPTY_PLACEHOLDER } from '@/lib/constants/domain';

/**
 * 展示格式化纯函数（列表 / 详情页共用）。
 *
 * 时间统一按 Asia/Shanghai 渲染：publish_date / deadline 是中国本地业务时间，
 * 而服务端时区不确定（容器常为 UTC），固定时区保证日期边界渲染稳定、可测。
 */

const DAY_MS = 24 * 60 * 60 * 1000;
/** 1 万元 = 10000 元（接口 budget 单位为元，product-design.md §4.2 按「万元」展示） */
const YUAN_PER_WAN = 10_000;

const SHANGHAI_DATETIME_FORMAT = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function shanghaiParts(value: string): Intl.DateTimeFormatPart[] | null {
  const timestamp = Date.parse(value);

  if (Number.isNaN(timestamp)) {
    return null;
  }

  return SHANGHAI_DATETIME_FORMAT.formatToParts(new Date(timestamp));
}

function partValue(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return parts.find((part) => part.type === type)?.value ?? '';
}

/** ISO 时间 → `YYYY-MM-DD`；空值 / 非法值显示占位符 */
export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return EMPTY_PLACEHOLDER;
  }

  const parts = shanghaiParts(value);

  return parts ? `${partValue(parts, 'year')}-${partValue(parts, 'month')}-${partValue(parts, 'day')}` : EMPTY_PLACEHOLDER;
}

/** ISO 时间 → `YYYY-MM-DD HH:mm`；空值 / 非法值显示占位符 */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return EMPTY_PLACEHOLDER;
  }

  const parts = shanghaiParts(value);

  if (!parts) {
    return EMPTY_PLACEHOLDER;
  }

  return `${partValue(parts, 'year')}-${partValue(parts, 'month')}-${partValue(parts, 'day')} ${partValue(parts, 'hour')}:${partValue(parts, 'minute')}`;
}

/**
 * 预算金额（元）→ 万元千分位 2 位小数，如 `3,500.00`；空值显示占位符。
 * 只输出数字部分，「万元」单位由列头或字段标签承载。
 */
export function formatBudgetWan(budget: number | null | undefined): string {
  if (budget === null || budget === undefined || !Number.isFinite(budget)) {
    return EMPTY_PLACEHOLDER;
  }

  return (budget / YUAN_PER_WAN).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * 投标截止时间 → 剩余天数后缀：未来返回「（剩余 N 天）」，
 * 已过期返回「（已过期）」，空值 / 非法值返回空串（调用方自行只展示时间或占位符）。
 */
export function remainingDaysText(deadline: string | null | undefined, now: Date = new Date()): string {
  if (!deadline) {
    return '';
  }

  const deadlineTime = Date.parse(deadline);

  if (Number.isNaN(deadlineTime)) {
    return '';
  }

  if (deadlineTime <= now.getTime()) {
    return '（已过期）';
  }

  const days = Math.ceil((deadlineTime - now.getTime()) / DAY_MS);

  return `（剩余 ${days} 天）`;
}
