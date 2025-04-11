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
    
    // Create the middleware client with explicit URL and anon key
    const supabase = createMiddlewareClient(
      { req: request, res },
      {
        supabaseUrl,
        supabaseKey,
      }
    )
    
    // This will refresh the session if it exists and persist it to the cookie
    // This is key for server actions to work properly
    await supabase.auth.getSession()
    
    const pathname = request.nextUrl.pathname
    
    // Check auth status again after potentially refreshing the token
    const { data: { session } } = await supabase.auth.getSession()
    
    // If user is logged in and on the login page, redirect to home
    if (session && pathname.startsWith('/login')) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    
    // If user is not logged in but on a protected page, redirect to login
    if (!session && (pathname.startsWith('/account') || pathname.startsWith('/favorites') || pathname.startsWith('/my-dates'))) {
      const redirectUrl = new URL('/login', request.url)
      redirectUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(redirectUrl)
    }
    
    // Return the response with the refreshed cookie
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
    '/my-dates/:path*',
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ]
} 