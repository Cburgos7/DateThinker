"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export function AuthCheck() {
  const router = useRouter()
  const pathname = usePathname()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (!supabase) {
          console.error("AuthCheck: Supabase client not initialized")
          return
        }

        setIsChecking(true)
        // Check auth status
        const { data, error } = await supabase.auth.getSession()

        if (error) {
          console.error("AuthCheck: Error getting session:", error)
          return
        }

        const hasSession = !!data.session
        // Session status checked

        // If user is logged in and on the login page, redirect to home
        if (hasSession && pathname?.startsWith("/login")) {
          // Redirect to home
          router.replace("/")
        }

        // If user is not logged in but on a protected page, redirect to login
        if (!hasSession && (pathname?.startsWith("/account") || pathname?.startsWith("/favorites"))) {
          // Redirect to login
          router.replace(`/login?redirect=${encodeURIComponent(pathname || "/")}`)
        }
      } catch (error) {
        console.error("AuthCheck: Error checking auth status:", error)
      } finally {
        setIsChecking(false)
      }
    }

    checkAuth()

    // Listen for auth state changes
    const { data: authListener } = supabase?.auth.onAuthStateChange((event, session) => {
      // Auth state changed
      checkAuth()
    }) || { data: { subscription: { unsubscribe: () => {} } } }

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [pathname, router])

  // This component doesn't render anything
  return null
}

