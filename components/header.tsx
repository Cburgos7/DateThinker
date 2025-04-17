"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from "next/link"
import { 
  Calendar, 
  Heart, 
  Info, 
  DollarSign, 
  Gift, 
  Settings, 
  LogOut,
  User
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from '@/contexts/auth-context'

interface HeaderProps {
  isLoggedIn?: boolean;
  userName?: string;
  avatarUrl?: string;
}

export function Header({ isLoggedIn, userName, avatarUrl }: HeaderProps = {}) {
  const router = useRouter()
  const { user, signOut } = useAuth()
  
  // Determine if we should use props or context
  // For SSR pages, they'll pass props
  // For client pages, we'll use the context
  const useProvidedProps = isLoggedIn !== undefined
  
  // If props are provided, use those, otherwise use auth context
  const displayUser = useProvidedProps ? isLoggedIn : !!user
  const displayName = useProvidedProps 
    ? userName || '' 
    : user?.email || user?.user_metadata?.name || ''
  
  // Log the auth state source and values for debugging
  useEffect(() => {
    console.log(
      useProvidedProps 
        ? "Header: Using provided props" 
        : "Header: Using auth context",
      "displayUser:", displayUser, 
      "displayName:", displayName
    )
  }, [useProvidedProps, displayUser, displayName])

  const handleSignOut = async () => {
    console.log("Header: Signing out")
    await signOut()
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="hidden font-bold sm:inline-block">
          DateThinker
            </span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <nav className="flex items-center space-x-6">
            <Link href={displayUser ? "/make-date" : "/login?action=make-date"} className="flex items-center space-x-1 text-sm font-medium hover:text-rose-500">
              <Calendar className="h-4 w-4" />
              <span>Make a Date</span>
            </Link>
            <Link href={displayUser ? "/my-dates" : "/login?redirectedFrom=/my-dates"} className="flex items-center space-x-1 text-sm font-medium hover:text-rose-500">
              <Heart className="h-4 w-4" />
              <span>My Dates</span>
            </Link>
            <Link href="/about" className="flex items-center space-x-1 text-sm font-medium hover:text-rose-500">
              <Info className="h-4 w-4" />
              <span>About</span>
            </Link>
            <Link href="/pricing" className="flex items-center space-x-1 text-sm font-medium hover:text-rose-500">
              <DollarSign className="h-4 w-4" />
              <span>Pricing</span>
            </Link>
            <Link href="/donate" className="flex items-center space-x-1 text-sm font-medium hover:text-rose-500">
              <Gift className="h-4 w-4" />
              <span>Donate</span>
            </Link>
          </nav>
          <div className="flex items-center">
            {displayUser ? (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="flex items-center space-x-1">
                  <User className="h-4 w-4" />
                    <span>{displayName}</span>
                  </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => router.push('/settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/login')}
              >
                Sign in
              </Button>
          )}
          </div>
        </div>
      </div>
    </header>
  )
}

