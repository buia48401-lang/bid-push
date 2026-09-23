import { ErrorCode } from '@/lib/api/error-codes';
import { ApiError } from '@/lib/api/errors';
import { mapAnnounceDetail, mapAnnounceListItem } from '@/lib/data/mappers';
import { getServerClient } from '@/lib/supabase/server';
import type { AnnounceListQuery } from '@/lib/validation/announce';
import type { PageResult } from '@/types/api';
import type { AnnounceDetail, AnnounceListItem } from '@/types/announce';
import type { BidAnnounceRow, BidDetailRow } from '@/types/database';

/**
 * 数据层：公告（bid_announce + bid_detail）。
 *
 * 🔴 约束（docs/requirements.md §6 / proj-layer-boundary）：
 * - 只读：走 getServerClient()（anon，受 RLS 约束），不写任何表；
 * - 查询下推：分页 / 过滤 / 排序全部在数据库层完成，禁止拉全表到应用层；
 * - 显式列名：禁止 select('*')，只取契约需要的列。
 */

/** 列表列（api-contract.md §3.1 的 9 个字段，不含正文大字段） */
const ANNOUNCE_LIST_COLUMNS =
  'id,title,announce_type,purchaser,region,budget,publish_date,source_site,crawl_status';

/** 详情主表列（api-contract.md §3.2 的 AnnounceDetail 主体） */
const ANNOUNCE_DETAIL_COLUMNS =
  'id,title,announce_type,announce_no,detail_url,publish_date,purchaser,region,source_site,budget,crawl_status,remark';

/** 详情子表列：仅映射层（mapAnnounceDetail）需要的字段 */
const DETAIL_COLUMNS = 'content_text,structured,crawled_at';

/** 业务日期按中国时区解释：与发布数据的本地语义一致 */
const BUSINESS_TZ_OFFSET = '+08:00';

/** `YYYY-MM-DD` 的次日日期串（endDate 过滤含当日的实现基础） */
function nextDay(dateOnly: string): string {
  const [year, month, day] = dateOnly.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  const monthText = String(next.getUTCMonth() + 1).padStart(2, '0');
  const dayText = String(next.getUTCDate()).padStart(2, '0');

  return `${next.getUTCFullYear()}-${monthText}-${dayText}`;
}

function throwIfDbError(error: { message: string } | null): void {
  if (error) {
    // 内部细节（SQL / 连接串）只进服务端日志，响应体统一为 503 提示
    console.error('[data] 公告查询失败：', error.message);
    throw new ApiError(ErrorCode.DB_UNAVAILABLE);
  }
}

/**
 * 公告列表 —— 契约 §3.1。
 *
 * - 分页：`.range()` + `{ count: 'exact' }`，offset = (page - 1) * pageSize；
 * - 过滤：keyword → title ilike；region → region ilike（包含匹配）；
 *   announceType / sourceSite → eq（精确）；startDate / endDate → 发布日期闭区间（endDate 含当日）；
 * - 排序：publish_date DESC（空值排最后）+ id DESC 次级键，保证翻页不重不漏。
 */
export async function listAnnounces(
  query: AnnounceListQuery,
): Promise<PageResult<AnnounceListItem>> {
  const supabase = getServerClient();
  const offset = (query.page - 1) * query.pageSize;

  let builder = supabase.from('bid_announce').select(ANNOUNCE_LIST_COLUMNS, { count: 'exact' });

  if (query.keyword) {
    builder = builder.ilike('title', `%${query.keyword}%`);
  }

  if (query.region) {
    builder = builder.ilike('region', `%${query.region}%`);
  }

  if (query.announceType) {
    builder = builder.eq('announce_type', query.announceType);
  }

  if (query.sourceSite) {
    builder = builder.eq('source_site', query.sourceSite);
  }

  if (query.startDate) {
    builder = builder.gte('publish_date', `${query.startDate}T00:00:00${BUSINESS_TZ_OFFSET}`);
  }

  if (query.endDate) {
    builder = builder.lt('publish_date', `${nextDay(query.endDate)}T00:00:00${BUSINESS_TZ_OFFSET}`);
  }

  const { data, error, count } = await builder
    .order('publish_date', { ascending: false, nullsFirst: false })
    .order('id', { ascending: false })
    .range(offset, offset + query.pageSize - 1);

  throwIfDbError(error);

  // select 列为 mapper 所需字段的子集（运行时只访问所选列），边界处显式断言为行类型
  return {
    list: (data ?? []).map((row) => mapAnnounceListItem(row as BidAnnounceRow)),
    total: count ?? 0,
    page: query.page,
    pageSize: query.pageSize,
  };
}

/**
 * 公告详情 —— 契约 §3.2。
 *
 * - 两次单行查询（单行场景比嵌套 select 更直观）：先 bid_announce，再按 announce_id 取 bid_detail；
 * - 公告不存在 → ApiError(NOT_FOUND)，由调用方（Route Handler → 404 / 页面 → notFound()）处理；
 * - 无 bid_detail 记录不是错误：detail 传 null，structured / contentText 自然降级为 null；
 * - structured 的 safeParse 降级与 contentText 截断均由映射层（mappers.ts）承担。
 */
export async function getAnnounceById(id: number): Promise<AnnounceDetail> {
  const supabase = getServerClient();

  const { data: announce, error: announceError } = await supabase
    .from('bid_announce')
    .select(ANNOUNCE_DETAIL_COLUMNS)
    .eq('id', id)
    .maybeSingle();

  throwIfDbError(announceError);

  if (!announce) {
    throw new ApiError(ErrorCode.NOT_FOUND);
  }

  const { data: detail, error: detailError } = await supabase
    .from('bid_detail')
    .select(DETAIL_COLUMNS)
    .eq('announce_id', id)
    .maybeSingle();

  throwIfDbError(detailError);

  // 同上：所选列覆盖 mapAnnounceDetail 的全部访问路径，无 bid_detail 记录时传 null
  return mapAnnounceDetail(announce as BidAnnounceRow, (detail ?? null) as BidDetailRow | null);
}
