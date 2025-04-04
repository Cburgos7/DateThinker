"use client"

import { useEffect } from "react"
import { redirect, useSearchParams } from "next/navigation"
import { AuthForm } from "@/components/auth-form"
import { supabase } from "@/lib/supabase"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

export default function LoginPage() {
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get("redirect") || "/"

  useEffect(() => {
    async function checkSession() {
      try {
        if (!supabase) {
          console.error("Supabase client not initialized")
          throw new Error("Authentication service not available")
        }

        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        if (error) {
          console.error("Error getting session:", error)
          throw error
        }

        if (session) {
          console.log("User already logged in, redirecting to:", redirectTo)
          redirect(redirectTo)
        }
      } catch (error) {
        console.error("Error in login page:", error)
      }
    }

    checkSession()
  }, [redirectTo])

  return (
    <>
      <Header />
      <div className="container mx-auto px-4 py-8 md:py-16 flex items-center justify-center min-h-[calc(100vh-140px)]">
        <div className="w-full max-w-md">
          <h1 className="text-2xl md:text-3xl font-bold text-center mb-6 md:mb-8 bg-clip-text text-transparent bg-gradient-to-r from-rose-500 to-purple-500">
            Welcome to DateThinker
          </h1>
          <AuthForm redirectTo={redirectTo} />
        </div>
      </div>
      <Footer />
    </>
  )
}

