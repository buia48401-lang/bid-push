import { describe, expect, it } from 'vitest';

import { isDemoMockMode, mapDemoItem } from '@/lib/data/demo';
import { MOCK_DEMO_ITEMS, queryMockDemoItems } from '@/lib/data/demo.mock';
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

describe('演示模式（DEMO_USE_MOCK）', () => {
  it('isDemoMockMode 读取环境变量，缺省关闭', () => {
    const original = process.env.DEMO_USE_MOCK;

    delete process.env.DEMO_USE_MOCK;
    expect(isDemoMockMode()).toBe(false);

    process.env.DEMO_USE_MOCK = 'true';
    expect(isDemoMockMode()).toBe(true);

    process.env.DEMO_USE_MOCK = original;
  });
});

describe('queryMockDemoItems（内存模拟数据库行为）', () => {
  it('默认分页：首页 20 条、总数 25（分页组件可演示翻页）', () => {
    const result = queryMockDemoItems({ page: 1, pageSize: 20 });

    expect(result.total).toBe(25);
    expect(result.list).toHaveLength(20);
    expect(result.page).toBe(1);
  });

  it('第二页返回剩余 5 条', () => {
    const result = queryMockDemoItems({ page: 2, pageSize: 20 });

    expect(result.list).toHaveLength(5);
    expect(result.list[0].id).toBe(5);
  });

  it('id 倒序：最新（id 最大）排最前，与真实链路 order by id desc 对齐', () => {
    const result = queryMockDemoItems({ page: 1, pageSize: 20 });

    expect(result.list[0].id).toBe(MOCK_DEMO_ITEMS.length);
  });

  it('keyword 模糊过滤并精确计数', () => {
    const result = queryMockDemoItems({ page: 1, pageSize: 20, keyword: '信封' });

    expect(result.total).toBeGreaterThan(0);
    expect(result.total).toBeLessThan(25);
    result.list.forEach((item) => {
      expect(item.title).toContain('信封');
    });
  });

  it('无命中关键词返回空列表而非报错（与数据库行为一致）', () => {
    const result = queryMockDemoItems({ page: 1, pageSize: 20, keyword: '不存在的关键词' });

    expect(result.total).toBe(0);
    expect(result.list).toEqual([]);
  });
});
