"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { supabase, refreshSession } from "@/lib/supabase"

type AuthContextType = {
  user: any | null
  loading: boolean
  refreshAuth: () => Promise<boolean>
  authStatus: 'initializing' | 'authenticated' | 'unauthenticated' | 'error'
  lastAuthError: string | null
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  refreshAuth: async () => false,
  authStatus: 'initializing',
  lastAuthError: null
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [authStatus, setAuthStatus] = useState<'initializing' | 'authenticated' | 'unauthenticated' | 'error'>('initializing')
  const [lastAuthError, setLastAuthError] = useState<string | null>(null)

  // Function to refresh authentication
  const refreshAuth = async (): Promise<boolean> => {
    try {
      setAuthStatus('initializing')
      const success = await refreshSession();
      if (success && supabase) {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          setLastAuthError(error.message)
          setAuthStatus('error')
          throw error;
        }
        setUser(data.session?.user || null);
        setAuthStatus(data.session?.user ? 'authenticated' : 'unauthenticated')
        console.log("Auth refreshed, status:", data.session?.user ? 'authenticated' : 'unauthenticated')
        return !!data.session?.user;
      }
      setAuthStatus('unauthenticated')
      return false;
    } catch (error) {
      console.error("Error refreshing auth:", error);
      setAuthStatus('error')
      setLastAuthError(error instanceof Error ? error.message : String(error))
      return false;
    }
  };

  useEffect(() => {
    // Check for existing session
    const checkSession = async () => {
      try {
        if (!supabase) {
          console.error("AuthProvider: Supabase client not initialized")
          setLoading(false)
          setAuthStatus('error')
          setLastAuthError("Supabase client not initialized")
          return
        }
        
        const { data, error } = await supabase.auth.getSession()
        if (error) {
          setLastAuthError(error.message)
          setAuthStatus('error')
          throw error
        }
        setUser(data.session?.user || null)
        setAuthStatus(data.session?.user ? 'authenticated' : 'unauthenticated')
        console.log("Initial auth check, status:", data.session?.user ? 'authenticated' : 'unauthenticated', 
                    "User:", data.session?.user?.id || "none")
      } catch (error) {
        console.error("Error checking auth session:", error)
        setAuthStatus('error')
        setLastAuthError(error instanceof Error ? error.message : String(error))
      } finally {
        setLoading(false)
      }
    }

    checkSession()

    // Listen for auth changes
    if (supabase) {
      const { data: authListener } = supabase.auth.onAuthStateChange(
        (event, session) => {
          console.log("Auth state changed:", event, "Has session:", !!session);
          setUser(session?.user || null)
          setAuthStatus(session?.user ? 'authenticated' : 'unauthenticated')
          setLoading(false)
        }
      )

      return () => {
        authListener.subscription.unsubscribe()
      }
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, refreshAuth, authStatus, lastAuthError }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext) 