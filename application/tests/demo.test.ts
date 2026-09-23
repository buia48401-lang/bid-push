import { describe, expect, it } from 'vitest';

import { mapDemoItem } from '@/lib/data/demo';
import { DemoQuerySchema } from '@/lib/validation/demo';

describe('mapDemoItem（snake_case → camelCase 映射）', () => {
  it('数据库行映射为接口字段，numeric 字符串归一为 number', () => {
    const row = {
      id: 1,
      title: '示例条目',
      category: '分类A',
      amount: '1234.50',
      status: '启用',
      created_at: '2025-09-01T08:30:00.000Z',
    };

    expect(mapDemoItem(row)).toEqual({
      id: 1,
      title: '示例条目',
      category: '分类A',
      amount: 1234.5,
      status: '启用',
      createdAt: '2025-09-01T08:30:00.000Z',
    });
  });

  it('空值与脏数据降级为空串 / null，不抛错', () => {
    const row = {
      id: 2,
      title: null,
      category: null,
      amount: '',
      status: null,
      created_at: 'bad-date',
    };

    expect(mapDemoItem(row)).toEqual({
      id: 2,
      title: '',
      category: '',
      amount: null,
      status: '',
      createdAt: null,
    });
  });
});

describe('DemoQuerySchema（查询参数归一）', () => {
  it('缺省时回退默认分页', () => {
    expect(DemoQuerySchema.parse({})).toEqual({ page: 1, pageSize: 20 });
  });

  it('空串 keyword 与空串分页均按「未传」处理', () => {
    expect(DemoQuerySchema.parse({ keyword: '', page: '', pageSize: '' })).toEqual({
      page: 1,
      pageSize: 20,
    });
  });

  it('字符串数字被 coerce 为整数', () => {
    expect(DemoQuerySchema.parse({ page: '3', pageSize: '50' })).toEqual({
      page: 3,
      pageSize: 50,
    });
  });

  it('非法 page / 超上限 pageSize 触发校验失败', () => {
    expect(DemoQuerySchema.safeParse({ page: 'abc' }).success).toBe(false);
    expect(DemoQuerySchema.safeParse({ pageSize: '101' }).success).toBe(false);
  });
});
