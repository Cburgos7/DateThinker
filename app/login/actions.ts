import { createClient } from '@/utils/supabase/client'

type ActionResult = {
  error?: string
  message?: string
}

export async function login(formData: FormData): Promise<ActionResult> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  
  try {
    const supabase = createClient()
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) {
      return { error: error.message }
    }
    
    return { message: 'Login successful' }
  } catch (error) {
    console.error("Login error:", error)
    return { error: 'An unexpected error occurred' }
  }
}

export async function signup(formData: FormData): Promise<ActionResult> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  try {
    const supabase = createClient()
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/login/callback`,
      },
    })
    
    if (error) {
      return { error: error.message }
    }
    
    return { message: 'Check your email to confirm your account' }
  } catch (error) {
    console.error("Signup error:", error)
    return { error: 'An unexpected error occurred' }
  }
} 