"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { User, LogOut, AlertCircle } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface HeaderProps {
  isLoggedIn?: boolean
  userName?: string
  avatarUrl?: string
}

export function Header({ isLoggedIn = false, userName, avatarUrl }: HeaderProps) {
  const [authChecked, setAuthChecked] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(isLoggedIn)
  const [userData, setUserData] = useState({
    name: userName || "",
    avatar: avatarUrl || "",
  })
  const [authError, setAuthError] = useState<string | null>(null)

  // Check authentication status on mount and when props change
  useEffect(() => {
    async function checkAuth() {
      try {
        setAuthError(null)

        // First use the props if they're provided
        if (isLoggedIn) {
          console.log("Header: Using provided auth props - user is logged in")
          setIsAuthenticated(true)
          setUserData({
            name: userName || "",
            avatar: avatarUrl || "",
          })
          setAuthChecked(true)
          return
        }

        // If props don't indicate logged in, check with Supabase directly
        if (!supabase) {
          console.error("Header: Supabase client not initialized")
          setAuthError("Supabase client not initialized")
          setAuthChecked(true)
          return
        }

        console.log("Header: Checking auth with Supabase directly")
        const { data, error } = await supabase.auth.getSession()

        if (error) {
          console.error("Header: Error getting session:", error)
          setAuthError(error.message)
          setAuthChecked(true)
          return
        }

        if (data.session) {
          console.log("Header: Session found, getting user details")
          setIsAuthenticated(true)

          // Get user details from session
          const user = data.session.user
          const name = user.email?.split("@")[0] || "User"

          setUserData({
            name,
            avatar: "",
          })
        } else {
          console.log("Header: No user session found")
          setIsAuthenticated(false)
        }
      } catch (error) {
        console.error("Error checking auth in header:", error)
        setAuthError(error instanceof Error ? error.message : "Unknown error")
        setIsAuthenticated(isLoggedIn) // Fall back to props
      } finally {
        setAuthChecked(true)
      }
    }

    checkAuth()

    // Set up auth state change listener
    if (supabase) {
      const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
        console.log("Header: Auth state changed:", event, session ? "Has session" : "No session")

        if (event === "SIGNED_IN" && session) {
          setIsAuthenticated(true)
          const user = session.user
          const name = user.email?.split("@")[0] || "User"

          setUserData({
            name,
            avatar: "",
          })
        } else if (event === "SIGNED_OUT") {
          setIsAuthenticated(false)
          setUserData({ name: "", avatar: "" })
        }
      })

      return () => {
        authListener.subscription.unsubscribe()
      }
    }
  }, [isLoggedIn, userName, avatarUrl])

  const handleSignOut = async () => {
    try {
      console.log("Signing out...")
      if (!supabase) {
        console.error("Supabase client not initialized")
        return
      }

      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error("Error signing out:", error)
        setAuthError(error.message)
      } else {
        console.log("Sign out successful")
        setIsAuthenticated(false)
        setUserData({ name: "", avatar: "" })
        window.location.href = "/"
      }
    } catch (err) {
      console.error("Unexpected error during sign out:", err)
      setAuthError(err instanceof Error ? err.message : "Unknown error during sign out")
    }
  }

  return (
    <header className="py-2 px-4 border-b bg-white relative z-10">
      <div className="container mx-auto flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-4">
        <Link href="/" className="text-xl font-bold text-rose-500 hover:underline">
          DateThinker
        </Link>

        <div className="flex items-center gap-4 sm:gap-8 py-1 sm:py-2">
          <Link href="/about" className="text-sm text-gray-600 hover:text-rose-500 hover:underline pointer-events-auto">
            About
          </Link>
          <Link
            href="/pricing"
            className="text-sm text-gray-600 hover:text-rose-500 hover:underline pointer-events-auto"
          >
            Pricing
          </Link>
          <Link
            href="/donate"
            className="text-sm text-gray-600 hover:text-rose-500 hover:underline pointer-events-auto"
          >
            Donate
          </Link>
        </div>

        <div>
          {!authChecked ? (
            // Show loading state while checking auth
            <div className="px-4 py-2 border rounded bg-gray-50">
              <div className="h-4 w-20 bg-gray-200 animate-pulse rounded"></div>
            </div>
          ) : isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 px-4 py-2 border rounded hover:bg-gray-100">
                {userData.avatar ? (
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={userData.avatar} alt={userData.name || "User"} />
                    <AvatarFallback>{userData.name?.charAt(0) || "U"}</AvatarFallback>
                  </Avatar>
                ) : (
                  <User className="h-4 w-4" />
                )}
                <span>{userData.name || "Account"}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/account">Account Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/favorites">Favorites</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/login" className="px-4 py-2 border rounded hover:bg-gray-100 pointer-events-auto">
              Login / Sign Up
            </Link>
          )}
        </div>
      </div>

      {/* Auth error message */}
      {authError && (
        <div className="bg-red-50 p-2 text-sm flex items-center justify-center">
          <AlertCircle className="h-4 w-4 text-red-500 mr-1" />
          <span className="text-red-600">Auth error: {authError}</span>
        </div>
      )}
    </header>
  )
}

