"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function AuthTestPage() {
  const [sessionData, setSessionData] = useState<any>(null)
  const [userData, setUserData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      setLoading(true)
      setError(null)

      // Check if Supabase client is initialized
      if (!supabase) {
        throw new Error("Supabase client not initialized")
      }

      // Check session
      const { data: session, error: sessionError } = await supabase.auth.getSession()

      if (sessionError) {
        throw sessionError
      }

      setSessionData(session)

      // If we have a session, get user data
      if (session.session) {
        const { data: user, error: userError } = await supabase.auth.getUser()

        if (userError) {
          throw userError
        }

        setUserData(user)
      }
    } catch (err) {
      console.error("Auth check error:", err)
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <h1 className="text-2xl font-bold mb-4">Authentication Test</h1>

      <div className="mb-4">
        <Button onClick={checkAuth} disabled={loading}>
          {loading ? "Checking..." : "Check Auth Status"}
        </Button>
      </div>

      {error && (
        <Card className="mb-4 border-red-300 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Session Data</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Loading...</p>
            ) : sessionData ? (
              <div>
                <p>Session exists: {sessionData.session ? "Yes" : "No"}</p>
                {sessionData.session && (
                  <>
                    <p>User ID: {sessionData.session.user.id}</p>
                    <p>Expires at: {new Date(sessionData.session.expires_at * 1000).toLocaleString()}</p>
                    <p>Provider: {sessionData.session.user.app_metadata?.provider || "Not available"}</p>
                  </>
                )}
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-gray-600">View Raw Session Data</summary>
                  <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-60">
                    {JSON.stringify(sessionData, null, 2)}
                  </pre>
                </details>
              </div>
            ) : (
              <p>No session data available</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Data</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Loading...</p>
            ) : userData ? (
              <div>
                <p>Email: {userData.user.email}</p>
                <p>
                  Full name:{" "}
                  {userData.user.user_metadata?.full_name || userData.user.user_metadata?.name || "Not available"}
                </p>
                <p>Has avatar: {userData.user.user_metadata?.avatar_url ? "Yes" : "No"}</p>
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-gray-600">View Raw User Data</summary>
                  <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-60">
                    {JSON.stringify(userData, null, 2)}
                  </pre>
                </details>
              </div>
            ) : (
              <p>No user data available</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Environment Variables</CardTitle>
          </CardHeader>
          <CardContent>
            <p>NEXT_PUBLIC_SUPABASE_URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? "Set" : "Not set"}</p>
            <p>NEXT_PUBLIC_SUPABASE_ANON_KEY: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "Set" : "Not set"}</p>
            <p>NEXT_PUBLIC_BASE_URL: {process.env.NEXT_PUBLIC_BASE_URL ? "Set" : "Not set"}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

