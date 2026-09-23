import { describe, expect, it } from 'vitest';

import { formatCount, formatDate, formatDateTime, maskWebhookUrl } from '@/lib/utils/format';

describe('formatDate / formatDateTime', () => {
  it('按 Asia/Shanghai 渲染日期，跨时区边界不偏移', () => {
    // UTC 2025-08-31T17:30Z = 北京时间 2025-09-01 01:30，展示日期应为 09-01
    expect(formatDate('2025-08-31T17:30:00.000Z')).toBe('2025-09-01');
    expect(formatDate('2025-09-01T08:30:00.000Z')).toBe('2025-09-01');
  });

  it('格式化为 YYYY-MM-DD HH:mm', () => {
    expect(formatDateTime('2025-09-01T08:30:00.000Z')).toBe('2025-09-01 16:30');
  });

  it('空值与非法值显示占位符', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate('not-a-date')).toBe('—');
    expect(formatDateTime(undefined)).toBe('—');
    expect(formatDateTime('')).toBe('—');
  });
});

describe('formatCount', () => {
  it('千分位渲染', () => {
    expect(formatCount(1234567)).toBe('1,234,567');
    expect(formatCount(0)).toBe('0');
  });

  it('空值与非有限数显示占位符', () => {
    expect(formatCount(null)).toBe('—');
    expect(formatCount(undefined)).toBe('—');
    expect(formatCount(Number.NaN)).toBe('—');
  });
});

describe('maskWebhookUrl', () => {
  it('保留末段前 5 字符并打码', () => {
    expect(maskWebhookUrl('https://open.feishu.cn/hook/881edabc-1234')).toBe(
      'https://open.feishu.cn/hook/881ed***',
    );
  });

  it('空值显示占位符', () => {
    expect(maskWebhookUrl(null)).toBe('—');
    expect(maskWebhookUrl('')).toBe('—');
  });
});
