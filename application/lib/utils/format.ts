import { EMPTY_PLACEHOLDER } from '@/lib/constants/domain';

/**
 * 业务时区：服务端与浏览器按同一时区格式化，
 * 既符合业务口径，也避免 React hydration 前后文本不一致。
 */
export const APP_TIME_ZONE = 'Asia/Shanghai';

const DATE_FORMATTER = new Intl.DateTimeFormat('sv-SE', {
  timeZone: APP_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('sv-SE', {
  timeZone: APP_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function toDate(value: string | null | undefined): Date | null {
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }

  const timestamp = Date.parse(value);

  return Number.isNaN(timestamp) ? null : new Date(timestamp);
}

/** `YYYY-MM-DD`；空值或非法值返回「—」 */
export function formatDate(value: string | null | undefined): string {
  const date = toDate(value);

  return date ? DATE_FORMATTER.format(date) : EMPTY_PLACEHOLDER;
}

/** `YYYY-MM-DD HH:mm`；空值或非法值返回「—」 */
export function formatDateTime(value: string | null | undefined): string {
  const date = toDate(value);

  return date ? DATE_TIME_FORMATTER.format(date) : EMPTY_PLACEHOLDER;
}

/** 元 → 万元，千分位 + 2 位小数（product-design.md §4.2） */
export function formatBudgetWan(budget: number | null | undefined): string {
  if (budget === null || budget === undefined || !Number.isFinite(budget)) {
    return EMPTY_PLACEHOLDER;
  }

  return (budget / 10000).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** 纯数字千分位；用于统计卡 */
export function formatCount(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return EMPTY_PLACEHOLDER;
  }

  return value.toLocaleString('en-US');
}

/**
 * Webhook 脱敏：`https://open.feishu.cn/.../881ed***`
 * 依据 api-contract.md §3.3 —— 列表展示不得暴露完整地址。
 */
export function maskWebhookUrl(url: string | null | undefined): string {
  if (typeof url !== 'string' || url.trim() === '') {
    return EMPTY_PLACEHOLDER;
  }

  const lastSlash = url.lastIndexOf('/');

  if (lastSlash <= 0 || lastSlash === url.length - 1) {
    return `${url}***`;
  }

  return `${url.slice(0, lastSlash + 1)}${url.slice(lastSlash + 1, lastSlash + 6)}***`;
}

/** 距投标截止时间的剩余天数；已过期为负，非法或空值为 null */
export function daysUntil(
  deadline: string | null | undefined,
  now: Date = new Date(),
): number | null {
  const date = toDate(deadline);

  return date ? Math.ceil((date.getTime() - now.getTime()) / 86_400_000) : null;
}

/** 成功率：0~100，保留 1 位小数；无数据为 0（api-contract.md §3.6） */
export function successRate(success: number, total: number): number {
  if (total <= 0) {
    return 0;
  }

  return Math.round((success / total) * 1000) / 10;
}
