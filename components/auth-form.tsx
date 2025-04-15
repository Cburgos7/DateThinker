"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase, checkSupabaseEnvVars } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle, Info, WifiOff, RefreshCw, FileWarning } from "lucide-react"

export function AuthForm({ redirectTo = "/" }: { redirectTo?: string }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [networkStatus, setNetworkStatus] = useState<"online" | "offline">("online")
  const [supabaseStatus, setSupabaseStatus] = useState<
    "checking" | "available" | "unavailable" | "dns-error" | "auth-error" | "env-error"
  >("checking")
  const [retryCount, setRetryCount] = useState(0)
  const [envVarStatus, setEnvVarStatus] = useState<any>(null)
  // Flag to track if form was manually submitted
  const [manualSubmit, setManualSubmit] = useState(false)

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => setNetworkStatus("online")
    const handleOffline = () => setNetworkStatus("offline")

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    // Set initial status
    setNetworkStatus(navigator.onLine ? "online" : "offline")

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  // Check environment variables directly
  useEffect(() => {
    const envStatus = checkSupabaseEnvVars()
    setEnvVarStatus(envStatus)

    if (envStatus.isPlaceholder) {
      setSupabaseStatus("env-error")
      setError("Supabase configuration contains placeholder values. Please update your environment variables.")
    }
  }, [])

  // Check if Supabase is available
  useEffect(() => {
    const checkSupabase = async () => {
      try {
        // If we already detected an env error, don't proceed with connection test
        if (supabaseStatus === "env-error") {
          return
        }

        if (!supabase) {
          setSupabaseStatus("unavailable")
          return
        }

        // Check if we're online first
        if (networkStatus === "offline") {
          setSupabaseStatus("unavailable")
          return
        }

        // Try a simple operation to check if Supabase is accessible
        const { data, error } = await supabase.auth.getSession()

        if (error) {
          console.error("Supabase connection error:", error)
          setSupabaseStatus("unavailable")
        } else {
          setSupabaseStatus("available")
        }
      } catch (err: any) {
        console.error("Error checking Supabase status:", err)
        setSupabaseStatus("unavailable")
      }
    }

    checkSupabase()
  }, [networkStatus, retryCount, supabaseStatus])

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    // Set flag to indicate user manually submitted the form
    setManualSubmit(true)

    // Check network status first
    if (networkStatus === "offline") {
      setError("You appear to be offline. Please check your internet connection and try again.")
      setIsLoading(false)
      return
    }

    if (!supabase) {
      setError("Authentication service not available. Please check your environment variables and restart the application.")
      setIsLoading(false)
      return
    }

    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    try {
      // Set a timeout to detect slow connections
      const timeoutId = setTimeout(() => {
        if (isLoading) {
          setError("The request is taking longer than expected. This might be due to a slow connection.")
        }
      }, 5000)

      // Sign in with Supabase - this will set the session cookie
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      clearTimeout(timeoutId)

      if (error) throw error

      console.log("Sign in successful, will redirect to:", redirectTo)
      console.log("Session data:", data.session ? "Session exists" : "No session")
      
      // Verify the session was set properly
      const { data: sessionCheck } = await supabase.auth.getSession()
      console.log("Session verification:", sessionCheck.session ? "Valid session" : "No session found")
      
      // Set bypass flag to prevent middleware redirect loops
      document.cookie = `bypass_auth_check=true; path=/; max-age=120`;
      try {
        localStorage.setItem('bypass_auth_check', 'true');
        sessionStorage.setItem('bypass_auth_check', 'true');
      } catch (e) {
        console.error("Error setting storage bypass flags:", e);
      }
      
      // Immediate redirect - don't show any checking screens
      const redirectUrl = new URL(redirectTo, window.location.origin);
      redirectUrl.searchParams.set('ts', Date.now().toString());
      redirectUrl.searchParams.set('bypass_auth', 'true');
      window.location.href = redirectUrl.toString();
    } catch (err: any) {
      console.error("Sign in error:", err)

      // Handle network errors specifically
      if (err.message.includes("fetch") || err.message.includes("network")) {
        setError("Network error. Please check your internet connection and try again.")
      } else if (err.message.includes("Invalid login")) {
        setError("Invalid email or password. Please try again.")
      } else if (err.message.includes("Email not confirmed")) {
        setError("Please confirm your email address before signing in.")
      } else {
        setError(err.message || "Failed to sign in")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    // Check network status first
    if (networkStatus === "offline") {
      setError("You appear to be offline. Please check your internet connection and try again.")
      setIsLoading(false)
      return
    }

    if (!supabase) {
      setError("Authentication service not available. Please check your environment variables and restart the application.")
      setIsLoading(false)
      return
    }

    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const fullName = formData.get("fullName") as string

    // Validate password length
    if (password.length < 6) {
      setError("Password must be at least 6 characters long")
      setIsLoading(false)
      return
    }

    try {
      // Set a timeout to detect slow connections
      const timeoutId = setTimeout(() => {
        if (isLoading) {
          setError("The request is taking longer than expected. This might be due to a slow connection.")
        }
      }, 5000)

      // Try a direct fetch to the Supabase auth endpoint as a fallback
      // This is a workaround for potential issues with the Supabase JS client
      const signUpResult = await signUpWithFallback(email, password, fullName)

      clearTimeout(timeoutId)

      if (signUpResult.error) {
        throw new Error(signUpResult.error)
      }

      // Instead of showing success message, redirect to the search page
      console.log("Sign up successful, redirecting to search page");
      
      // Set bypass flag to prevent middleware redirect loops
      document.cookie = `bypass_auth_check=true; path=/; max-age=120`;
      try {
        localStorage.setItem('bypass_auth_check', 'true');
        sessionStorage.setItem('bypass_auth_check', 'true');
      } catch (e) {
        console.error("Error setting storage bypass flags:", e);
      }
      
      // Redirect to search page
      window.location.href = "/make-date?bypass_auth=true&ts=" + Date.now();
    } catch (err: any) {
      console.error("Sign up error:", err)

      // Handle different types of errors
      if (err.message === "Request timed out") {
        setError("Request timed out. Please try again later.")
      } else if (
        err.message.includes("fetch") ||
        err.message.includes("network") ||
        err.message.includes("Failed to fetch")
      ) {
        setError(
          "Network error. The authentication service is currently unreachable. Please check your internet connection or try again later.",
        )
      } else if (err.message.includes("already registered") || err.message.includes("already in use")) {
        setError("This email is already registered. Please sign in or use a different email.")
      } else {
        setError(err.message || "Failed to create account")
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Fallback signup function that uses direct fetch if the Supabase client fails
  const signUpWithFallback = async (email: string, password: string, fullName: string) => {
    try {
      // First try with the Supabase client
      if (supabase) {
        try {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                full_name: fullName,
              },
              // The redirectTo is now handled by the client configuration
            },
          })

          if (error) {
            console.warn("Supabase client signup failed, trying fallback:", error)
            throw error
          }

          // Check if email confirmation is required
          if (data?.user?.identities?.length === 0) {
            return { error: "This email is already registered. Please sign in or use a different email." }
          }

          return { success: true }
        } catch (error: any) {
          console.warn("Supabase client signup error, trying fallback:", error)
          // Continue to fallback
        }
      }

      // Fallback: Direct fetch to Supabase auth endpoint
      // Note: This is a last resort and may not work in all environments
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!supabaseUrl || !supabaseKey) {
        return { error: "Authentication service configuration is missing" }
      }

      // Check for placeholder values
      if (supabaseUrl.includes("your-supabase-url") || supabaseKey.includes("your-supabase-anon-key")) {
        return { error: "Authentication service configuration contains placeholder values. Please update your environment variables." }
      }

      const formattedUrl =
        supabaseUrl.startsWith("https://") || supabaseUrl.startsWith("http://") ? supabaseUrl : `https://${supabaseUrl}`

      const response = await fetch(`${formattedUrl}/auth/v1/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseKey,
          "X-Client-Info": "datethinker-web-app",
        },
        body: JSON.stringify({
          email,
          password,
          data: { full_name: fullName },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        return { error: errorData.error_description || errorData.error || "Signup failed" }
      }

      const data = await response.json()
      return { success: true, data }
    } catch (error: any) {
      return { error: error.message || "Signup failed with both methods" }
    }
  }

  const handleRetryConnection = () => {
    setRetryCount((prev) => prev + 1)
    setSupabaseStatus("checking")
    setError(null)
  }

  return (
    <Tabs defaultValue="signin" className="w-full">
      <TabsList className="grid w-full grid-cols-2 p-1">
        <TabsTrigger value="signin">Sign In</TabsTrigger>
        <TabsTrigger value="signup">Sign Up</TabsTrigger>
      </TabsList>

      {/* Network Status Indicator */}
      {networkStatus === "offline" && (
        <div className="bg-amber-50 p-3 rounded-md flex items-start mt-4">
          <WifiOff className="h-5 w-5 text-amber-500 mr-2 mt-0.5" />
          <p className="text-amber-700 text-sm">You appear to be offline. Please check your internet connection.</p>
        </div>
      )}

      {/* Environment Variable Error */}
      {supabaseStatus === "env-error" && (
        <div className="bg-red-50 p-3 rounded-md flex items-start mt-4">
          <FileWarning className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
          <div className="text-red-700 text-sm">
            <p className="font-medium">Environment Variable Error</p>
            <p className="mt-1">
              Your Supabase anon key is still set to the placeholder value:{" "}
              <code className="bg-red-100 px-1 rounded">your-supabase-anon-key</code>
            </p>
            <p className="mt-2">
              <strong>Steps to fix:</strong>
            </p>
            <ol className="list-decimal ml-5 mt-1">
              <li>Go to your Supabase project dashboard</li>
              <li>Navigate to Project Settings → API</li>
              <li>Copy the "anon public" key (not the service_role key)</li>
              <li>Update your .env.local file with the correct key</li>
              <li>Restart your development server</li>
            </ol>
            <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-md">
              <p className="font-medium text-amber-700">Important Note:</p>
              <p className="text-amber-700 mt-1">
                After updating your .env.local file, you <strong>must restart your development server</strong> for the
                changes to take effect. Environment variables are only loaded when the server starts.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Supabase Status Indicator */}
      {supabaseStatus === "unavailable" && networkStatus === "online" && (
        <div className="bg-amber-50 p-3 rounded-md flex items-start mt-4">
          <Info className="h-5 w-5 text-amber-500 mr-2 mt-0.5" />
          <div className="text-amber-700 text-sm">
            <p>
              Authentication service is currently unavailable. This could be due to network issues or service
              maintenance.
            </p>
            <button
              onClick={handleRetryConnection}
              className="flex items-center mt-2 text-amber-600 hover:text-amber-800"
            >
              <RefreshCw className="h-4 w-4 mr-1" /> Retry connection
            </button>
          </div>
        </div>
      )}

      <TabsContent value="signin">
        <Card>
          <CardHeader>
            <CardTitle>Sign In to DateThinker</CardTitle>
            <CardDescription>Enter your email and password to access your account</CardDescription>
          </CardHeader>
          <form onSubmit={handleSignIn}>
            <CardContent className="space-y-3 md:space-y-4 px-4 py-3 md:p-6">
              {error && (
                <div className="bg-red-50 p-3 rounded-md flex items-start">
                  <AlertCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type="password" required />
              </div>
            </CardContent>

            <CardFooter className="px-4 pb-4 md:p-6 pt-0">
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-rose-500 to-purple-500 hover:opacity-90"
                disabled={
                  isLoading ||
                  supabaseStatus === "unavailable" ||
                  supabaseStatus === "env-error" ||
                  networkStatus === "offline"
                }
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </TabsContent>

      <TabsContent value="signup">
        <Card>
          <CardHeader>
            <CardTitle>Create an Account</CardTitle>
            <CardDescription>Sign up to save your favorite date ideas and access premium features</CardDescription>
          </CardHeader>
          <form onSubmit={handleSignUp}>
            <CardContent className="space-y-3 md:space-y-4 px-4 py-3 md:p-6">
              {error && (
                <div className="bg-red-50 p-3 rounded-md flex items-start">
                  <AlertCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input id="fullName" name="fullName" type="text" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input id="signup-email" name="email" type="email" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <Input id="signup-password" name="password" type="password" required minLength={6} />
                <p className="text-xs text-muted-foreground">Password must be at least 6 characters long</p>
              </div>
            </CardContent>

            <CardFooter className="px-4 pb-4 md:p-6 pt-0">
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-rose-500 to-purple-500 hover:opacity-90"
                disabled={
                  isLoading ||
                  supabaseStatus === "unavailable" ||
                  supabaseStatus === "env-error" ||
                  networkStatus === "offline"
                }
              >
                {isLoading ? "Creating Account..." : "Sign Up"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </TabsContent>
    </Tabs>
  )
}

