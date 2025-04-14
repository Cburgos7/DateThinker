import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const error = requestUrl.searchParams.get("error")
  const errorDescription = requestUrl.searchParams.get("error_description")
  
  // Default redirect location
  const redirectTo = "/my-dates"

  // Handle error case
  if (error) {
    console.error("Auth callback error:", error, errorDescription)
    return NextResponse.redirect(
      new URL(`/auth?error=${encodeURIComponent(errorDescription || error)}`, requestUrl.origin)
    )
  }

  // Handle missing code
  if (!code) {
    console.error("No authorization code provided in callback")
    return NextResponse.redirect(new URL("/auth?error=No+authorization+code", requestUrl.origin))
  }

  try {
    // Create a Supabase client using the route handler pattern
    const supabase = createRouteHandlerClient({ cookies })

    // Exchange the code for a session
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.error("Error exchanging code for session:", exchangeError)
      return NextResponse.redirect(
        new URL(`/auth?error=${encodeURIComponent(exchangeError.message)}`, requestUrl.origin)
      )
    }

    if (!data?.user) {
      console.error("No user data returned from code exchange")
      return NextResponse.redirect(new URL("/auth?error=No+user+data+returned", requestUrl.origin))
    }

    console.log("Successfully authenticated user:", data.user.email)
    
    // Redirect to home or dashboard after successful login
    return NextResponse.redirect(new URL(redirectTo, requestUrl.origin))
  } catch (err) {
    console.error("Unexpected error in auth callback:", err)
    return NextResponse.redirect(new URL("/auth?error=Unexpected+error", requestUrl.origin))
  }
} 