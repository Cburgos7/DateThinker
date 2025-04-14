import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const params = requestUrl.searchParams
  const error = params.get("error")

  console.log("Auth callback received with:", {
    error: error ? "Present" : "Missing",
    fullUrl: request.url,
  })

  if (error) {
    console.error("Auth callback error:", error)
    const errorDescription = params.get("error_description")
    console.error("Error description:", errorDescription)
    return NextResponse.redirect(
      new URL(`/auth?error=${encodeURIComponent(errorDescription || error)}`, requestUrl.origin),
    )
  }

  const code = params.get("code")

  if (code) {
    try {
      // Create a Supabase client with the cookie store
      const cookieStore = cookies()
      const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

      // Exchange the code for a session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error("Error exchanging code for session:", error)
        return NextResponse.redirect(new URL(`/auth?error=${encodeURIComponent(error.message)}`, requestUrl.origin))
      }

      if (!data?.user) {
        console.error("No user data returned after code exchange")
        return NextResponse.redirect(new URL("/auth?error=No+user+data+returned", requestUrl.origin))
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

      // Check if we have a redirect URL
      const redirectTo = cookies().get("redirectOnLogin")?.value || "/my-dates"
      console.log("Redirecting to:", redirectTo)

      // Clear the redirect cookie
      cookies().delete("redirectOnLogin")

      if (redirectTo.startsWith("/")) {
        return NextResponse.redirect(new URL(redirectTo, requestUrl.origin))
      } else {
        // Use the raw URL if it's an external URL (should be validated before setting cookie)
        return NextResponse.redirect(redirectTo)
      }
    } catch (error) {
      console.error("Unexpected error in callback:", error)
      return NextResponse.redirect(new URL("/auth?error=Unexpected+error", requestUrl.origin))
    }
  } else {
    console.error("No authorization code provided in callback")
    return NextResponse.redirect(new URL("/auth?error=No+authorization+code", requestUrl.origin))
  }
}

