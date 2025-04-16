import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  
  // Get the code or access_token from the URL
  const code = requestUrl.searchParams.get('code')
  const accessToken = requestUrl.searchParams.get('access_token')
  const refreshToken = requestUrl.searchParams.get('refresh_token')
  
  // Handle Supabase auth callback
  if (code || accessToken) {
    try {
      const cookieStore = cookies()
      const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
      
      if (code) {
        // Exchange code for session
        await supabase.auth.exchangeCodeForSession(code)
        console.log("Auth callback: Exchanged code for session")
      } else if (accessToken && refreshToken) {
        // Set session with tokens
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        console.log("Auth callback: Set session with tokens")
      }
    } catch (error) {
      console.error("Auth callback error:", error)
    }
  }
  
  // Default redirect to home, or use redirect param if provided
  const redirectTo = requestUrl.searchParams.get('redirect') || '/'
  
  return NextResponse.redirect(new URL(redirectTo, requestUrl.origin))
} 