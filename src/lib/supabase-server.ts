import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

/** Service Role 客戶端：繞過 RLS，僅用於伺服器端受信任操作 */
export function createServiceClient() {
  const url = import.meta.env.PUBLIC_SUPABASE_URL
  const key = import.meta.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!url || !key) {
    throw new Error('Supabase service role credentials not configured (PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)')
  }

  return createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/** Anon 客戶端：遵守 RLS，用於 SSR 頁面查詢公開資料 */
export function createAnonClient() {
  const url = import.meta.env.PUBLIC_SUPABASE_URL
  const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error('Supabase credentials not configured (PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_ANON_KEY)')
  }

  return createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/**
 * 驗證 Bearer token 並回傳使用者 ID
 * @throws Error('Unauthorized') when token is invalid
 */
export async function verifyToken(token: string): Promise<string> {
  const url = import.meta.env.PUBLIC_SUPABASE_URL
  const anon = import.meta.env.PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anon) throw new Error('Supabase not configured')

  const client = createClient<Database>(url, anon)
  const { data, error } = await client.auth.getUser(token)

  if (error || !data.user) throw new Error('Unauthorized')
  return data.user.id
}
