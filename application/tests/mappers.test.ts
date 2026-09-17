import { describe, expect, it } from 'vitest';

import { CONTENT_TEXT_MAX_LENGTH } from '@/lib/constants/domain';
import {
  camelToSnake,
  mapAnnounceDetail,
  mapAnnounceListItem,
  mapCrawlLogItem,
  mapStructured,
  mapSubscriptionItem,
  snakeToCamel,
  toNumber,
  truncateContentText,
} from '@/lib/data/mappers';
import type { BidAnnounceRow, BidCrawlLogRow, BidSubscriptionRow } from '@/types/database';

const ANNOUNCE_ROW: BidAnnounceRow = {
  id: 101,
  title: '某某市人民医院医疗设备采购项目招标公告',
  detail_url: 'https://www.ggzy.gov.cn/information/html/a/410000/0101/20250901/abc.html',
  announce_type: '招标公告',
  announce_no: 'XYZB-2025-0912',
  publish_date: '2025-09-01T16:30:00+08:00',
  purchaser: '某某市人民医院',
  region: '河南省郑州市',
  source_site: '全国公共资源交易平台',
  budget: '12800000.00',
  crawl_status: '已入库',
  remark: '',
  created_at: '2025-09-02T01:00:00+08:00',
  updated_at: '2025-09-02T01:00:00+08:00',
};

const SUBSCRIPTION_ROW: BidSubscriptionRow = {
  id: 7,
  name: '河南医疗设备订阅',
  keyword: '医疗设备/彩超',
  region: '河南',
  announce_type: '招标公告',
  channel: 'feishu_webhook',
  webhook_url: 'https://open.feishu.cn/open-apis/bot/v2/hook/881ed0f3-1234',
  enabled: true,
  created_at: '2025-08-01T10:00:00+08:00',
  updated_at: '2025-08-20T10:00:00+08:00',
};

const CRAWL_LOG_ROW: BidCrawlLogRow = {
  id: 3,
  run_at: '2025-09-02T02:00:00+08:00',
  source_site: '全国公共资源交易平台',
  site_level: '',
  total: 120,
  success: 118,
  failed: 1,
  manual: 1,
  note: '1 条正文解析失败已转待人工',
};

describe('通用键名映射', () => {
  it('snake_case → camelCase', () => {
    expect(snakeToCamel('announce_type')).toBe('announceType');
    expect(snakeToCamel('detail_url')).toBe('detailUrl');
    expect(snakeToCamel('title')).toBe('title');
  });

  it('camelCase → snake_case', () => {
    expect(camelToSnake('announceType')).toBe('announce_type');
    expect(camelToSnake('detailUrl')).toBe('detail_url');
    expect(camelToSnake('title')).toBe('title');
  });
});

describe('空值与类型归一', () => {
  it('numeric 列可能以字符串返回，统一归一为 number', () => {
    expect(toNumber('12800000.00')).toBe(12800000);
    expect(toNumber(128)).toBe(128);
  });

  it('空值 / 非法值归一为 null，避免 NaN 流入 UI', () => {
    expect(toNumber(null)).toBeNull();
    expect(toNumber('')).toBeNull();
    expect(toNumber('未公开')).toBeNull();
  });
});

describe('structured（JSONB）映射', () => {
  it('snake_case 键映射为 camelCase，budget 归一为 number', () => {
    const structured = mapStructured({
      contact_person: '张工',
      contact_phone: '0371-88888888',
      budget: '5600000',
      // 显式带时区偏移，避免断言结果随运行机器的本地时区漂移
      deadline: '2025-09-20T17:00:00+08:00',
    });

    expect(structured).toEqual({
      contactPerson: '张工',
      contactPhone: '0371-88888888',
      budget: 5600000,
      deadline: '2025-09-20T09:00:00.000Z',
    });
  });

  it('解析失败降级为 null 而不是抛错', () => {
    expect(mapStructured({ contact_person: { nested: 'object' } })).toBeNull();
    expect(mapStructured('not-an-object')).toBeNull();
  });

  it('空对象与全空字段降级为 null', () => {
    expect(mapStructured({})).toBeNull();
    expect(mapStructured({ title: '', purchaser: '   ' })).toBeNull();
    expect(mapStructured(null)).toBeNull();
    expect(mapStructured(undefined)).toBeNull();
  });
});

describe('实体映射', () => {
  it('bid_announce → 公告列表项', () => {
    expect(mapAnnounceListItem(ANNOUNCE_ROW)).toEqual({
      id: 101,
      title: '某某市人民医院医疗设备采购项目招标公告',
      announceType: '招标公告',
      purchaser: '某某市人民医院',
      region: '河南省郑州市',
      budget: 12800000,
      publishDate: '2025-09-01T08:30:00.000Z',
      sourceSite: '全国公共资源交易平台',
      crawlStatus: '已入库',
    });
  });

  it('公告详情：无 bid_detail 记录时 structured / contentText 为 null', () => {
    const detail = mapAnnounceDetail(ANNOUNCE_ROW, null);

    expect(detail.detailUrl).toBe(ANNOUNCE_ROW.detail_url);
    expect(detail.announceNo).toBe('XYZB-2025-0912');
    expect(detail.structured).toBeNull();
    expect(detail.contentText).toBeNull();
    expect(detail.crawledAt).toBeNull();
  });

  it('公告详情：正文截断至 2000 字', () => {
    const longText = '标'.repeat(CONTENT_TEXT_MAX_LENGTH + 500);
    const detail = mapAnnounceDetail(ANNOUNCE_ROW, {
      id: 1,
      announce_id: 101,
      content_html: '<p>...</p>',
      content_text: longText,
      structured: { contact_person: '张工' },
      crawled_at: '2025-09-02T01:00:00+08:00',
    });

    expect(detail.contentText).toHaveLength(CONTENT_TEXT_MAX_LENGTH);
    expect(detail.structured).toEqual({ contactPerson: '张工' });
  });

  it('truncateContentText 对空白正文返回 null', () => {
    expect(truncateContentText('   ')).toBeNull();
    expect(truncateContentText(null)).toBeNull();
  });

  it('bid_subscription → 订阅列表项（webhookUrl 原样返回，脱敏由展示层负责）', () => {
    expect(mapSubscriptionItem(SUBSCRIPTION_ROW)).toEqual({
      id: 7,
      name: '河南医疗设备订阅',
      keyword: '医疗设备/彩超',
      region: '河南',
      announceType: '招标公告',
      channel: 'feishu_webhook',
      webhookUrl: SUBSCRIPTION_ROW.webhook_url,
      enabled: true,
      createdAt: '2025-08-01T02:00:00.000Z',
      updatedAt: '2025-08-20T02:00:00.000Z',
    });
  });

  it('bid_crawl_log → 抓取日志（site_level 空串保持空串，前端显示「—」）', () => {
    expect(mapCrawlLogItem(CRAWL_LOG_ROW)).toEqual({
      id: 3,
      runAt: '2025-09-01T18:00:00.000Z',
      sourceSite: '全国公共资源交易平台',
      siteLevel: '',
      total: 120,
      success: 118,
      failed: 1,
      manual: 1,
      note: '1 条正文解析失败已转待人工',
    });
  });
});
