import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { requiredEnv } from '@/lib/supabase/env';

let cachedClient: SupabaseClient | null = null;

/**
 * 服务端只读客户端（anon key，受 RLS 约束）。
 *
 * 惰性初始化：不在模块顶层读取 env，否则无凭据时 `npm run build` 会在构建期直接抛错。
 * 依据 docs/api-contract.md §4：GET /api/announces、/api/announces/{id}、
 * /api/push-logs、/api/crawl-logs 走本客户端。
 */
export function getServerClient(): SupabaseClient {
  if (cachedClient) {
    return cachedClient;
  }

  cachedClient = createClient(
    requiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );

  return cachedClient;
}
