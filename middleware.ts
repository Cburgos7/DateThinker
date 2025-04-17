import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Create a response object to modify
  const res = NextResponse.next()
  
  try {
    // Initialize Supabase client in middleware
    const supabase = createMiddlewareClient({ req: request, res })
    
    // Refresh auth session if expired
    await supabase.auth.getSession()
    
    // Extract auth tokens from cookies directly to check auth status
    // This bypasses the problematic JSON parsing
    const hasSessionCookie = request.cookies.has('sb-access-token') || 
                            request.cookies.has('sb-refresh-token') ||
                            request.cookies.has('supabase-auth-token') ||
                            // Also check our custom sync cookie
                            request.cookies.has('sb-auth-sync');
                            
    // Check for token in authorization header as fallback
    const authHeader = request.headers.get('authorization');
    const hasAuthHeader = authHeader && authHeader.startsWith('Bearer ');
    
    // Consider the user authenticated if any auth indicators are present
    const isAuthenticated = hasSessionCookie || hasAuthHeader;
    
    // Debug information for API routes
    const isApiRoute = request.nextUrl.pathname.startsWith('/api/');
    if (isApiRoute) {
      console.log('Middleware API route:', { 
        path: request.nextUrl.pathname, 
        isAuthenticated,
        cookies: Array.from(request.cookies.getAll()).map(c => c.name),
        hasAuthHeader
      });
      
      // For API routes, don't redirect but ensure cookies are properly set
      return res;
    }
    
    // Log authentication state in middleware for debugging
    console.log('Middleware auth check:', { 
      path: request.nextUrl.pathname, 
      isAuthenticated 
    });
    
    // Get the pathname of the request
    const path = request.nextUrl.pathname
    
    // Redirect any /auth/* routes to /login/*
    if (path.startsWith('/auth')) {
      // Special case for /auth/callback and other API routes - we keep those
      if (path.startsWith('/auth/callback') || 
          path.startsWith('/auth/confirm') || 
          path.startsWith('/auth/logout')) {
        return res; // Let auth API routes pass through
      }
      
      // For all other /auth/* paths, redirect to equivalent /login/* path
      const loginPath = path.replace('/auth', '/login');
      const redirectUrl = new URL(loginPath, request.url);
      
      // Copy all search parameters
      request.nextUrl.searchParams.forEach((value, key) => {
        redirectUrl.searchParams.set(key, value);
      });
      
      console.log(`Middleware: Redirecting from ${path} to ${redirectUrl.pathname}`);
      return NextResponse.redirect(redirectUrl);
    }
    
    // Check for auth tokens in URL (for callbacks)
    const hasAuthTokenInUrl = request.nextUrl.hash && 
                              (request.nextUrl.hash.includes('access_token') || 
                               request.nextUrl.hash.includes('refresh_token'))

    // If there are auth tokens in the URL, don't redirect
    if (hasAuthTokenInUrl) {
      return res
    }

    // Define protected routes
    const protectedRoutes = [
      '/make-date', 
      '/my-dates', 
      '/favorites', 
      '/account', 
      '/settings', 
      '/date-plans'
    ]
    const isProtectedRoute = protectedRoutes.some(route => 
      path === route || path.startsWith(route + '/')
    )

    // Check if the current request is a button or nav action to a protected route
    const buttonAction = request.nextUrl.searchParams.get('action')
    const isButtonNavigation = buttonAction === 'get-started' || buttonAction === 'make-date'

    // If the route is protected and user is not authenticated, redirect to login
    if (isProtectedRoute && !isAuthenticated) {
      console.log('Middleware: Redirecting to login from protected route:', path);
      const redirectUrl = new URL('/login', request.url)
      redirectUrl.searchParams.set('redirectedFrom', path)
      return NextResponse.redirect(redirectUrl)
    }

    // Handle button navigation action
    if (isButtonNavigation && !isAuthenticated) {
      const targetPath = buttonAction === 'get-started' || buttonAction === 'make-date' ? '/make-date' : '/'
      const redirectUrl = new URL('/login', request.url)
      redirectUrl.searchParams.set('redirectedFrom', targetPath)
      return NextResponse.redirect(redirectUrl)
    }

    // If the user is logged in and tries to access the login page, redirect to home or previous page
    if (path === '/login' && isAuthenticated) {
      console.log('Middleware: User is authenticated, redirecting from login')
      
      // Check if there's a redirectedFrom parameter to go back to
      const redirectedFrom = request.nextUrl.searchParams.get('redirectedFrom')
      if (redirectedFrom) {
        return NextResponse.redirect(new URL(redirectedFrom, request.url))
      }
      
      // If no redirectedFrom parameter but there's a referer, try to use that
      const referer = request.headers.get('referer')
      if (referer) {
        try {
          const refererUrl = new URL(referer)
          // Only redirect to referer if it's from the same origin and not a login page
          if (refererUrl.origin === request.nextUrl.origin && 
              !refererUrl.pathname.includes('/login')) {
            return NextResponse.redirect(refererUrl)
          }
        } catch (e) {
          // Invalid referer URL, just continue to home
        }
      }
      
      return NextResponse.redirect(new URL('/', request.url))
    }

    return res
  } catch (error) {
    console.error('Middleware error:', error)
    // In case of any error, allow the request to proceed
    // This prevents users from being stuck if authentication fails
    return res
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
} 