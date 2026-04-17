import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseMiddlewareClient } from '@/lib/supabase-server'

const PROTECTED_PATHS = [
  '/feed',
  '/interviews',
  '/search',
  '/compose',
  '/profile',
  '/post',
  '/onboarding',
  '/admin',
]

// These are part of the auth flow and must never be blocked
const AUTH_FLOW_PATHS = ['/onboarding-check', '/auth/callback']

function isProtected(pathname: string) {
  if (AUTH_FLOW_PATHS.some(p => pathname.startsWith(p))) return false
  return PROTECTED_PATHS.some(p => pathname.startsWith(p))
}

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request })

  // Refreshes session cookies on every request — required by @supabase/ssr.
  // getUser() hits the Supabase API to verify the token, which also triggers
  // cookie refresh. More reliable than getSession() after an OAuth redirect
  // where the access token may be freshly minted and not yet in memory.
  const supabase = createSupabaseMiddlewareClient(request, response)
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Signed-in user hitting the root → send to feed (or onboarding if not done)
  if (pathname === '/' && user) {
    const isOnboarded = request.cookies.get('byteai_onboarded')?.value === 'true'
    return NextResponse.redirect(
      new URL(isOnboarded ? '/feed' : '/onboarding-check', request.url)
    )
  }

  // Unauthenticated request to protected route → back to sign-in
  if (!user && isProtected(pathname)) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

