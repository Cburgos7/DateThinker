"use client"

import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/supabase"
import { cancelSubscription } from "@/app/actions/subscription"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle } from "lucide-react"
import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"

export default function AccountPage() {
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const searchParams = useSearchParams()
  const success = searchParams.get("success")

  useEffect(() => {
    async function fetchUser() {
      try {
        const currentUser = await getCurrentUser()
        if (!currentUser) {
          redirect("/login?redirect=/account")
        }
        setUser(currentUser)
      } catch (error) {
        console.error("Error fetching user:", error)
        redirect("/login?redirect=/account")
      } finally {
        setIsLoading(false)
      }
    }

    fetchUser()
  }, [])

  if (isLoading) {
    return <div>Loading...</div>
  }

  const subscriptionStatus = user.subscription_status || "free"
  const subscriptionExpiry = user.subscription_expiry ? new Date(user.subscription_expiry).toLocaleDateString() : null

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-3xl mx-auto">
        {success && (
          <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
            <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
            <p className="text-green-700">
              {success === "subscription"
                ? "Your subscription was successfully activated!"
                : "Your lifetime membership was successfully activated!"}
            </p>
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
                  <p>{user.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Name</p>
                  <p>{user.full_name || "Not set"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Account Created</p>
                  <p>{user.created_at ? new Date(user.created_at).toLocaleDateString() : "Not set"}</p>
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
                <Button variant="destructive" onClick={() => cancelSubscription()}>
                  Cancel Subscription
                </Button>
              )}
              {subscriptionStatus === "free" && (
                <Button variant="default" className="bg-gradient-to-r from-rose-500 to-purple-500">
                  Upgrade to Premium
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}

