"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"

export function useSupabaseToken() {
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [retryCount, setRetryCount] = useState(0)
  const maxRetries = 3
  
  // Function to get token directly from localStorage as a fallback
  const getTokenFromStorage = () => {
    try {
      if (typeof window === 'undefined') return null
      
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
      const storageKey = `sb-${supabaseKey.split('.')[0]}-auth-token`
      
      const storedData = localStorage.getItem(storageKey)
      if (!storedData) return null
      
      try {
        const parsedData = JSON.parse(storedData)
        return parsedData?.access_token || null
      } catch (e) {
        return null
      }
    } catch (e) {
      console.error("Error accessing localStorage:", e)
      return null
    }
  }
  
  useEffect(() => {
    let isMounted = true
    
    async function getToken() {
      try {
        if (!supabase) {
          console.error("Supabase client not initialized")
          
          // Try localStorage fallback
          const storageToken = getTokenFromStorage()
          if (storageToken && isMounted) {
            console.log("Retrieved token from localStorage")
            setToken(storageToken)
            setLoading(false)
          } else if (isMounted) {
            setToken(null)
            setLoading(false)
          }
          return
        }
        
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error("Error getting token:", error)
          if (isMounted) setToken(null)
        } else if (data.session?.access_token) {
          // Store the access token
          if (isMounted) setToken(data.session.access_token)
        } else {
          // Try localStorage fallback
          const storageToken = getTokenFromStorage()
          if (storageToken && isMounted) {
            console.log("No session found, using token from localStorage")
            setToken(storageToken)
          } else if (isMounted) {
            setToken(null)
          }
        }
      } catch (err) {
        console.error("Unexpected error getting token:", err)
        if (isMounted) setToken(null)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    
    getToken()
    
    // Set up listener for auth changes
    let listener: { subscription: { unsubscribe: () => void } } | undefined
    
    if (supabase) {
      const { data } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          console.log("Auth state changed:", event)
          if (isMounted) {
            setToken(session?.access_token || null)
          }
        }
      )
      listener = data
    }
    
    // Check again if session is not found and retries haven't been exhausted
    const checkInterval = setInterval(() => {
      if (!token && retryCount < maxRetries) {
        console.log(`Retry ${retryCount + 1}/${maxRetries} to get auth token`)
        setRetryCount(prev => prev + 1)
        getToken()
      } else {
        clearInterval(checkInterval)
      }
    }, 1000)
    
    return () => {
      isMounted = false
      listener?.subscription.unsubscribe()
      clearInterval(checkInterval)
    }
  }, [retryCount])
  
  return { token, loading }
}
