"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { LogIn } from "lucide-react"

export function SignInButton() {
  const router = useRouter()
  
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    router.push("/login")
  }
  
  return (
    <Button 
      onClick={handleClick}
      className="bg-gradient-to-r from-rose-500 to-purple-500 hover:opacity-90 flex items-center gap-2"
    >
      <LogIn className="h-4 w-4" />
      Sign In
    </Button>
  )
} 