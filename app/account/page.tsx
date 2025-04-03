"use client"

import { useEffect, useState } from "react"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/supabase"
import { cancelSubscription } from "@/app/actions/subscription"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle } from "lucide-react"

export default function AccountPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

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

  const success = searchParams.success
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
              <CardDescription>Manage your subscription plan</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {subscriptionStatus === "free" && (
                  <p>You are currently on the free plan. Upgrade to Premium for additional features.</p>
                )}

                {subscriptionStatus === "premium" && (
                  <>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Plan</p>
                      <p>Premium Monthly ($4.99/month)</p>
                    </div>
                    {subscriptionExpiry && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Next Billing Date</p>
                        <p>{subscriptionExpiry}</p>
                      </div>
                    )}
                  </>
                )}

                {subscriptionStatus === "lifetime" && (
                  <p>You have lifetime access to all premium features. Thank you for your support!</p>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col items-start space-y-2 sm:flex-row sm:space-x-2 sm:space-y-0">
              {subscriptionStatus === "free" && (
                <Button
                  className="w-full sm:w-auto bg-gradient-to-r from-rose-500 to-purple-500 hover:opacity-90"
                  onClick={() => redirect("/pricing")}
                >
                  Upgrade to Premium
                </Button>
              )}

              {subscriptionStatus === "premium" && (
                <form action={async (formData) => {
                  await cancelSubscription();
                }}>
                  <Button
                    type="submit"
                    variant="outline"
                    className="w-full sm:w-auto text-red-500 border-red-200 hover:bg-red-50"
                  >
                    Cancel Subscription
                  </Button>
                </form>
              )}

              {subscriptionStatus !== "lifetime" && (
                <Button variant="outline" className="w-full sm:w-auto" onClick={() => redirect("/pricing")}>
                  View Plans
                </Button>
              )}
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Billing History</CardTitle>
              <CardDescription>View your past payments</CardDescription>
            </CardHeader>
            <CardContent>
              {subscriptionStatus === "free" ? (
                <div className="flex items-center justify-center py-6">
                  <p className="text-muted-foreground">No billing history available</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="border rounded-lg divide-y">
                    <div className="grid grid-cols-3 p-4 font-medium">
                      <div>Date</div>
                      <div>Description</div>
                      <div>Amount</div>
                    </div>
                    {subscriptionStatus === "lifetime" ? (
                      <div className="grid grid-cols-3 p-4">
                        <div>{new Date().toLocaleDateString()}</div>
                        <div>Lifetime Membership</div>
                        <div>$99.00</div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 p-4">
                        <div>{new Date().toLocaleDateString()}</div>
                        <div>Monthly Subscription</div>
                        <div>$4.99</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

