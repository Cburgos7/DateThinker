import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

export async function middleware(request: NextRequest) {
  const res = NextResponse.next()
  
  try {
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
  } catch (error) {
    console.error('Middleware error:', error)
    // Return the response even if there's an error to prevent the app from crashing
    return res
  }
}

// Specify which routes should be processed by this middleware
export const config = {
  matcher: ['/login', '/account/:path*', '/favorites/:path*']
} 