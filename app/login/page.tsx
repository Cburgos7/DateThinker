"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { supabase } from "@/lib/supabase"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/use-toast"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

const formSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  password: z.string().min(6, {
    message: "Password must be at least 6 characters.",
  }),
})

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams?.get('redirectTo') || null
  const [isLoading, setIsLoading] = useState(false)
  const [storedRedirect, setStoredRedirect] = useState<string | null>(null)
  
  useEffect(() => {
    // Check for stored redirect from localStorage
    const redirect = typeof window !== 'undefined' ? localStorage.getItem('redirectAfterLogin') : null;
    if (redirect) {
      setStoredRedirect(redirect);
    }
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)
    
    try {
      if (!supabase) {
        throw new Error("Supabase client not initialized");
      }
      
      // Authenticate with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      })

      if (error) {
        console.error("Sign in error:", error)
        toast({
          title: "Login failed",
          description: error.message,
          variant: "destructive",
        })
        return
      }

      // Clear any stored redirects
      if (typeof window !== 'undefined') {
        localStorage.removeItem('redirectAfterLogin');
      }
      
      // Handle redirect after successful login
      // Priority: 1) URL param, 2) localStorage redirect, 3) default dashboard
      if (redirectTo) {
        router.push(redirectTo)
      } else if (storedRedirect) {
        router.push(storedRedirect)
      } else {
        router.push("/my-dates")
      }
      
      toast({
        title: "Login successful",
        description: "Welcome back!",
      })
    } catch (error) {
      console.error("Error during sign in:", error)
      toast({
        title: "Something went wrong",
        description: "Please try again later.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Header />
      <div className="container max-w-md mx-auto py-10">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Login</h1>
            <p className="text-gray-500">Enter your credentials to log in</p>
          </div>
          
          {storedRedirect && storedRedirect.includes('/shared/') && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-blue-800 text-sm">
                Login to view and accept the shared date plan
              </p>
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="you@example.com" 
                        {...field} 
                        autoComplete="email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="••••••••" 
                        type="password" 
                        {...field} 
                        autoComplete="current-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Logging in..." : "Login"}
              </Button>
            </form>
          </Form>

          <div className="text-center">
            <p className="text-sm text-gray-500">
              Don&apos;t have an account?{" "}
              <Link href="/auth" className="text-blue-600 hover:underline">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}

