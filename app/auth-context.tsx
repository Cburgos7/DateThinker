"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { supabase, refreshSession } from "@/lib/supabase"

type AuthContextType = {
  user: any | null
  loading: boolean
  refreshAuth: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  refreshAuth: async () => false,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  // Function to refresh authentication
  const refreshAuth = async (): Promise<boolean> => {
    try {
      const success = await refreshSession();
      if (success && supabase) {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        setUser(data.session?.user || null);
        return !!data.session?.user;
      }
      return false;
    } catch (error) {
      console.error("Error refreshing auth:", error);
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
          return
        }
        
        const { data, error } = await supabase.auth.getSession()
        if (error) throw error
        setUser(data.session?.user || null)
      } catch (error) {
        console.error("Error checking auth session:", error)
      } finally {
        setLoading(false)
      }
    }

    checkSession()

    // Listen for auth changes
    if (supabase) {
      const { data: authListener } = supabase.auth.onAuthStateChange(
        (event, session) => {
          console.log("Auth state changed:", event);
          setUser(session?.user || null)
          setLoading(false)
        }
      )

      return () => {
        authListener.subscription.unsubscribe()
      }
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext) 