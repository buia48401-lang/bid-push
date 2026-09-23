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
 * 3. 仅服务端可调用 —— 用于不受 RLS 约束的读写（如管理侧配置表），
 *   anon 只读客户端查不到的表（无 RLS 策略）必须走本客户端。
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
