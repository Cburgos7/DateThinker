import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

// Mark this route as dynamic - it uses cookies which can't be statically generated
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    // Get cookies safely
    const cookieStore = cookies()
    
    // Create a server client that uses SSR
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Try to get the session from the server
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error) {
      console.error('Auth check API error:', error.message)
      return NextResponse.json({ 
        error: error.message,
        authenticated: false 
      }, { status: 500 })
    }

    if (session) {
      // If we have a session, set the custom cookie for middleware to check
      const response = NextResponse.json({
        authenticated: true,
        user: {
          id: session.user.id,
          email: session.user.email,
        },
        message: 'User is authenticated'
      })

      // Set a cookie that will be visible to both client and middleware
      response.cookies.set('sb-auth-sync', 'true', {
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        sameSite: 'lax',
      })

      return response
    } else {
      // Clear the sync cookie if no session found
      const response = NextResponse.json({
        authenticated: false,
        message: 'No session found'
      })

      response.cookies.set('sb-auth-sync', '', {
        path: '/',
        maxAge: 0,
        sameSite: 'lax',
      })

      return response
    }
  } catch (error) {
    console.error('Unexpected error in auth check API route:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      authenticated: false 
    }, { status: 500 })
  }
} 