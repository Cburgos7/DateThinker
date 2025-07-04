import { type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  try {
    // First, update the session using the official Supabase pattern
    const supabaseResponse = await updateSession(request)
    
    // Create a server client to check authentication
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            // We don't need to set cookies here since updateSession handles it
          },
        },
      }
    )
    
    // Get the user to check authentication status
    const { data: { user } } = await supabase.auth.getUser()
    const isAuthenticated = !!user
    
    // Debug information for API routes
    const isApiRoute = request.nextUrl.pathname.startsWith('/api/');
    if (isApiRoute) {
      console.log('Middleware API route:', { 
        path: request.nextUrl.pathname, 
        isAuthenticated,
        cookies: Array.from(request.cookies.getAll()).map(c => c.name),
        userEmail: user?.email
      });
      
      // For API routes, don't redirect but ensure cookies are properly set
      return supabaseResponse;
    }
    
    // Log authentication state in middleware for debugging
    console.log('Middleware auth check:', { 
      path: request.nextUrl.pathname, 
      isAuthenticated,
      cookies: Array.from(request.cookies.getAll()).map(c => c.name)
    });
    
    // Get the pathname of the request
    const path = request.nextUrl.pathname
    
    // Redirect any /auth/* routes to /login/*
    if (path.startsWith('/auth')) {
      // Special case for /auth/callback and other API routes - we keep those
      if (path.startsWith('/auth/callback') || 
          path.startsWith('/auth/confirm') || 
          path.startsWith('/auth/logout')) {
        return supabaseResponse; // Let auth API routes pass through
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
      return supabaseResponse
    }

    // Define protected routes
    const protectedRoutes = [
      '/make-date', 
      '/my-dates', 
      '/my-date-sets',
      '/my-favorite-dates',
      '/favorites', 
      '/account', 
      '/settings', 
      '/date-plans',
      '/pricing'
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

    // Handle button navigation action - only if user is NOT authenticated
    if (isButtonNavigation && !isAuthenticated) {
      const targetPath = buttonAction === 'get-started' || buttonAction === 'make-date' ? '/make-date' : '/'
      console.log(`Middleware: Button navigation to ${targetPath}, authenticated: ${isAuthenticated}`);
      if (!isAuthenticated) {
        const redirectUrl = new URL('/login', request.url)
        redirectUrl.searchParams.set('redirectedFrom', targetPath)
        return NextResponse.redirect(redirectUrl)
      }
    }

    // If the user is logged in and tries to access the login page, redirect to home or previous page
    if (path === '/login' && isAuthenticated) {
      console.log('Middleware: User is authenticated, redirecting from login')
      
      // Check if there's a redirectedFrom parameter to go back to
      const redirectedFrom = request.nextUrl.searchParams.get('redirectedFrom')
      if (redirectedFrom) {
        console.log(`Middleware: Redirecting to ${redirectedFrom} from login`);
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
            console.log(`Middleware: Redirecting to referer ${refererUrl.pathname}`);
            return NextResponse.redirect(refererUrl)
          }
        } catch (e) {
          // Invalid referer URL, just continue to home
          console.error('Middleware: Invalid referer URL', e);
        }
      }
      
      console.log('Middleware: No valid redirect destination, going to home');
      return NextResponse.redirect(new URL('/', request.url))
    }

    return supabaseResponse
  } catch (error) {
    console.error('Middleware error:', error)
    // In case of any error, allow the request to proceed
    // This prevents users from being stuck if authentication fails
    return NextResponse.next()
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