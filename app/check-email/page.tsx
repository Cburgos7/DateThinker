"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail, Home, ArrowRight } from "lucide-react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

export default function CheckEmailPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [email, setEmail] = useState<string>("")
  
  useEffect(() => {
    // Get email from URL
    const emailParam = searchParams?.get('email')
    if (emailParam) {
      setEmail(emailParam)
    }
    
    // Redirect to home after 10 minutes (if they don't click away first)
    const redirectTimer = setTimeout(() => {
      router.push('/')
    }, 10 * 60 * 1000) // 10 minutes
    
    return () => clearTimeout(redirectTimer)
  }, [searchParams, router])
  
  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[70vh]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Check Your Email</CardTitle>
            <CardDescription>We've sent you a verification link</CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <div className="flex justify-center">
              <Mail className="h-16 w-16 text-blue-500" />
            </div>
            <div className="space-y-4">
              <p className="text-lg">
                Please check your email inbox at:
              </p>
              <p className="font-medium text-lg text-blue-600">
                {email}
              </p>
              <p className="text-gray-600">
                Click the verification link we sent to activate your account and sign in.
              </p>
              <p className="text-sm text-gray-500 mt-4">
                If you don't see the email, check your spam folder or try signing in again.
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center gap-4">
            <Link href="/">
              <Button variant="outline" className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                Go to Home
              </Button>
            </Link>
            <Link href="/login">
              <Button className="bg-gradient-to-r from-rose-500 to-purple-500 hover:opacity-90 flex items-center gap-2">
                Return to Sign In
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </main>
      <Footer />
    </>
  )
} 