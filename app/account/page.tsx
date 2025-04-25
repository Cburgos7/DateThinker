"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle } from "lucide-react"
import { cancelSubscription } from "@/app/actions/subscription"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

export default function AccountPage() {
  const [user, setUser] = useState<any>(null)
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>("free")
  const [subscriptionExpiry, setSubscriptionExpiry] = useState<string | null>(null)
  const [createdAt, setCreatedAt] = useState<string | null>(null)
  const [fullName, setFullName] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const searchParams = useSearchParams()
  const success = searchParams?.get("success")
  const supabase = createClientComponentClient()

  useEffect(() => {
    async function fetchUserData() {
      try {
        // Middleware already verified authentication,
        // so we just need to attempt to get user data
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
        
        if (user?.id) {
          // Get profile data
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single()
          
          if (profile) {
            setSubscriptionStatus(profile.subscription_status || "free")
            setSubscriptionExpiry(profile.subscription_expiry ? 
              new Date(profile.subscription_expiry).toLocaleDateString() : null)
            setCreatedAt(profile.created_at ? 
              new Date(profile.created_at).toLocaleDateString() : null)
            setFullName(profile.full_name || null)
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error)
        // Don't redirect, just show fallback UI
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserData()
  }, [supabase])

  if (isLoading) {
    return (
      <>
        <Header />
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-3xl font-bold mb-8">Loading your account...</h1>
            <div className="animate-pulse h-8 w-24 bg-gray-200 rounded-md mx-auto"></div>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Header />
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto">
          {success && (
            <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center mb-3">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                <span>
                  {success === "subscription" 
                    ? "Your subscription has been activated successfully!" 
                    : "Your lifetime membership has been activated successfully!"}
                </span>
              </div>
              <div className="flex justify-end">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.location.href = '/'}
                >
                  Back to Home
                </Button>
              </div>
            </div>
          )}

          <h1 className="text-3xl font-bold mb-8">Your Account</h1>

          <div className="grid gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Manage your account details</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Email</p>
                    <p>{user?.email || "Not available"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Name</p>
                    <p>{user?.user_metadata?.full_name || fullName || "Not set"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Account Created</p>
                    <p>{createdAt || "Not available"}</p>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline">Edit Profile</Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Subscription</CardTitle>
                  <Badge
                    className={
                      subscriptionStatus === "premium"
                        ? "bg-purple-500"
                        : subscriptionStatus === "lifetime"
                          ? "bg-rose-500"
                          : "bg-gray-500"
                    }
                  >
                    {subscriptionStatus === "premium"
                      ? "Premium"
                      : subscriptionStatus === "lifetime"
                        ? "Lifetime"
                        : "Free"}
                  </Badge>
                </div>
                <CardDescription>Manage your subscription</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Status</p>
                    <p className="capitalize">{subscriptionStatus}</p>
                  </div>
                  {subscriptionExpiry && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Expiry Date</p>
                      <p>{subscriptionExpiry}</p>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter>
                {subscriptionStatus === "premium" && (
                  <Button variant="destructive" onClick={async () => {
                    try {
                      await cancelSubscription();
                      alert("Subscription canceled. You'll have access until the end of your billing period.");
                      window.location.reload();
                    } catch (error) {
                      console.error("Error canceling subscription:", error);
                      alert("Failed to cancel subscription. Please try again later.");
                    }
                  }}>
                    Cancel Subscription
                  </Button>
                )}
                {subscriptionStatus === "free" && (
                  <Button 
                    variant="default" 
                    className="bg-gradient-to-r from-rose-500 to-purple-500"
                    onClick={() => window.location.href = '/pricing'}
                  >
                    Upgrade to Premium
                  </Button>
                )}
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}

