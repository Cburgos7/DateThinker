import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import type { EmailOtpType } from "@supabase/supabase-js"

// Mark this route as dynamic because it uses cookies
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const token_hash = requestUrl.searchParams.get("token_hash")
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null

  // Handle missing token
  if (!token_hash) {
    console.error("No token provided for email confirmation")
    return NextResponse.redirect(new URL("/login?error=Invalid+or+expired+link", requestUrl.origin))
  }

  if (token_hash && type) {
    try {
      // Create Supabase client using the route handler pattern
      const supabase = createRouteHandlerClient({ cookies })

      // Verify OTP token
      const { error } = await supabase.auth.verifyOtp({
        type,
        token_hash,
      })

      if (error) {
        console.error("Error verifying OTP:", error)
        return NextResponse.redirect(new URL("/login?error=Invalid+or+expired+link", requestUrl.origin))
      }

      // If successful, redirect to success page
      return NextResponse.redirect(new URL("/confirmation-success", requestUrl.origin))
    } catch (err) {
      console.error("Unexpected error in email verification:", err)
      return NextResponse.redirect(new URL("/login?error=Verification+failed", requestUrl.origin))
    }
  }

  // Fallback error redirect
  return NextResponse.redirect(new URL("/login?error=Invalid+or+expired+link", requestUrl.origin))
} 