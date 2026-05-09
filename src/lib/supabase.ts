import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './database.types'

// createBrowserClient stores sessions in cookies (not localStorage) so the
// PKCE code_verifier is accessible server-side when exchanging the OAuth code.
export const supabase = createBrowserClient<Database>(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
)
