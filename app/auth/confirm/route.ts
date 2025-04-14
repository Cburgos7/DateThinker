import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import type { EmailOtpType } from "@supabase/supabase-js"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const token_hash = requestUrl.searchParams.get("token_hash")
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null
  const next = requestUrl.searchParams.get("next") ?? "/"

  if (token_hash && type) {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })

    if (!error) {
      // Redirect user to the specified redirect URL or root of app
      return NextResponse.redirect(new URL("/confirmation-success", requestUrl.origin))
    } else {
      console.error("Error verifying OTP:", error)
    }
  }

  if (!token_hash) {
    console.error("No token provided for email confirmation")
    return NextResponse.redirect(new URL("/auth?error=Invalid+or+expired+link", requestUrl.origin))
  }

  // Redirect the user to an error page if verification fails
  return NextResponse.redirect(new URL("/login?error=Invalid+or+expired+link", requestUrl.origin))
}

