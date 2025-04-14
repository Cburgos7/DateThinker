import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, LogIn, Home } from "lucide-react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

export default function ConfirmationSuccessPage() {
  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[70vh]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Email Confirmed!</CardTitle>
            <CardDescription>Your account has been successfully verified</CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="flex justify-center">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <p>
              Thank you for confirming your email address. Your account is now active and you can sign in to access all
              features.
            </p>
          </CardContent>
          <CardFooter className="flex justify-center gap-4">
            <Link href="/auth">
              <Button className="bg-gradient-to-r from-rose-500 to-purple-500 hover:opacity-90 flex items-center gap-2">
                <LogIn className="h-4 w-4" />
                Sign In
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                Go to Home
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </main>
      <Footer />
    </>
  )
}

