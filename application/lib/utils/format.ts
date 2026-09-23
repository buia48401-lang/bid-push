import { EMPTY_PLACEHOLDER } from '@/lib/constants/ui';

/**
 * 展示格式化纯函数（列表 / 详情页共用）。
 *
 * 时间统一按固定时区渲染：服务端时区不确定（容器常为 UTC），
 * 固定时区保证日期边界渲染稳定、可测，且避免 React hydration 前后文本不一致。
 */

/** 展示时区：按项目业务所在时区配置 */
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

/** ISO 时间 → `YYYY-MM-DD`；空值或非法值返回占位符 */
export function formatDate(value: string | null | undefined): string {
  const date = toDate(value);

  return date ? DATE_FORMATTER.format(date) : EMPTY_PLACEHOLDER;
}

/** ISO 时间 → `YYYY-MM-DD HH:mm`；空值或非法值返回占位符 */
export function formatDateTime(value: string | null | undefined): string {
  const date = toDate(value);

  return date ? DATE_TIME_FORMATTER.format(date) : EMPTY_PLACEHOLDER;
}

/** 纯数字千分位；用于统计卡 / 表格计数列 */
export function formatCount(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return EMPTY_PLACEHOLDER;
  }

  return value.toLocaleString('en-US');
}

/**
 * Webhook / 回调地址脱敏：`https://example.com/hook/881ed***`
 * 展示层禁止暴露完整地址，防止凭据泄露。
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
