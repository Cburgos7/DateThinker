import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { cookies } from 'next/headers'

// Mark this route as dynamic because it uses cookies
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  
  // Get the code or access_token from the URL
  const code = requestUrl.searchParams.get('code')
  const accessToken = requestUrl.searchParams.get('access_token')
  const refreshToken = requestUrl.searchParams.get('refresh_token')
  
  // Get any redirect URL passed in the query parameters
  const redirectParam = requestUrl.searchParams.get('redirect')
  
  // Handle Supabase auth callback
  if (code || accessToken) {
    try {
      const cookieStore = cookies()
      const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
      
      if (code) {
        // Exchange code for session
        await supabase.auth.exchangeCodeForSession(code)
        console.log("Login callback: Exchanged code for session")
      } else if (accessToken && refreshToken) {
        // Set session with tokens
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        console.log("Login callback: Set session with tokens")
      }
    } catch (error) {
      console.error("Login callback error:", error)
    }
  }
  
  // Default redirect to home, or use redirect param if provided
  let redirectTo = '/'
  
  // Check for redirect parameter and decode it if present
  if (redirectParam) {
    try {
      redirectTo = decodeURIComponent(redirectParam)
      // Validate redirectTo to ensure it's a relative URL to prevent open redirect vulnerabilities
      if (redirectTo.startsWith('http://') || redirectTo.startsWith('https://')) {
        // Extract just the path portion for security
        try {
          const url = new URL(redirectTo)
          if (url.hostname !== requestUrl.hostname) {
            // If external domain, only redirect to our domain
            redirectTo = '/'
          }
        } catch (e) {
          redirectTo = '/'
        }
      }
    } catch (e) {
      console.error("Error processing redirect:", e)
      redirectTo = '/'
    }
  }
  
  console.log("Login callback redirecting to:", redirectTo)
  return NextResponse.redirect(new URL(redirectTo, requestUrl.origin))
} 