// Authentication utilities for reliable auth state detection and bypass handling
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { User } from "@supabase/supabase-js"

/**
 * Set bypass flags across multiple storage mechanisms to prevent redirect loops
 * @param duration Duration in seconds (defaults to 120)
 */
export function setBypassFlags(duration: number = 120): void {
  if (typeof document === 'undefined') return;
  
  // Set cookie with path and expiry
  document.cookie = `bypass_auth_check=true; path=/; max-age=${duration}`;
  
  // Also set localStorage and sessionStorage for redundancy
  try {
    localStorage.setItem('bypass_auth_check', 'true');
    sessionStorage.setItem('bypass_auth_check', 'true');
  } catch (e) {
    console.error("Error setting storage bypass flags:", e);
  }
}

/**
 * Clear all bypass flags
 */
export function clearBypassFlags(): void {
  if (typeof document === 'undefined') return;
  
  // Clear cookie
  document.cookie = 'bypass_auth_check=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  document.cookie = 'redirect_count=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  document.cookie = 'redirect_timestamp=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  
  // Clear storage
  try {
    localStorage.removeItem('bypass_auth_check');
    sessionStorage.removeItem('bypass_auth_check');
    localStorage.removeItem('auth_page_visits');
  } catch (e) {
    console.error("Error clearing storage bypass flags:", e);
  }
}

/**
 * Check if user is authenticated using DOM elements
 * This is the fastest method and doesn't require API calls
 */
export function checkDOMForAuthentication(): boolean {
  if (typeof document === 'undefined') return false;
  
  try {
    // Look for signs the user is logged in via UI elements
    const signOutLink = document.querySelector('[data-testid="sign-out"]') ||
                       document.querySelector('[class*="dropdown"] [class*="menu"] [role="menuitem"]:last-child');
    
    const userNameDisplay = document.querySelector('[data-testid="user-name"]') ||
                          document.querySelector('[data-testid="user-authenticated"]') ||
                          document.querySelector('.header-avatar') ||
                          document.querySelector('header span:not(:empty)');
    
    // Check for authentication data in localStorage
    const hasAuthToken = localStorage.getItem('supabase.auth.token') || 
                        localStorage.getItem('sb-auth-token') ||
                        localStorage.getItem('sb-session');
    
    return !!(signOutLink || userNameDisplay || hasAuthToken);
  } catch (e) {
    console.error("Error in DOM authentication check:", e);
    return false;
  }
}

/**
 * Detect if we're in a redirect loop by checking recent page visits
 * @returns Boolean indicating if a loop was detected
 */
export function detectRedirectLoop(): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    const now = Date.now();
    const authVisits = JSON.parse(localStorage.getItem('auth_page_visits') || '[]');
    
    // Add current visit timestamp
    authVisits.push(now);
    
    // Only keep visits from the last 3 seconds
    const recentVisits = authVisits.filter((time: number) => now - time < 3000);
    localStorage.setItem('auth_page_visits', JSON.stringify(recentVisits));
    
    // If we've visited 3+ times in 3 seconds, we're in a loop
    if (recentVisits.length >= 3) {
      console.log("Redirect loop detected! Stopping redirects.");
      return true;
    }
    return false;
  } catch (e) {
    console.error("Error detecting redirect loop:", e);
    return false;
  }
}

/**
 * Navigate to a URL with bypass flags to prevent redirect loops
 * Uses multiple fallback methods to ensure navigation works
 */
export function navigateWithBypass(url: string): void {
  if (typeof window === 'undefined') return;
  
  console.log(`Navigating to ${url} with bypass flags`);
  setBypassFlags();

  // Method 1: Use form submission for most reliable navigation
  try {
    const form = document.createElement('form');
    form.method = 'GET';  
    form.action = url;
    
    // Add timestamp parameter to prevent caching
    const timestampInput = document.createElement('input');
    timestampInput.type = 'hidden';
    timestampInput.name = 'ts';
    timestampInput.value = Date.now().toString();
    form.appendChild(timestampInput);
    
    // Add bypass parameter
    const bypassInput = document.createElement('input');
    bypassInput.type = 'hidden';
    bypassInput.name = 'bypass_auth';
    bypassInput.value = 'true';
    form.appendChild(bypassInput);
    
    document.body.appendChild(form);
    form.submit();
  } catch (e) {
    console.error("Form navigation failed:", e);
    
    // Method 2: Direct URL navigation as fallback
    try {
      const navUrl = new URL(url, window.location.origin);
      navUrl.searchParams.set('bypass_auth', 'true');
      navUrl.searchParams.set('ts', Date.now().toString());
      window.location.href = navUrl.toString();
    } catch (e) {
      console.error("URL navigation failed:", e);
      
      // Method 3: Simple location change as final fallback
      window.location.href = url;
    }
  }
}

/**
 * Check user's authentication status using Supabase client
 * @returns Promise that resolves to user object if authenticated, null otherwise
 */
export async function checkSupabaseAuth(): Promise<User | null> {
  try {
    const supabase = createClientComponentClient();
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error("Error checking Supabase session:", error);
      return null;
    }
    
    return data.session?.user || null;
  } catch (e) {
    console.error("Error in Supabase auth check:", e);
    return null;
  }
}

/**
 * Comprehensive auth check using DOM, Supabase, and stored tokens
 * @param redirectUrl URL to redirect to if authenticated
 * @param setLoading State setter for loading indicator
 * @returns Promise<boolean> - true if authenticated user found
 */
export async function comprehensiveAuthCheck(
  redirectUrl?: string, 
  setLoading?: (loading: boolean) => void
): Promise<boolean> {
  // First try DOM-based detection which is fastest
  if (checkDOMForAuthentication()) {
    console.log("DOM check suggests user is logged in");
    if (redirectUrl) navigateWithBypass(redirectUrl);
    return true;
  }
  
  // Then try with Supabase client
  console.log("DOM check didn't find user, trying Supabase client");
  const user = await checkSupabaseAuth();
  
  if (user) {
    console.log("User authenticated via Supabase");
    if (redirectUrl) navigateWithBypass(redirectUrl);
    return true;
  }
  
  // No authentication found
  console.log("No authentication found");
  if (setLoading) setLoading(false);
  return false;
} 