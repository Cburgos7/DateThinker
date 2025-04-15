"use client"

import { useEffect, useState, useRef } from "react"
import { 
  setBypassFlags, 
  clearBypassFlags,
  detectRedirectLoop, 
  navigateWithBypass,
  checkDOMForAuthentication,
  checkSupabaseAuth
} from "@/lib/auth-utils"

interface AuthCheckProps {
  /**
   * Where to redirect the user if they are authenticated
   */
  redirectTo?: string;
  
  /**
   * Whether to show an indicator while checking
   */
  showIndicator?: boolean;
  
  /**
   * Callback when authentication is found
   */
  onAuthenticated?: (isAuthenticated: boolean) => void;
  
  /**
   * Callback when a redirect loop is detected
   */
  onRedirectLoop?: () => void;
  
  /**
   * Whether to perform an immediate redirect (true) or just check (false)
   */
  performRedirect?: boolean;
  
  /**
   * Children to render after check completes (when not redirecting)
   */
  children?: React.ReactNode;
}

/**
 * Component to check auth status and optionally redirect authenticated users
 */
export function AuthCheck({
  redirectTo = "/",
  showIndicator = true,
  onAuthenticated,
  onRedirectLoop,
  performRedirect = true,
  children
}: AuthCheckProps) {
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [redirectLoopDetected, setRedirectLoopDetected] = useState(false)
  const redirectAttemptedRef = useRef(false)
  
  // Main auth check effect
  useEffect(() => {
    console.log(`AuthCheck: Starting auth check${redirectTo ? ` with redirect to ${redirectTo}` : ''}`);
    
    // Check for redirect loops
    if (detectRedirectLoop()) {
      console.log("AuthCheck: Redirect loop detected");
      setRedirectLoopDetected(true);
      setIsCheckingAuth(false);
      
      if (onRedirectLoop) {
        onRedirectLoop();
      }
      return;
    }
    
    // Set a timeout to prevent infinite checking
    const timeoutId = setTimeout(() => {
      console.log("AuthCheck: Check timed out after 2 seconds");
      setIsCheckingAuth(false);
    }, 2000);
    
    // Check and handle authentication
    const checkAuth = async () => {
      try {
        // First try DOM-based detection which is fastest
        if (checkDOMForAuthentication()) {
          console.log("AuthCheck: User authenticated via DOM check");
          setIsAuthenticated(true);
          setIsCheckingAuth(false);
          
          if (onAuthenticated) {
            onAuthenticated(true);
          }
          
          // Redirect if needed
          if (performRedirect && redirectTo && !redirectAttemptedRef.current) {
            console.log(`AuthCheck: Redirecting to ${redirectTo}`);
            redirectAttemptedRef.current = true;
            navigateWithBypass(redirectTo);
          }
          
          clearTimeout(timeoutId);
          return;
        }
        
        // Then try with Supabase client
        const user = await checkSupabaseAuth();
        
        if (user) {
          console.log("AuthCheck: User authenticated via Supabase check");
          setIsAuthenticated(true);
          setIsCheckingAuth(false);
          
          if (onAuthenticated) {
            onAuthenticated(true);
          }
          
          // Redirect if needed
          if (performRedirect && redirectTo && !redirectAttemptedRef.current) {
            console.log(`AuthCheck: Redirecting to ${redirectTo}`);
            redirectAttemptedRef.current = true;
            navigateWithBypass(redirectTo);
          }
          
          clearTimeout(timeoutId);
          return;
        }
        
        // No authentication found
        console.log("AuthCheck: User not authenticated");
        setIsAuthenticated(false);
        setIsCheckingAuth(false);
        
        if (onAuthenticated) {
          onAuthenticated(false);
        }
      } catch (error) {
        console.error("AuthCheck: Error checking authentication:", error);
        setIsAuthenticated(false);
        setIsCheckingAuth(false);
      } finally {
        clearTimeout(timeoutId);
      }
    };
    
    // Start the check
    checkAuth();
    
    return () => clearTimeout(timeoutId);
  }, [redirectTo, performRedirect, onAuthenticated, onRedirectLoop]);

  // If we're checking auth and should show an indicator
  if (isCheckingAuth && showIndicator) {
    return (
      <div className="inline-flex items-center">
        <div className="w-4 h-4 rounded-full bg-rose-500 animate-pulse mr-2"></div>
        <span className="text-sm text-gray-500">Checking authentication...</span>
      </div>
    );
  }
  
  // If we detected a redirect loop
  if (redirectLoopDetected && showIndicator) {
    return (
      <div className="inline-flex items-center">
        <div className="w-4 h-4 rounded-full bg-yellow-500 mr-2"></div>
        <span className="text-sm text-yellow-700">Redirect loop detected</span>
        {redirectTo && (
          <a 
            href={redirectTo}
            className="ml-2 text-sm text-rose-500 underline"
            onClick={() => setBypassFlags()}
          >
            Continue anyway
          </a>
        )}
      </div>
    );
  }
  
  // If auth check is complete and we're not redirecting
  return <>{children}</>;
}

/**
 * Component that only renders children if user is authenticated
 */
export function RequireAuth({
  fallback,
  children
}: {
  fallback?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  
  if (isCheckingAuth) {
    return (
      <AuthCheck
        performRedirect={false}
        showIndicator={true}
        onAuthenticated={(authenticated) => {
          setIsAuthenticated(authenticated)
          setIsCheckingAuth(false)
        }}
      />
    )
  }
  
  if (isAuthenticated === false) {
    return fallback || null
  }
  
  return <>{children}</>
} 