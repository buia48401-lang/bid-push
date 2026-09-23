import { describe, expect, it } from 'vitest';

import {
  formatBudgetWan,
  formatDate,
  formatDateTime,
  remainingDaysText,
} from '@/lib/format';

describe('formatBudgetWan', () => {
  it('元 → 万元，千分位 + 2 位小数', () => {
    expect(formatBudgetWan(35_000_000)).toBe('3,500.00');
    expect(formatBudgetWan(12_800_000)).toBe('1,280.00');
    expect(formatBudgetWan(0)).toBe('0.00');
  });

  it('空值显示占位符', () => {
    expect(formatBudgetWan(null)).toBe('—');
    expect(formatBudgetWan(undefined)).toBe('—');
    expect(formatBudgetWan(Number.NaN)).toBe('—');
  });
});

describe('formatDate / formatDateTime', () => {
  it('按 Asia/Shanghai 渲染日期，跨时区边界不偏移', () => {
    // UTC 2025-08-31T17:30Z = 北京时间 2025-09-01 01:30，业务日期应为 09-01
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

describe('remainingDaysText', () => {
  const now = new Date('2025-09-14T00:00:00.000Z');

  it('未来时间返回（剩余 N 天），不足一天向上取整', () => {
    expect(remainingDaysText('2025-09-17T00:00:00.000Z', now)).toBe('（剩余 3 天）');
    // 剩 12 小时也应提示 1 天
    expect(remainingDaysText('2025-09-14T12:00:00.000Z', now)).toBe('（剩余 1 天）');
  });

  it('跨月计算天数', () => {
    expect(remainingDaysText('2025-10-03T00:00:00.000Z', new Date('2025-09-30T00:00:00.000Z'))).toBe('（剩余 3 天）');
  });

  it('已过期返回（已过期）而非负数', () => {
    expect(remainingDaysText('2025-09-13T23:00:00.000Z', now)).toBe('（已过期）');
    // 恰好等于当前时刻视为已过期
    expect(remainingDaysText('2025-09-14T00:00:00.000Z', now)).toBe('（已过期）');
  });

  it('空值与非法值返回空串', () => {
    expect(remainingDaysText(null)).toBe('');
    expect(remainingDaysText('bad-date')).toBe('');
  });
});
