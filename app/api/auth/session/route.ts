import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

// Mark this route as dynamic since it uses cookies
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Get cookies
    const cookieStore = cookies()
    
    // Create a Supabase client with SSR
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    // Get session
    const { data, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('Session API error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Unexpected error in session API route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 