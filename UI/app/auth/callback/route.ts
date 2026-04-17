import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5239'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) return NextResponse.redirect(`${origin}/`)

  // Accumulate cookies from exchangeCodeForSession so we can apply them
  // to the final redirect response regardless of destination.
  const pendingCookies: Array<{ name: string; value: string; options: Record<string, unknown> }> = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => pendingCookies.push(...toSet),
      },
    }
  )

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.session) {
    return NextResponse.redirect(`${origin}/`)
  }

  const { session } = data
  const token = session.access_token
  const user = session.user

  // Provision user (idempotent — safe to call on every sign-in).
  // Response already contains isOnboarded — no second /api/users/me call needed.
  const displayName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split('@')[0] ||
    'User'

  let destination = `${origin}/onboarding`
  try {
    const provisionResp = await fetch(`${API_URL}/api/auth/provision`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        displayName,
        avatarUrl: user.user_metadata?.avatar_url ?? null,
        email: user.email ?? null,
      }),
    })
    if (provisionResp.ok) {
      const { data } = await provisionResp.json()
      if (data?.isOnboarded) destination = `${origin}/feed`
    }
  } catch {
    // Fall through to /onboarding as a safe default
  }

  const response = NextResponse.redirect(destination)

  // Apply session cookies to the final response
  pendingCookies.forEach(({ name, value, options }) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    response.cookies.set(name, value, options as any)
  )

  if (destination.endsWith('/feed')) {
    response.cookies.set('byteai_onboarded', '1', {
      path: '/',
      maxAge: 2592000,
      sameSite: 'lax',
    })
  }

  return response
}
