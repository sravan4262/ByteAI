import { createBrowserClient } from '@supabase/ssr'

// Browser client — uses cookie-based sessions managed by @supabase/ssr
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)
