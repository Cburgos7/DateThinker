import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

export async function middleware(request: NextRequest) {
  try {
    // Create a response object that we can modify
    const res = NextResponse.next()
    
    // Get environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    // Check if environment variables are available
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase environment variables in middleware')
      return res
    }
    
    // Check for placeholder values
    if (supabaseUrl.includes('your-supabase-url') || supabaseKey.includes('your-supabase-anon-key')) {
      console.error('Supabase environment variables contain placeholder values in middleware')
      return res
    }
    
    // Get the pathname for route checking
    const pathname = request.nextUrl.pathname
    
    // IMPORTANT: Don't block assets and API routes
    const isAssetRoute = pathname.startsWith('/_next') || 
                        pathname.includes('/favicon.ico') ||
                        pathname.includes('.') ||
                        pathname.startsWith('/api/');
                        
    if (isAssetRoute) {
      return res;
    }
    
    // Check if this is a protected route that requires authentication
    const protectedPaths = ['/account', '/favorites', '/my-dates', '/date-plans']
    const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path))
    
    // Only do auth checks if it's worth doing
    if (isProtectedPath || pathname.startsWith('/login')) {
      try {
        // Create the middleware client
        const supabase = createMiddlewareClient(
          { req: request, res },
          {
            supabaseUrl,
            supabaseKey,
          }
        )
        
        // Get and refresh the session
        const { data } = await supabase.auth.getSession()
        let session = data.session
        
        // Debug information
        console.log(`AUTH CHECK: Path ${pathname}, Session exists: ${!!session}, User: ${session?.user?.id || 'none'}`)
        
        // Handle login redirect if user is already logged in
        if (session && pathname.startsWith('/login')) {
          console.log('Redirecting from login to home (user is logged in)')
          return NextResponse.redirect(new URL('/', request.url))
        }
        
        // Handle protected routes when user is not logged in
        if (!session && isProtectedPath) {
          console.log(`Redirecting to login from protected path: ${pathname}`)
          const redirectUrl = new URL('/login', request.url)
          redirectUrl.searchParams.set('redirect', pathname)
          return NextResponse.redirect(redirectUrl)
        }
      } catch (authError) {
        console.error('Auth error in middleware:', authError)
        // Continue on auth error - don't block the request
      }
    }
    
    // Continue with the request for non-protected routes
    return res
  } catch (error) {
    console.error('Middleware error:', error)
    // Return a new response even if there's an error to prevent the app from crashing
    return NextResponse.next()
  }
}

// Specify which routes should be processed by this middleware
// Include server action routes to ensure auth is properly handled
export const config = {
  matcher: [
    '/login', 
    '/account/:path*',
    '/favorites/:path*',
    // Remove date-plans from middleware protection for now until we fix the auth
    // '/date-plans/:path*',
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico|api|my-dates|date-plans).*)',
  ]
} 