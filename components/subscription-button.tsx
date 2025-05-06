"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
// Remove this import as we're no longer using server actions directly
// import { createMonthlySubscription, createLifetimeMembership } from "@/app/actions/subscription"

interface SubscriptionButtonProps {
  type: 'monthly' | 'lifetime';
  userId: string;
  userEmail: string;
  disabled: boolean;
  className?: string;
  children: React.ReactNode;
}

export function SubscriptionButton({ 
  type, 
  userId, 
  userEmail, 
  disabled, 
  className, 
  children 
}: SubscriptionButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  const handleClick = async () => {
    setIsLoading(true);
    try {
      // Use the API route that worked for the monthly subscription
      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          userEmail,
          type: type === 'lifetime' ? 'lifetime' : 'subscription',
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }
      
      if (data.url) {
        console.log('Redirecting to Stripe checkout:', data.url);
        window.location.href = data.url;
        return;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Unable to process your request. Please try again or use the direct checkout link below.');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Button
      onClick={handleClick}
      disabled={disabled || isLoading}
      className={className}
      variant={type === 'lifetime' ? 'outline' : 'default'}
    >
      {isLoading ? 'Loading...' : children}
    </Button>
  );
} 