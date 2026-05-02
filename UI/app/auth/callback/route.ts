import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { isSafeRelativePath } from '@/lib/utils/safe-redirect'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5239'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const { searchParams } = url
  const proto = request.headers.get('x-forwarded-proto') ?? url.protocol.replace(':', '')
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? url.host
  const origin = `${proto}://${host}`
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
        setAll: (toSet) => { pendingCookies.push(...toSet) },
      },
    }
  )

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.session) {
    // Banned users hit `user_banned` (or message contains "banned") at exchange
    // time — Supabase Auth refuses to issue a session while banned_until > now().
    // Surface a dedicated query param so the home page can show the suspended
    // message instead of a generic "sign-in failed" toast.
    const code = (error as { code?: string } | null)?.code
    const msg  = error?.message?.toLowerCase() ?? ''
    if (code === 'user_banned' || msg.includes('banned')) {
      return NextResponse.redirect(`${origin}/?error=account_suspended`)
    }
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

  // Honor a safe relative `next` query param so deep-links (e.g. /post/{id})
  // resume after sign-in. We only allow paths that start with a single `/` and
  // contain no scheme — see isSafeRelativePath for the full rules.
  const rawNext = searchParams.get('next')
  const safeNext = isSafeRelativePath(rawNext) ? rawNext : null

  let destination = `${origin}/onboarding`
  let isOnboarded = false
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
      if (data?.isOnboarded) {
        isOnboarded = true
        // Only honor `next` for already-onboarded users. Un-onboarded users
        // must complete onboarding first; we drop the deep-link in that case.
        destination = safeNext ? `${origin}${safeNext}` : `${origin}/feed`
      }
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

  // Sync the onboarded cookie with DB truth on every sign-in. Important for the
  // "switch accounts" flow where a stale `byteai_onboarded=1` from a prior
  // session would otherwise mislead the proxy into bouncing a new (un-onboarded)
  // user straight to /feed.
  if (isOnboarded) {
    response.cookies.set('byteai_onboarded', '1', {
      path: '/',
      maxAge: 2592000,
      sameSite: 'lax',
    })
  } else {
    response.cookies.set('byteai_onboarded', '', {
      path: '/',
      maxAge: 0,
      sameSite: 'lax',
    })
  }

  return response
}
