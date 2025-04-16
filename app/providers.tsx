"use client"

import { Toaster } from "@/components/ui/toaster"
import { createContext, useContext, useState, useEffect } from "react"
import { AuthProvider } from "@/contexts/auth-context"

// Create a context for the mounted state
const MountedContext = createContext<boolean>(false)

export function useMounted() {
  return useContext(MountedContext)
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <MountedContext.Provider value={mounted}>
      <AuthProvider>
        {children}
        <Toaster />
      </AuthProvider>
    </MountedContext.Provider>
  )
} 