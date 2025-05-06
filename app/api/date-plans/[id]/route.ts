import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// Mark this route as dynamic because it uses cookies
export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const id = params.id
  console.log("API: Fetching date plan with ID:", id)
  
  // Check if this is a redirect request
  const { searchParams } = new URL(request.url)
  const shouldRedirect = searchParams.get('redirect') === 'true'
  
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    // Verify authentication
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    console.log("Auth session check:", { 
      hasSession: !!session, 
      sessionError: sessionError?.message || null,
      cookieCount: cookieStore.getAll().length
    })
    
    if (sessionError) {
      console.error("Session error:", sessionError)
      return new NextResponse(JSON.stringify({ 
        error: "Session error", 
        details: sessionError.message 
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    if (!session) {
      console.log("No active session found")
      
      // For debugging, log cookie info
      console.log("Available cookies:", cookieStore.getAll().map(c => c.name))
      
      // If it's a redirect, just redirect to login page since we can't authenticate
      if (shouldRedirect) {
        return NextResponse.redirect(new URL(`/login?redirectTo=${encodeURIComponent(`/date-plans/${id}`)}`, request.url))
      }
      
      return new NextResponse(JSON.stringify({ 
        error: "Unauthorized", 
        details: "No active session found" 
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    const user = session.user
    console.log("Authenticated user:", user.email)
    
    // First, get all date sets for debugging purposes
    const { data: allSets } = await supabase
      .from('date_sets')
      .select('id, title, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)
    
    console.log("DEBUG: Found user date plans:", allSets?.length || 0)
    
    if (allSets && allSets.length > 0) {
      console.log("DEBUG: Recent IDs:", JSON.stringify(allSets.map(set => ({ 
        id: set.id, 
        title: set.title,
        exactMatch: set.id === id,
        caseSensitiveMatch: set.id.toLowerCase() === id.toLowerCase()
      }))))
    }
    
    // Try to find the matching date plan
    let foundDatePlan = null
    let foundDatePlanId = null
    
    // First, look for exact match
    for (const set of allSets || []) {
      if (set.id === id) {
        console.log("Found exact match:", set.id)
        foundDatePlanId = set.id
        break
      }
    }
    
    // If no exact match, try case-insensitive
    if (!foundDatePlanId) {
      for (const set of allSets || []) {
        if (set.id.toLowerCase() === id.toLowerCase()) {
          console.log("Found case-insensitive match:", set.id)
          foundDatePlanId = set.id
          break
        }
      }
    }
    
    // If still no match, use the most recent one
    if (!foundDatePlanId && allSets && allSets.length > 0) {
      console.log("Using most recent date plan as fallback:", allSets[0].id)
      foundDatePlanId = allSets[0].id
    }
    
    // If we found an ID to use, get the full date plan
    if (foundDatePlanId) {
      const { data, error } = await supabase
        .from('date_sets')
        .select('*')
        .eq('id', foundDatePlanId)
        .single()
      
      if (!error && data) {
        foundDatePlan = data
      }
    }
    
    // Handle redirect if requested
    if (shouldRedirect && foundDatePlanId) {
      console.log("Redirecting to date plan page:", foundDatePlanId)
      return NextResponse.redirect(new URL(`/date-plans/${foundDatePlanId}`, request.url))
    }
    
    // Return JSON response
    if (foundDatePlan) {
      return new NextResponse(JSON.stringify(foundDatePlan), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    // No date plan was found
    return new NextResponse(JSON.stringify({ 
      error: "Date plan not found",
      requestedId: id,
      availableIds: allSets?.map(set => set.id) || []
    }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (err) {
    console.error("Unexpected error in API:", err)
    return new NextResponse(JSON.stringify({ 
      error: "Internal server error",
      details: String(err)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
} 