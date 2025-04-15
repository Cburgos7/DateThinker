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
    
    // IMPORTANT: Don't block assets and API routes that don't need auth
    const isAssetRoute = pathname.startsWith('/_next') || 
                        pathname.includes('/favicon.ico') ||
                        pathname.startsWith('/api/auth') ||
                        pathname.includes('.') ||
                        (pathname.startsWith('/api/') && 
                          !pathname.startsWith('/api/search') && 
                          !pathname.startsWith('/api/refresh'));
                        
    if (isAssetRoute) {
      return res;
    }
    
    // Check if this is a protected route that requires authentication
    const protectedPaths = [
      '/account', 
      '/favorites', 
      '/my-dates', 
      '/date-plans', 
      '/make-date',
      '/api/search', 
      '/api/search-legacy',
      '/api/refresh',
      '/api/refresh-legacy'
    ]
    const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path))

    // Check for bypass flags in multiple locations
    const bypassCookie = request.cookies.get('bypass_auth_check')?.value === 'true';
    const bypassHeader = request.headers.get('x-bypass-auth-check') === 'true' ||
                       request.headers.get('x-auth-bypass') === 'true';
    const bypassParam = request.nextUrl.searchParams.get('bypass_auth') === 'true';
    const hasTimestampParam = request.nextUrl.searchParams.has('ts');
    
    // Combined bypass check - if timestamp is present it likely means client bypass was attempted
    const shouldBypassAuth = bypassCookie || bypassHeader || bypassParam || hasTimestampParam;
    
    if (shouldBypassAuth) {
      console.log(`Bypassing auth check for ${pathname} due to bypass flag`);
      // Keep the bypass cookie active to prevent loops while the page loads
      res.cookies.set('bypass_auth_check', 'true', { 
        maxAge: 120, // 2 minutes to allow navigation
        path: '/'
      });
      return res;
    }
    
    // Check for multiple redirect attempts - enhanced to better detect loops
    const redirectCount = parseInt(request.cookies.get('redirect_count')?.value || '0');
    const timestamp = parseInt(request.cookies.get('redirect_timestamp')?.value || '0');
    const now = Date.now();
    const timeSinceLastRedirect = now - timestamp;
    
    // If we've redirected multiple times or redirected very recently (within 2 seconds)
    if (redirectCount > 1 || (redirectCount > 0 && timeSinceLastRedirect < 2000)) {
      console.log(`Detected potential redirect loop (${redirectCount} redirects, ${timeSinceLastRedirect}ms since last), bypassing auth check`);
      res.cookies.set('bypass_auth_check', 'true', { 
        maxAge: 120, // 2 minutes to ensure navigation works
        path: '/'
      });
      // Reset redirect count
      res.cookies.set('redirect_count', '0', { 
        maxAge: 60,
        path: '/'
      });
      return res;
    }
    
    // Special case for auth callback routes - always bypass auth checks
    if (pathname.startsWith('/auth/callback')) {
      console.log('Auth callback route detected, bypassing auth check');
      return res;
    }
    
    // Create the Supabase client with the current request
    const supabase = createMiddlewareClient({ req: request, res })
    
    // Get the session - this will refresh the session if needed
    // This is important for token expiration handling
    const {
      data: { session },
      error
    } = await supabase.auth.getSession()
    
    if (error) {
      console.error('Error getting session in middleware:', error);
      // Don't redirect for errors, just let the request through
      return res;
    }
    
    // Debug information about session
    console.log(`AUTH CHECK: Path ${pathname}, Session exists: ${!!session}, User ID: ${session?.user?.id || 'none'}`)
    
    // Handle authentication redirects
    if (pathname.startsWith('/auth')) {
      // For auth routes, we'll let the client-side handle the redirection
      // This prevents redirect loops that can happen with middleware
      console.log(`Auth page - letting client-side handle the redirection logic`);
      
      // If showForm parameter is present, don't set bypass cookie even if user is authenticated
      const forceShowForm = request.nextUrl.searchParams.get('showForm') === 'true';
      const manualSignIn = request.nextUrl.searchParams.get('manualSignIn') === 'true';
      
      // If user is specifically trying to sign in, clear existing auth cookies
      if (manualSignIn) {
        console.log('Manual sign-in detected, clearing auth cookies');
        // We clear these cookies to prevent automatic redirect based on existing session
        res.cookies.set('bypass_auth_check', '', { 
          expires: new Date(0),
          path: '/'
        });
        // We deliberately don't clear the supabase session cookie here,
        // just our bypass flags to ensure form is shown
      }
      
      // Add cookie to response to prevent redirect loops, but only if not a manual sign-in
      if (session && !forceShowForm && !manualSignIn) {
        console.log('User is authenticated, setting bypass cookie for auth page');
        res.cookies.set('bypass_auth_check', 'true', { 
          maxAge: 120, // 2 minutes to ensure navigation works
          path: '/'
        });
      }
      
      return res;
    }
    
    // Handle protected routes
    if (isProtectedPath) {
      if (!session) {
        // User is not logged in but trying to access protected route
        console.log(`No session for protected path: ${pathname}, redirecting to auth`);
        
        // Increment redirect count to detect loops
        res.cookies.set('redirect_count', (redirectCount + 1).toString(), { 
          maxAge: 60,
          path: '/'
        });
        
        // Set timestamp of last redirect attempt
        res.cookies.set('redirect_timestamp', now.toString(), {
          maxAge: 60,
          path: '/'
        });
        
        const redirectUrl = new URL('/auth', request.url);
        redirectUrl.searchParams.set('redirectTo', pathname);
        redirectUrl.searchParams.set('timestamp', Date.now().toString()); // Add timestamp to avoid browser cache
        return NextResponse.redirect(redirectUrl);
      }
      
      // Reset redirect count on successful auth
      res.cookies.set('redirect_count', '0', { 
        maxAge: 60,
        path: '/'
      });
      
      // Add secure bypass cookie for authenticated users
      res.cookies.set('bypass_auth_check', 'true', { 
        maxAge: 120, // 2 minutes to allow navigation
        path: '/'
      });
      
      // User is logged in and can access protected route
      return res;
    }
    
    // For all other routes, just continue
    return res
  } catch (error) {
    console.error('Middleware error:', error)
    // Return a new response even if there's an error to prevent the app from crashing
    return NextResponse.next()
  }
}

// Specify which routes should be processed by this middleware
export const config = {
  matcher: [
    '/auth/:path*', 
    '/account/:path*',
    '/favorites/:path*',
    '/my-dates/:path*',
    '/date-plans/:path*',
    '/make-date/:path*',
    '/api/search/:path*',
    '/api/search-legacy/:path*',
    '/api/refresh/:path*',
    '/api/refresh-legacy/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ]
} 