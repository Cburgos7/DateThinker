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
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    try {
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

      // IMPORTANT: Redirect to the next URL directly
      // This ensures we don't go back to the login page
      return NextResponse.redirect(new URL(next, requestUrl.origin))
    } catch (err) {
      console.error("Unexpected error in auth callback:", err)
      return NextResponse.redirect(new URL("/login?error=Unexpected+error", requestUrl.origin))
    }
  } else {
    console.warn("Auth callback called without code parameter")
    return NextResponse.redirect(new URL("/login?error=No+authorization+code", requestUrl.origin))
  }
}

