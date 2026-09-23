import { listDemoItems } from '@/lib/data/demo';
import { withRouteHandler } from '@/lib/api/handler';
import { toQueryObject } from '@/lib/api/request';
import { DemoQuerySchema } from '@/lib/validation/demo';

/**
 * GET /api/demo —— 示例列表接口。
 *
 * 标准链路：withRouteHandler（traceId 生成 + 异常映射 + 信封包装）
 * → Zod 校验查询参数 → lib/data 查询 → Supabase。
 * 🔴 禁止在 Route Handler 里手写 NextResponse.json / try-catch / traceId。
 */
export const GET = withRouteHandler(async (request) => {
  const query = DemoQuerySchema.parse(toQueryObject(request.nextUrl.searchParams));

  return listDemoItems(query);
});
