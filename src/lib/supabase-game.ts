/**
 * Untyped Supabase clients for game tables.
 * These bypass database.types.ts because game tables are added separately
 * and types should be regenerated with `supabase gen types` after applying
 * docs/game-schema.sql.
 */
import { createBrowserClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

// Browser client (uses session cookie → auth.uid() resolves in RLS)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const gameSupabase = createBrowserClient<any>(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
)

// Service-role client (bypasses RLS, server-side only)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createGameServiceClient() {
  const url = import.meta.env.PUBLIC_SUPABASE_URL
  const key = import.meta.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase service role credentials not configured')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient<any>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
