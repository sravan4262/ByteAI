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

function isProtected(pathname: string) {
  return PROTECTED_PATHS.some(p => pathname.startsWith(p))
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request })

  // Refreshes session cookies on every request — required by @supabase/ssr
  const supabase = createSupabaseMiddlewareClient(request, response)
  const { data: { session } } = await supabase.auth.getSession()

  const { pathname } = request.nextUrl

  // Signed-in user hitting the root → send to feed (or onboarding if not done)
  if (pathname === '/' && session) {
    const isOnboarded = request.cookies.get('byteai_onboarded')?.value === 'true'
    return NextResponse.redirect(
      new URL(isOnboarded ? '/feed' : '/onboarding-check', request.url)
    )
  }

  // Unauthenticated request to protected route → back to sign-in
  if (!session && isProtected(pathname)) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
