"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Session, User, AuthChangeEvent } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

type AuthContextType = {
  user: User | null
  session: Session | null
  isLoading: boolean
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
  forceServerRefresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  // Force a server refresh to update server-side auth state
  const forceServerRefresh = async () => {
    try {
      console.log("Auth context: Forcing server refresh")
      // Force a revalidation by the server
      await fetch('/api/auth/session', { 
        method: 'GET',
        headers: { 'x-force-refresh': 'true' }
      })
      router.refresh()
    } catch (error) {
      console.error("Auth context: Error forcing server refresh:", error)
    }
  }

  // Function to refresh the session
  const refreshSession = async () => {
    try {
      setIsLoading(true)
      console.log("Auth context: Refreshing session...")
      const { data, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error("Auth context: Error refreshing session:", error.message)
      } else if (data?.session) {
        console.log("Auth context: Session refreshed successfully, user:", data.session.user.email)
        setSession(data.session)
        setUser(data.session.user)
        
        // After setting client-side state, force server to refresh
        await forceServerRefresh()
      } else {
        console.log("Auth context: No active session found during refresh")
        setSession(null)
        setUser(null)
      }
    } catch (error) {
      console.error("Auth context: Unexpected error during session refresh:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Sign out function
  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
      setSession(null)
      // Force refresh to clear all state
      window.location.href = '/'
    } catch (error) {
      console.error("Auth context: Error signing out:", error)
    }
  }

  // Fetch session on initial load
  useEffect(() => {
    refreshSession()

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, newSession: Session | null) => {
        console.log("Auth context: Auth state changed, event:", event)
        setSession(newSession)
        setUser(newSession?.user ?? null)
        
        if (event === 'SIGNED_IN') {
          console.log("Auth context: User signed in:", newSession?.user?.email)
          // After login, force server-side refresh to update middleware
          await forceServerRefresh()
        } else if (event === 'SIGNED_OUT') {
          console.log("Auth context: User signed out")
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  const value = {
    user,
    session,
    isLoading,
    signOut,
    refreshSession,
    forceServerRefresh
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 