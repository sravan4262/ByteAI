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

function isOnboardingPath(pathname: string) {
  return pathname === '/onboarding' || pathname.startsWith('/onboarding/')
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
  const isOnboarded = request.cookies.get('byteai_onboarded')?.value === '1'

  // Signed-in user hitting the root → send to feed (or onboarding if not done)
  if (pathname === '/' && user) {
    return NextResponse.redirect(
      new URL(isOnboarded ? '/feed' : '/onboarding-check', request.url)
    )
  }

  // Unauthenticated request to protected route → back to sign-in
  if (!user && isProtected(pathname)) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Signed-in but not onboarded → keep them in the onboarding flow regardless of
  // how they arrived (tab restore, bookmark, direct nav). Route via /onboarding-check
  // so a wrongly-absent cookie (expired/cleared) self-heals via the API check.
  if (user && !isOnboarded && isProtected(pathname) && !isOnboardingPath(pathname)) {
    return NextResponse.redirect(new URL('/onboarding-check', request.url))
  }

  // Already onboarded → don't let them re-enter the onboarding flow
  if (user && isOnboarded && isOnboardingPath(pathname)) {
    return NextResponse.redirect(new URL('/feed', request.url))
  }

  return response
}

