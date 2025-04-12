"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"

export function useSupabaseToken() {
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    async function getToken() {
      try {
        if (!supabase) {
          console.error("Supabase client not initialized")
          setToken(null)
          setLoading(false)
          return
        }
        
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error("Error getting token:", error)
          setToken(null)
        } else {
          // Store the access token
          setToken(data.session?.access_token || null)
        }
      } catch (err) {
        console.error("Unexpected error getting token:", err)
        setToken(null)
      } finally {
        setLoading(false)
      }
    }
    
    getToken()
    
    // Set up listener for auth changes
    if (supabase) {
      const { data: listener } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          setToken(session?.access_token || null)
        }
      )
      
      return () => {
        listener?.subscription.unsubscribe()
      }
    }
  }, [])
  
  return { token, loading }
}
