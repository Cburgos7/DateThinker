"use client"

import { createContext, useContext, useState } from "react"

type AuthContextType = {
  user: any | null
  loading: boolean
  authStatus: 'initializing' | 'authenticated' | 'unauthenticated' | 'error'
  lastAuthError: string | null
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: false,
  authStatus: 'unauthenticated',
  lastAuthError: null
})

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)
  const [authStatus, setAuthStatus] = useState<'initializing' | 'authenticated' | 'unauthenticated' | 'error'>('unauthenticated')
  const [lastAuthError, setLastAuthError] = useState<string | null>(null)

  return (
    <AuthContext.Provider value={{ user, loading, authStatus, lastAuthError }}>
      {children}
    </AuthContext.Provider>
  )
} 