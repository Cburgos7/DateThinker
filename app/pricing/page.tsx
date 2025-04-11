import { getCurrentUser, getUserWithSubscription } from "@/lib/supabase"
import { createMonthlySubscription, createLifetimeMembership } from "@/app/actions/subscription"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Check } from "lucide-react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

export default async function PricingPage() {
  const user = await getCurrentUser()
  const userWithSubscription = await getUserWithSubscription()
  const isAuthenticated = !!user
  const subscriptionStatus = userWithSubscription?.subscription_status || "free"

  return (
    <>
      <Header 
        isLoggedIn={isAuthenticated} 
        userName={user?.user_metadata?.full_name || user?.email || undefined}
        avatarUrl={user?.user_metadata?.avatar_url || undefined}
      />
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-rose-500 to-purple-500">
            DateThinker Premium
          </h1>
          <p className="mt-4 text-xl text-muted-foreground max-w-2xl mx-auto">
            Unlock premium features and enhance your date planning experience
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Free Plan */}
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="text-2xl">Free</CardTitle>
              <div className="mt-4">
                <span className="text-4xl font-bold">$0</span>
                <span className="text-muted-foreground ml-1">/forever</span>
              </div>
              <CardDescription className="mt-2">Basic date planning for casual users</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <ul className="space-y-3">
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-2" />
                  <span>Basic city search</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-2" />
                  <span>Restaurant recommendations</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-2" />
                  <span>Limited refreshes</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-2" />
                  <span>Ad-supported experience</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full" disabled={true}>
                Current Plan
              </Button>
            </CardFooter>
          </Card>

          {/* Monthly Plan */}
          <Card className="flex flex-col border-rose-200 shadow-lg relative">
            <div className="absolute top-0 right-0 bg-rose-500 text-white px-3 py-1 rounded-bl-lg rounded-tr-lg text-sm font-medium">
              Popular
            </div>
            <CardHeader>
              <CardTitle className="text-2xl">Premium</CardTitle>
              <div className="mt-4">
                <span className="text-4xl font-bold">$4.99</span>
                <span className="text-muted-foreground ml-1">/month</span>
              </div>
              <CardDescription className="mt-2">Enhanced date planning for regular users</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <ul className="space-y-3">
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-2" />
                  <span>Everything in Free</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-2" />
                  <span>Ad-free experience</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-2" />
                  <span>Unlimited refreshes</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-2" />
                  <span>Save favorite date ideas</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-2" />
                  <span>Detailed venue information</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-2" />
                  <span>Priority customer support</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <form action={createMonthlySubscription} className="w-full">
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-rose-500 to-purple-500 hover:opacity-90"
                  disabled={!isAuthenticated || subscriptionStatus === "premium" || subscriptionStatus === "lifetime"}
                >
                  {!isAuthenticated
                    ? "Sign in to Subscribe"
                    : subscriptionStatus === "premium"
                      ? "Current Plan"
                      : subscriptionStatus === "lifetime"
                        ? "You have Lifetime"
                        : "Subscribe Now"}
                </Button>
              </form>
            </CardFooter>
          </Card>

          {/* Lifetime Plan */}
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="text-2xl">Lifetime</CardTitle>
              <div className="mt-4">
                <span className="text-4xl font-bold">$99</span>
                <span className="text-muted-foreground ml-1">/once</span>
              </div>
              <CardDescription className="mt-2">One-time payment for lifetime access</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <ul className="space-y-3">
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-2" />
                  <span>Everything in Premium</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-2" />
                  <span>Never pay again</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-2" />
                  <span>Early access to new features</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-2" />
                  <span>Exclusive date planning guides</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-2" />
                  <span>VIP customer support</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <form action={createLifetimeMembership} className="w-full">
                <Button
                  type="submit"
                  variant="outline"
                  className="w-full border-rose-500 text-rose-500 hover:bg-rose-50"
                  disabled={!isAuthenticated || subscriptionStatus === "lifetime"}
                >
                  {!isAuthenticated
                    ? "Sign in to Purchase"
                    : subscriptionStatus === "lifetime"
                      ? "Current Plan"
                      : "Get Lifetime Access"}
                </Button>
              </form>
            </CardFooter>
          </Card>
        </div>

        <div className="mt-16 text-center max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold mb-4">Frequently Asked Questions</h2>
          <div className="space-y-6 text-left">
            <div>
              <h3 className="text-lg font-medium">Can I cancel my subscription?</h3>
              <p className="text-muted-foreground mt-1">
                Yes, you can cancel your subscription at any time. You'll continue to have access until the end of your
                billing period.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium">What payment methods do you accept?</h3>
              <p className="text-muted-foreground mt-1">
                We accept all major credit cards, including Visa, Mastercard, American Express, and Discover.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium">Is my payment information secure?</h3>
              <p className="text-muted-foreground mt-1">
                Yes, all payments are processed securely through Stripe. We never store your credit card information on
                our servers.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium">What's included in the Lifetime plan?</h3>
              <p className="text-muted-foreground mt-1">
                The Lifetime plan includes all current and future premium features with a one-time payment. You'll never
                have to pay again.
              </p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}

