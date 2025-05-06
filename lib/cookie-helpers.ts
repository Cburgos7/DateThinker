/**
 * Supabase auth cookie helper functions
 * These functions help work around the cookie parsing issues with Supabase
 */

/**
 * Safely parses a Supabase auth cookie that might be base64 encoded
 * Works around the parsing errors in @supabase/auth-helpers-shared
 */
export function parseSupabaseAuthCookie(cookieValue: string): any {
  try {
    // Check if the cookie is base64 encoded (starts with 'base64-')
    if (cookieValue.startsWith('base64-')) {
      // Extract the base64 part and decode it
      const base64Value = cookieValue.substring(7); // Remove 'base64-' prefix
      const decodedValue = Buffer.from(base64Value, 'base64').toString('utf-8');
      return JSON.parse(decodedValue);
    }
    
    // Regular JSON parsing
    return JSON.parse(cookieValue);
  } catch (error) {
    console.error('Error parsing Supabase auth cookie:', error);
    return null;
  }
}

/**
 * Extracts user information from the Supabase auth cookie
 */
export function extractUserFromCookie(cookieValue: string): { id: string, email: string } | null {
  try {
    // Try to parse the cookie with our safe parser
    const parsedCookie = parseSupabaseAuthCookie(cookieValue);
    
    if (parsedCookie && parsedCookie.user) {
      return {
        id: parsedCookie.user.id,
        email: parsedCookie.user.email
      };
    }
    
    // Fallback: If standard parsing failed, try manual extraction with regex
    if (cookieValue.includes('"id":"') && cookieValue.includes('"email":"')) {
      // Extract ID using regex
      const idMatch = cookieValue.match(/"id":"([^"]+)"/);
      const emailMatch = cookieValue.match(/"email":"([^"]+)"/);
      
      if (idMatch && idMatch[1] && emailMatch && emailMatch[1]) {
        return {
          id: idMatch[1],
          email: emailMatch[1]
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting user from cookie:', error);
    return null;
  }
} 