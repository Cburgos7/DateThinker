import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"

export async function middleware(request: NextRequest) {
  try {
    // Create a Supabase client configured to use cookies
    const supabase = createMiddlewareClient({ req: request, res: NextResponse.next() })

    // Refresh session if expired - required for Server Components
    await supabase.auth.getSession()

    // Get response
    const response = NextResponse.next()

    // Add security headers that can't be added in next.config.js
    response.headers.set("X-DNS-Prefetch-Control", "on")

    // Prevent clickjacking
    response.headers.set("X-Frame-Options", "DENY")

    // Prevent MIME type sniffing
    response.headers.set("X-Content-Type-Options", "nosniff")

    // Basic XSS protection
    response.headers.set("X-XSS-Protection", "1; mode=block")

    // Rate limiting headers (for demonstration - actual rate limiting would need more logic)
    const requestsPerMinute = 60
    response.headers.set("X-RateLimit-Limit", requestsPerMinute.toString())

    return response
  } catch (error) {
    console.error("Middleware error:", error)
    // Return a basic response if Supabase client fails
    const response = NextResponse.next()
    response.headers.set("X-DNS-Prefetch-Control", "on")
    response.headers.set("X-Frame-Options", "DENY")
    response.headers.set("X-Content-Type-Options", "nosniff")
    response.headers.set("X-XSS-Protection", "1; mode=block")
    return response
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes
     */
    "/((?!_next/static|_next/image|favicon.ico|public/|api/).*)",
  ],
}

