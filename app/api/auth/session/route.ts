import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

export async function GET() {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Get the session from the server
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error) {
      console.error('API route error refreshing session:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (session) {
      console.log('API route session refresh - user authenticated:', session.user.email)
      return NextResponse.json({ 
        user: session.user,
        authenticated: true,
        message: 'Session refreshed successfully'
      })
    } else {
      console.log('API route session refresh - no active session')
      return NextResponse.json({ 
        authenticated: false,
        message: 'No active session found'
      })
    }
  } catch (error) {
    console.error('Unexpected error in session API route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 