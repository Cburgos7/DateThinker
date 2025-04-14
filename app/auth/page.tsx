"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { AuthForm } from "@/components/auth-form"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

export default function AuthPage() {
  const searchParams = useSearchParams()
  const redirectTo = searchParams?.get('redirectTo')
  const [storedRedirect, setStoredRedirect] = useState<string | null>(null)
  
  useEffect(() => {
    // Check for stored redirect from localStorage that would be set by shared page
    const redirect = typeof window !== 'undefined' ? localStorage.getItem('redirectAfterLogin') : null
    if (redirect) {
      setStoredRedirect(redirect)
    }
  }, [])

  // Determine the best redirect URL
  const finalRedirectUrl = redirectTo || storedRedirect || "/my-dates"

  return (
    <>
      <Header />
      <div className="container max-w-md mx-auto py-10">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Sign In to DateThinker</h1>
            <p className="text-gray-500">Sign in to your account or create a new one</p>
          </div>
          
          {storedRedirect && storedRedirect.includes('/shared/') && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-blue-800 text-sm">
                Sign in to view and accept the shared date plan
              </p>
            </div>
          )}

          <AuthForm redirectTo={finalRedirectUrl} />
        </div>
      </div>
      <Footer />
    </>
  )
} 