import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { requiredEnv } from '@/lib/supabase/env';

let cachedClient: SupabaseClient | null = null;

/**
 * 高权限客户端（service_role，绕过 RLS）。
 *
 * 🔴 三条硬约束：
 * 1. `import 'server-only'` 会在编译期阻断本模块被打进浏览器 bundle；
 * 2. 凭据只允许来自 SUPABASE_SERVICE_ROLE_KEY，禁止加 NEXT_PUBLIC_ 前缀；
 * 3. 仅服务端可调用 —— 依据 docs/api-contract.md §4，
 *    GET/POST /api/subscriptions 与 PUT /api/subscriptions/{id} 走本客户端
 *    （bid_subscription 不对 anon 开放任何策略）。
 */
export function getAdminClient(): SupabaseClient {
  if (cachedClient) {
    return cachedClient;
  }

  cachedClient = createClient(
    requiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );

  return cachedClient;
}
