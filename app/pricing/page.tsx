"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { CheckoutButton } from "./client-checkout-button";
import { useAuth } from "@/contexts/auth-context";

export default function PricingPage() {
  // Get user from auth context
  const { user } = useAuth();
  const [subscriptionStatus, setSubscriptionStatus] = useState("free");
  const [isLoading, setIsLoading] = useState(true);
  
  // Fetch user subscription status
  useEffect(() => {
    async function fetchSubscriptionStatus() {
      if (!user) {
        setIsLoading(false);
        return;
      }
      
      try {
        const response = await fetch("/api/auth/subscription-status");
        const data = await response.json();
        
        if (data.status) {
          setSubscriptionStatus(data.status);
        }
      } catch (error) {
        console.error("Error fetching subscription status:", error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchSubscriptionStatus();
  }, [user]);

  // Determine if user is authenticated - they should be if they're on this page
  const isAuthenticated = !!user;

  return (
    <>
      <Header />
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
              {isAuthenticated ? (
                <CheckoutButton
                  type="monthly"
                  disabled={isLoading || subscriptionStatus === "premium" || subscriptionStatus === "lifetime"}
                  className="w-full bg-gradient-to-r from-purple-600 to-rose-600 hover:from-purple-700 hover:to-rose-700"
                >
                  {isLoading ? "Loading..." :
                    subscriptionStatus === "premium"
                      ? "Current Plan"
                      : subscriptionStatus === "lifetime"
                        ? "You have Lifetime"
                        : "Subscribe Now"}
                </CheckoutButton>
              ) : (
                <Button
                  onClick={() => window.location.href = '/login?redirectTo=/pricing'}
                  className="w-full bg-gradient-to-r from-purple-600 to-rose-600 hover:from-purple-700 hover:to-rose-700"
                >
                  Login to Subscribe
                </Button>
              )}
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
              {isAuthenticated ? (
                <CheckoutButton
                  type="lifetime"
                  disabled={isLoading || subscriptionStatus === "lifetime"}
                  className="w-full border-rose-500 text-rose-500 hover:bg-rose-50"
                >
                  {isLoading ? "Loading..." :
                    subscriptionStatus === "lifetime"
                      ? "Current Plan"
                      : "Get Lifetime Access"}
                </CheckoutButton>
              ) : (
                <Button
                  onClick={() => window.location.href = '/login?redirectTo=/pricing'}
                  variant="outline"
                  className="w-full border-rose-500 text-rose-500 hover:bg-rose-50"
                >
                  Login to Subscribe
                </Button>
              )}
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

        <div className="mt-8 text-center">
          <div className="flex flex-col space-y-2 justify-center items-center">
            <p className="text-sm text-muted-foreground">Having trouble with the checkout? Try our direct checkout options:</p>
            <div className="flex space-x-4">
              <a 
                href={`/api/direct-checkout?type=monthly${user?.email ? `&email=${encodeURIComponent(user.email)}` : ''}`}
                className="text-sm text-blue-500 hover:underline"
              >
                Direct Monthly Checkout
              </a>
              <a 
                href={`/api/direct-checkout?type=lifetime${user?.email ? `&email=${encodeURIComponent(user.email)}` : ''}`}
                className="text-sm text-rose-500 hover:underline"
              >
                Direct Lifetime Checkout
              </a>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

