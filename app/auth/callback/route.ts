import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  // Default to home page if no specific redirect is provided
  const next = requestUrl.searchParams.get("next") || "/"
  const error = requestUrl.searchParams.get("error")
  const errorDescription = requestUrl.searchParams.get("error_description")

  console.log("Auth callback received with:", {
    code: code ? "Present" : "Missing",
    next,
    error,
    errorDescription,
    fullUrl: request.url,
  })

  if (error) {
    console.error("OAuth error:", error, errorDescription)
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorDescription || error)}`, requestUrl.origin),
    )
  }

  if (code) {
    try {
      // Create a Supabase client with the cookie store
      const cookieStore = cookies()
      const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

      // Exchange the code for a session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error("Error exchanging code for session:", error)
        return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, requestUrl.origin))
      }

      if (!data?.user) {
        console.error("No user data returned from exchangeCodeForSession")
        return NextResponse.redirect(new URL("/login?error=No+user+data+returned", requestUrl.origin))
      }

      // Log user data for debugging
      console.log("Auth callback - User authenticated:", {
        id: data.user.id,
        email: data.user.email,
      })

      // Make an explicit request to ensure the session is properly set in cookies
      const { error: sessionError } = await supabase.auth.getSession()
      if (sessionError) {
        console.error("Error getting session after exchange:", sessionError)
      } else {
        console.log("Session successfully fetched and set in cookies")
      }

      // Create a response object to add specific headers if needed
      const response = NextResponse.redirect(new URL(next, requestUrl.origin))
      
      // Set cache control headers to prevent caching of the authentication state
      response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate')
      
      return response
    } catch (err) {
      console.error("Unexpected error in auth callback:", err)
      return NextResponse.redirect(new URL("/login?error=Unexpected+error", requestUrl.origin))
    }
  } else {
    console.warn("Auth callback called without code parameter")
    return NextResponse.redirect(new URL("/login?error=No+authorization+code", requestUrl.origin))
  }
}

