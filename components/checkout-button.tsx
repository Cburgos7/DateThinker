"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth-context";

interface CheckoutButtonProps {
  type: "monthly" | "lifetime";
  userId?: string;
  userEmail?: string;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function CheckoutButton({
  type,
  userId: propUserId,
  userEmail: propUserEmail,
  disabled = false,
  className,
  children,
}: CheckoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [manualEmail, setManualEmail] = useState("");
  
  // Get user info from auth context
  const { user } = useAuth();
  
  // Prioritize context user over props
  const userId = user?.id || propUserId || "";
  const userEmail = user?.email || propUserEmail || "";

  const handleCheckout = async (emailOverride?: string) => {
    setIsLoading(true);
    
    // Use the email override if provided, otherwise use the determined email
    const finalEmail = emailOverride || userEmail;
    const finalUserId = userId || "manual-checkout";
    
    // Debug the values
    console.log("Checkout values:", { userId: finalUserId, userEmail: finalEmail, type });
    
    // Check if email is still missing
    if (!finalEmail) {
      console.error("Missing email information");
      toast.error("Email address is required for checkout");
      setIsLoading(false);
      return;
    }
    
    try {
      const response = await fetch("/api/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: finalUserId,
          userEmail: finalEmail,
          type,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Failed to start checkout process. Please try again.");
      setIsLoading(false);
    }
  };

  const handleInitialClick = () => {
    // Debug the values
    console.log("Initial checkout click with values:", { userId, userEmail, type });
    
    // If user info is missing, show email dialog
    if (!userId || !userEmail) {
      setShowEmailDialog(true);
    } else {
      handleCheckout();
    }
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualEmail || !manualEmail.includes('@')) {
      toast.error("Please enter a valid email address");
      return;
    }
    setShowEmailDialog(false);
    handleCheckout(manualEmail);
  };

  // If we're on a direct checkout, redirect to the direct checkout endpoint
  const handleDirectCheckout = () => {
    const url = `/api/direct-checkout?type=${type}${userEmail ? `&email=${encodeURIComponent(userEmail)}` : ''}`;
    window.location.href = url;
  };

  return (
    <>
      <Button 
        onClick={handleInitialClick}
        disabled={disabled || isLoading}
        className={className}
        variant={type === "lifetime" ? "outline" : "default"}
      >
        {isLoading ? "Loading..." : children}
      </Button>
      
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter your email address</DialogTitle>
            <DialogDescription>
              We need your email address to set up your {type === "lifetime" ? "lifetime" : "monthly"} plan.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEmailSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
              
              <div className="text-sm text-muted-foreground">
                <p>If you're having trouble with checkout, try our:</p>
                <button 
                  type="button"
                  className="text-blue-500 hover:underline mt-1"
                  onClick={handleDirectCheckout}
                >
                  Direct {type === "lifetime" ? "Lifetime" : "Monthly"} Checkout
                </button>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEmailDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">Continue to Checkout</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
} 