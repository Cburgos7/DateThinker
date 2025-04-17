"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { createClient } from "@/utils/supabase/client"
import { useAuth } from "@/contexts/auth-context"
import { AuthError } from "@supabase/supabase-js"

interface AuthFormProps {
  redirectTo?: string;
}

export function AuthForm({ redirectTo }: AuthFormProps = {}) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectedFrom = searchParams?.get('redirectedFrom') || ''
  const { refreshSession, forceServerRefresh } = useAuth()
  
  // Initialize Supabase client
  const supabase = createClient()

  // Force server to acknowledge auth state
  const syncAuthWithServer = async () => {
    try {
      // Call our auth check API to sync auth state between client and server
      const response = await fetch('/api/auth/check', {
        method: 'GET',
        credentials: 'include', // Include cookies
      });
      
      if (!response.ok) {
        console.error('Failed to sync auth state with server');
      }
      
      // Force Next.js to revalidate
      router.refresh();
      
      // Small delay to ensure everything is propagated
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return true;
    } catch (error) {
      console.error('Error syncing auth state:', error);
      return false;
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setMessage(null)

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const passwordValue = formData.get('password') as string
    
    // Use the mode state instead of trying to extract from form attributes
    const action = mode
    console.log("Form submission action:", action)

    // For signup, validate password confirmation
    if (action === 'signup' && passwordValue !== confirmPassword) {
      setError('Passwords do not match')
      setIsLoading(false)
      return
    }

    try {
      let result: { error?: string; message?: string } = {};
      
      if (action === 'login') {
        console.log("Attempting login for:", email)
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password: passwordValue,
        })
        
        if (error) {
          console.error("Login error:", error.message)
          result = { error: error.message };
        } else {
          console.log("Login successful for:", data.user?.email)
          
          // Multiple steps to ensure auth state is properly synchronized
          
          // 1. Refresh client-side auth state
          await refreshSession()
          
          // 2. Force server-side refresh via our API endpoint
          await syncAuthWithServer()
          
          // 3. Force other components to refresh
          await forceServerRefresh()
          
          // Use the provided redirectTo prop if available, otherwise use redirectedFrom or default to home
          const redirectUrl = redirectTo || redirectedFrom || '/';
          console.log("Redirecting to:", redirectUrl)
          
          try {
            // Try window.location first for a full page refresh if needed
            window.location.href = redirectUrl;
          } catch (err) {
            // Fallback to router if window is not available
            router.push(redirectUrl)
            router.refresh()
          }
          
          return;
        }
      } else {
        console.log("Attempting signup for:", email)
        // Ensure we have the origin for email redirect
        const origin = typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_SITE_URL || ''
        
          const { data, error } = await supabase.auth.signUp({
            email,
          password: passwordValue,
            options: {
            emailRedirectTo: `${origin}/login/callback?redirect=${encodeURIComponent(redirectTo || '/')}`,
            },
          })

          if (error) {
          console.error("Signup error:", error.message)
          result = { error: error.message };
        } else if (data?.user?.identities?.length === 0) {
          // User already exists but is trying to sign up again
          result = { error: 'An account with this email already exists. Please log in instead.' };
        } else {
          console.log("Signup successful:", data)
          
          // Redirect to check-email page instead of showing a message
          router.push('/check-email?email=' + encodeURIComponent(email));
          return;
        }
      }

      if (result?.error) {
        setError(result.error)
      } else if (result?.message) {
        setMessage(result.message)
      }
    } catch (err: any) {
      console.error("Unexpected auth error:", err)
      setError('An unexpected error occurred: ' + (err.message || ''))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight">
            {mode === 'login' ? 'Sign in to your account' : 'Create a new account'}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="relative block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-rose-500 sm:text-sm sm:leading-6"
                placeholder="Email address"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'login' ? "current-password" : "new-password"}
                required
                className="relative block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-rose-500 sm:text-sm sm:leading-6"
                placeholder="Password"
                minLength={6}
              />
            </div>
            
            {mode === 'signup' && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  className="relative block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-rose-500 sm:text-sm sm:leading-6"
                  placeholder="Confirm Password"
                  minLength={6}
                />
        </div>
      )}
          </div>

          {error && (
            <div className="text-sm text-red-600 text-center">
              {error}
        </div>
      )}

          {message && (
            <div className="text-sm text-green-600 text-center">
              {message}
                </div>
              )}

          <div className="flex flex-col gap-4">
            {mode === 'login' ? (
              <>
                <Button
                  type="submit"
                  className="group relative flex w-full justify-center rounded-md bg-rose-500 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500"
                  disabled={isLoading}
                >
                  {isLoading ? "Signing in..." : "Sign in"}
                </Button>
                
                <div 
                  className="group relative flex w-full justify-center rounded-md bg-purple-500 px-3 py-2 text-sm font-semibold text-white hover:bg-purple-600 cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();
                    setMode('signup');
                  }}
                >
                  Sign up
                </div>
              </>
            ) : (
              <>
                <Button
                  type="submit"
                  className="group relative flex w-full justify-center rounded-md bg-purple-500 px-3 py-2 text-sm font-semibold text-white hover:bg-purple-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500"
                  disabled={isLoading}
                >
                  {isLoading ? "Creating account..." : "Sign up"}
                </Button>
                
                <div
                  className="group relative flex w-full justify-center rounded-md border border-rose-500 bg-white px-3 py-2 text-sm font-semibold text-rose-500 hover:bg-rose-50 cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();
                    setMode('login');
                  }}
                >
                  Back to Sign in
                </div>
              </>
            )}
          </div>
          </form>
      </div>
    </div>
  )
}

