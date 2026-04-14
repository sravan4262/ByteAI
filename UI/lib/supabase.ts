import { createClient } from '@supabase/supabase-js'

// Supabase client — used for realtime/other features. Avatar uploads go through the .NET backend.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)
