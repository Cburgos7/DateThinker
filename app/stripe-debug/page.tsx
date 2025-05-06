"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function StripeDebugPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [stripeStatus, setStripeStatus] = useState<any>(null);
  const [pricingInfo, setPricingInfo] = useState<any>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  
  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch Stripe status
        const statusRes = await fetch("/api/stripe-status");
        const statusData = await statusRes.json();
        setStripeStatus(statusData);
        
        // Fetch pricing info
        const pricesRes = await fetch("/api/stripe-prices");
        const pricesData = await pricesRes.json();
        setPricingInfo(pricesData);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchData();
  }, []);
  
  const handleDirectCheckout = (type: string) => {
    const url = `/api/direct-checkout?type=${type}${userEmail ? `&email=${encodeURIComponent(userEmail)}` : ''}`;
    window.location.href = url;
  };
  
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <h1 className="text-2xl font-bold">Loading Stripe Debug Information...</h1>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-16">
      <h1 className="text-2xl font-bold mb-8">Stripe Debug Information</h1>
      
      <div className="grid gap-8">
        {/* Environment Variables */}
        <Card>
          <CardHeader>
            <CardTitle>Environment Variables</CardTitle>
            <CardDescription>Check if Stripe environment variables are properly set</CardDescription>
          </CardHeader>
          <CardContent>
            {stripeStatus?.envStatus ? (
              <div className="grid gap-2">
                {Object.entries(stripeStatus.envStatus).map(([key, value]: [string, any]) => (
                  <div key={key} className="flex justify-between">
                    <span>{key}</span>
                    <span className={value ? "text-green-500" : "text-red-500"}>
                      {value === true ? "✓" : value === false ? "✗" : value}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-red-500">Failed to retrieve environment status</p>
            )}
          </CardContent>
        </Card>
        
        {/* Stripe Connection */}
        <Card>
          <CardHeader>
            <CardTitle>Stripe Connection</CardTitle>
            <CardDescription>Check connection to Stripe API</CardDescription>
          </CardHeader>
          <CardContent>
            {stripeStatus ? (
              <div>
                <p>Status: <span className={stripeStatus.stripeStatus === "connected" ? "text-green-500" : "text-red-500"}>
                  {stripeStatus.stripeStatus}
                </span></p>
                
                {stripeStatus.account && (
                  <div className="mt-4 grid gap-2">
                    <p>Account ID: {stripeStatus.account.id}</p>
                    <p>Business Type: {stripeStatus.account.business_type}</p>
                    <p>Charges Enabled: {stripeStatus.account.charges_enabled ? "Yes" : "No"}</p>
                    <p>Payouts Enabled: {stripeStatus.account.payouts_enabled ? "Yes" : "No"}</p>
                    <p>Details Submitted: {stripeStatus.account.details_submitted ? "Yes" : "No"}</p>
                  </div>
                )}
                
                {stripeStatus.error && (
                  <p className="text-red-500 mt-2">Error: {stripeStatus.error}</p>
                )}
              </div>
            ) : (
              <p className="text-red-500">Failed to check Stripe connection</p>
            )}
          </CardContent>
        </Card>
        
        {/* Price IDs */}
        <Card>
          <CardHeader>
            <CardTitle>Price Information</CardTitle>
            <CardDescription>Check if price IDs are valid</CardDescription>
          </CardHeader>
          <CardContent>
            {pricingInfo ? (
              <div>
                <div className="mb-4">
                  <h3 className="font-medium">Price IDs:</h3>
                  <p>Monthly: {pricingInfo.prices.monthly || "Not set"}</p>
                  <p>Lifetime: {pricingInfo.prices.lifetime || "Not set"}</p>
                </div>
                
                {pricingInfo.priceDetails && pricingInfo.priceDetails.length > 0 ? (
                  <div>
                    <h3 className="font-medium mb-2">Price Details:</h3>
                    {pricingInfo.priceDetails.map((price: any) => (
                      <div key={price.id} className="mb-4 p-3 border rounded">
                        <p>ID: {price.id}</p>
                        <p>Type: {price.type}</p>
                        <p>Amount: {((price.amount || 0) / 100).toFixed(2)} {price.currency?.toUpperCase()}</p>
                        {price.recurring && (
                          <p>Interval: {price.recurring.interval}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-yellow-500">No price details available</p>
                )}
                
                {pricingInfo.error && (
                  <p className="text-red-500 mt-2">Error: {pricingInfo.error}</p>
                )}
              </div>
            ) : (
              <p className="text-red-500">Failed to retrieve pricing information</p>
            )}
          </CardContent>
        </Card>
        
        {/* Test Checkout */}
        <Card>
          <CardHeader>
            <CardTitle>Test Checkout</CardTitle>
            <CardDescription>Test the checkout process directly</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <label htmlFor="email" className="block mb-2">Email for testing:</label>
              <input
                id="email"
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="test@example.com"
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              onClick={() => handleDirectCheckout('monthly')}
              disabled={!userEmail || !pricingInfo?.prices?.monthly}
              variant="default"
            >
              Test Monthly Checkout
            </Button>
            <Button
              onClick={() => handleDirectCheckout('lifetime')}
              disabled={!userEmail || !pricingInfo?.prices?.lifetime}
              variant="outline"
            >
              Test Lifetime Checkout
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
} 