import { redirect } from "next/navigation"
import { AuthForm } from "@/components/auth-form"
import { supabase } from "@/lib/supabase"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  // Check if user is already logged in
  let isLoggedIn = false

  if (supabase) {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    isLoggedIn = !!session

    console.log("Login page - User session check:", isLoggedIn ? "Logged in" : "Not logged in")
  }

  // If already logged in, redirect to home or the requested page
  if (isLoggedIn) {
    const redirectTo = typeof searchParams.redirect === "string" ? searchParams.redirect : "/"
    console.log("User already logged in, redirecting to:", redirectTo)
    redirect(redirectTo)
  }

  const redirectTo = typeof searchParams.redirect === "string" ? searchParams.redirect : "/"

  return (
    <>
      <Header />
      <div className="container mx-auto px-4 py-8 md:py-16 flex items-center justify-center min-h-[calc(100vh-140px)]">
        <div className="w-full max-w-md">
          <h1 className="text-2xl md:text-3xl font-bold text-center mb-6 md:mb-8 bg-clip-text text-transparent bg-gradient-to-r from-rose-500 to-purple-500">
            Welcome to DateThinker
          </h1>
          <AuthForm redirectTo={redirectTo} />
        </div>
      </div>
      <Footer />
    </>
  )
}

