import { unimplemented } from '@/lib/api/errors';
import type { AnnounceListQuery } from '@/lib/validation/announce';
import type { PageResult } from '@/types/api';
import type { AnnounceDetail, AnnounceListItem } from '@/types/announce';

/**
 * 数据层：公告（bid_announce + bid_detail）
 *
 * 本期只固定签名与返回结构，查询体留待业务模块实现。
 * 🔴 实现时必须满足 docs/requirements.md §6「禁止拉全表到应用层」：
 *    分页、过滤、排序全部下推数据库，并用 count: 'exact' 取总数。
 */

/**
 * 公告列表 —— 契约 §3.1。
 *
 * 落地要点（实现时逐条核对）：
 * 1. 客户端：getServerClient()（anon，受 RLS 只读约束）；
 * 2. 分页：`.range(offset, offset + pageSize - 1)` + `{ count: 'exact' }`，
 *    offset = (page - 1) * pageSize，禁止先取全表再切片；
 * 3. 过滤：keyword → `title.ilike.%kw%`；region → `region.ilike.%r%`；
 *    announceType / sourceSite → `.eq()`；startDate → `gte`；
 *    endDate → `lt` 次日 0 点（含当日，避免日期边界丢数据）；
 * 4. 排序：`publish_date DESC NULLS LAST`，同值回退 `created_at DESC`，保证分页稳定；
 * 5. 映射：rows.map(mapAnnounceListItem)，total 取自 count（count 为 null 时回退 0）。
 */
export async function listAnnounces(
  query: AnnounceListQuery,
): Promise<PageResult<AnnounceListItem>> {
  unimplemented('api-contract.md §3.1 GET /api/announces', query);
}

/**
 * 公告详情 —— 契约 §3.2。
 *
 * 落地要点：
 * 1. 一次请求取回 bid_announce；bid_detail 用嵌套 select 或第二次单行查询，
 *    禁止先查完整表再在应用层 find；
 * 2. 无 bid_detail 记录不是错误：detail 传 null 给 mapAnnounceDetail，
 *    structured / contentText 自然降级为 null；
 * 3. 查不到 bid_announce 时抛 ApiError(NOT_FOUND)，由 withRouteHandler 映射为 404；
 * 4. contentText 由映射层截断至 2000 字，避免大字段全量传输。
 */
export async function getAnnounceById(id: number): Promise<AnnounceDetail> {
  unimplemented('api-contract.md §3.2 GET /api/announces/{id}', { id });
}
