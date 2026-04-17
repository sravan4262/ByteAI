import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5239'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}/?error=missing_code`)
  }

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.session) {
    return NextResponse.redirect(`${origin}/?error=auth_failed`)
  }

  const { session, user } = data

  // Provision the user profile in the app DB on first sign-in.
  // Idempotent — safe to call on every OAuth login.
  const meta = user.user_metadata ?? {}
  await fetch(`${API_URL}/api/auth/provision`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      displayName: meta.full_name ?? meta.name ?? user.email?.split('@')[0] ?? 'User',
      avatarUrl: meta.avatar_url ?? meta.picture ?? null,
      email: user.email ?? null,
    }),
  }).catch(() => {
    // Non-fatal — user can retry; existing users will be found on next provision call
  })

  return NextResponse.redirect(`${origin}/onboarding-check`)
}
