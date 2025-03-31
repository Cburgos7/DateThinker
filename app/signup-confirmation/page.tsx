import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail, Home } from "lucide-react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

export default function SignupConfirmationPage() {
  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[70vh]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Check Your Email</CardTitle>
            <CardDescription>We've sent you a confirmation link</CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="flex justify-center">
              <Mail className="h-16 w-16 text-rose-500" />
            </div>
            <p>
              Please check your email inbox for a confirmation link. You need to verify your email address before you
              can sign in.
            </p>
            <div className="bg-amber-50 p-4 rounded-md text-amber-800 text-sm mt-4">
              <p>
                <strong>Don't see the email?</strong> Check your spam folder or try signing up again if you don't
                receive it within a few minutes.
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Link href="/">
              <Button variant="outline" className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                Return to Home
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </main>
      <Footer />
    </>
  )
}

