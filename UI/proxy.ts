import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const APP_ROUTES = ['/feed', '/interviews', '/search', '/compose', '/profile', '/post']

export function proxy(request: NextRequest) {
  const isAuthenticated = request.cookies.has('byteai_auth')
  const isOnboarded = request.cookies.has('byteai_onboarded')
  const { pathname } = request.nextUrl

  const isAppRoute = APP_ROUTES.some((r) => pathname.startsWith(r))

  // Protect app routes — redirect unauthenticated users to login
  if (isAppRoute && !isAuthenticated) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Authenticated but not onboarded — redirect to onboarding
  if (isAppRoute && isAuthenticated && !isOnboarded) {
    return NextResponse.redirect(new URL('/onboarding', request.url))
  }

  // Redirect authenticated users away from the auth page
  if (pathname === '/' && isAuthenticated) {
    if (!isOnboarded) {
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }
    return NextResponse.redirect(new URL('/feed', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
