import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isProtectedRoute = createRouteMatcher([
  '/feed(.*)',
  '/interviews(.*)',
  '/search(.*)',
  '/compose(.*)',
  '/profile(.*)',
  '/post(.*)',
  '/onboarding(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth()
  const { pathname } = req.nextUrl

  // Signed-in users hitting the auth page → redirect to feed
  if (pathname === '/' && userId) {
    const isOnboarded = req.cookies.has('byteai_onboarded')
    return NextResponse.redirect(
      new URL(isOnboarded ? '/feed' : '/onboarding', req.url)
    )
  }

  // Protected routes require a Clerk session
  if (isProtectedRoute(req) && !userId) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // Signed-in but not onboarded → redirect to onboarding
  // Exclude /onboarding itself and /onboarding-check (which sets the cookie after backend validation)
  if (isProtectedRoute(req) && userId && pathname !== '/onboarding' && pathname !== '/onboarding-check') {
    const isOnboarded = req.cookies.has('byteai_onboarded')
    if (!isOnboarded) {
      return NextResponse.redirect(new URL('/onboarding', req.url))
    }
  }
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|sso-callback|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
