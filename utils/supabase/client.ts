import { createBrowserClient } from '@supabase/ssr'
import { AuthChangeEvent, Session } from '@supabase/supabase-js'

let supabaseInstance: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  // For browser environments, create a singleton instance to prevent multiple instances
  if (supabaseInstance) {
    return supabaseInstance
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase URL or Anon Key is missing')
  }

  console.log('🔧 Initializing Supabase client with config:', {
    url: supabaseUrl?.substring(0, 20) + '...',
    keyExists: !!supabaseKey,
  })

  // Create the browser client with simpler configuration to avoid type errors
  supabaseInstance = createBrowserClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    }
  })

  // Set additional cookie for the middleware to detect
  // This is a manual way to ensure auth state is available server-side
  supabaseInstance.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
    if (event === 'SIGNED_IN' && session) {
      // Set a cookie that middleware can check
      document.cookie = `sb-auth-sync=true; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
    } else if (event === 'SIGNED_OUT') {
      // Remove the cookie
      document.cookie = 'sb-auth-sync=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    }
  });

  // Test for a session immediately
  const checkSession = async () => {
    try {
      const { data, error } = await supabaseInstance!.auth.getSession()
      if (error) {
        console.error('❌ Error getting session:', error.message)
      } else if (data?.session) {
        console.log('✅ User is authenticated:', data.session.user.email)
        // Set the additional cookie for middleware detection
        document.cookie = `sb-auth-sync=true; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
      } else {
        console.log('⚠️ No active session found')
      }
    } catch (err) {
      console.error('❌ Error checking session:', err)
    }
  }

  checkSession()

  return supabaseInstance
} 