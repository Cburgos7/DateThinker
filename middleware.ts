import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

export async function middleware(request: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req: request, res })
  
  // Check auth status
  const { data: { session } } = await supabase.auth.getSession()
  const pathname = request.nextUrl.pathname
  
  // If user is logged in and on the login page, redirect to home
  if (session && pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/', request.url))
  }
  
  // If user is not logged in but on a protected page, redirect to login
  if (!session && (pathname.startsWith('/account') || pathname.startsWith('/favorites'))) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(redirectUrl)
  }
  
  return res
}

// Specify which routes should be processed by this middleware
export const config = {
  matcher: ['/login', '/account/:path*', '/favorites/:path*']
} 