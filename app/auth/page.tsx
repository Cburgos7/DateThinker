"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { AuthForm } from "@/components/auth-form"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { AuthCheck } from "@/components/auth-check"
import { setBypassFlags, clearBypassFlags } from "@/lib/auth-utils"

export default function AuthPage() {
  const searchParams = useSearchParams()
  // Check for both redirectTo and redirect parameters for backward compatibility
  const redirectTo = searchParams?.get('redirectTo') || searchParams?.get('redirect')
  const [storedRedirect, setStoredRedirect] = useState<string | null>(null)
  const [redirectLoopDetected, setRedirectLoopDetected] = useState(false)
  // Always show the form immediately unless explicitly checking auth
  const [authCheckComplete, setAuthCheckComplete] = useState(true)
  // Check if user explicitly navigated to auth page (vs being redirected)
  const forceShowForm = searchParams?.get('showForm') === 'true' || true
  
  const finalRedirectUrl = redirectTo || storedRedirect || "/make-date"

  // Check for stored redirect from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const redirect = localStorage.getItem('redirectAfterLogin');
      if (redirect) {
        console.log("Found stored redirect from localStorage:", redirect);
        setStoredRedirect(redirect);
      }
    }
  }, []);

  // If redirect loop detected, show message and manual options
  if (redirectLoopDetected) {
    return (
      <>
        <Header />
        <div className="container max-w-md mx-auto py-10 text-center">
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md mb-6">
            <h2 className="text-lg font-bold text-yellow-800 mb-2">Redirect Loop Detected</h2>
            <p className="text-yellow-700 mb-4">
              We detected an authentication redirect loop. This usually happens when session cookies
              are not being properly recognized.
            </p>
            <div className="flex flex-col gap-3">
              <a 
                href="/make-date" 
                className="px-4 py-2 bg-rose-500 text-white rounded hover:bg-rose-600"
                onClick={() => setBypassFlags()}
              >
                Continue to Make a Date page
              </a>
              <button
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                onClick={() => {
                  // Clear auth-related storage items
                  clearBypassFlags();
                  // Refresh the page
                  window.location.reload();
                }}
              >
                Clear cache and retry
              </button>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  // If explicitly showing form OR still checking auth status, show loading indicator
  if (!authCheckComplete && !forceShowForm) {
    return (
      <>
        <Header />
        <div className="container max-w-md mx-auto py-10 text-center">
          <AuthCheck
            redirectTo={finalRedirectUrl}
            onAuthenticated={(isAuthenticated) => {
              if (!isAuthenticated) {
                setAuthCheckComplete(true);
              }
            }}
            onRedirectLoop={() => {
              setRedirectLoopDetected(true);
            }}
          />
          <div className="mt-4">
            <p className="text-sm text-gray-500">
              Checking your authentication status...
            </p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

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

          {redirectTo && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-blue-800 text-sm">
                You'll be redirected to {redirectTo} after signing in
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