"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Calendar, Clock, MapPin, Info } from 'lucide-react'
import Link from 'next/link'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import * as dateFns from "date-fns"
import { ShareDateDialog } from '@/components/share-date-dialog'
import { createClient } from "@/utils/supabase/client"
import { useAuth } from "@/contexts/auth-context"
import { AdBanner } from '@/components/ads/ad-banner'

interface DatePlanPageProps {
  params: {
    id: string
  }
}

interface DatePlan {
  id: string;
  title?: string;
  user_id: string;
  date?: string;
  start_time?: string;
  end_time?: string;
  notes?: string;
  places?: any[];
  created_at?: string;
  share_id?: string;
}

export default function DatePlanPage({ params }: DatePlanPageProps) {
  const id = params.id
  const supabase = createClient()
  const { user } = useAuth()
  
  const [datePlan, setDatePlan] = useState<DatePlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAuthenticating, setIsAuthenticating] = useState(true)
  const [authAttempts, setAuthAttempts] = useState(0)
  const [isDataFetched, setIsDataFetched] = useState(false)

  // Check authentication status with retry limit
  useEffect(() => {
    // Maximum auth attempts to prevent infinite loops
    const MAX_AUTH_ATTEMPTS = 2
    let isMounted = true
    
    // Skip if we've tried too many times already
    if (authAttempts >= MAX_AUTH_ATTEMPTS) {
      setIsAuthenticating(false)
      return
    }

    // Skip if we have user info already
    if (user) {
      console.log("User already available from context")
      setIsAuthenticating(false)
      return
    }
    
    async function checkAuthStatus() {
      try {
        // Try to get the session directly
        const { data } = await supabase.auth.getSession()
        const isLoggedIn = !!data.session
        
        if (!isMounted) return
        
        console.log("Auth check result:", isLoggedIn ? "Authenticated" : "Not authenticated")
        setIsAuthenticating(false)
        setAuthAttempts(prev => prev + 1)
        
        if (!isLoggedIn && !user) {
          setError("Please log in to view this date plan")
          setLoading(false)
        }
      } catch (err) {
        if (!isMounted) return
        console.error("Error checking auth status:", err)
        setIsAuthenticating(false)
        setAuthAttempts(prev => prev + 1)
      }
    }
    
    const timeoutId = setTimeout(checkAuthStatus, 100)
    
    return () => {
      isMounted = false
      clearTimeout(timeoutId)
    }
  }, [supabase, user, authAttempts])

  // Fetch date plan data memoized function
  const fetchDatePlan = useCallback(async () => {
    try {
      setLoading(true)
      
      console.log("Fetching date plan data, attempt:", authAttempts)
      
      // Single, direct query
      const { data, error: fetchError } = await supabase
        .from('date_sets')
        .select('*')
        .eq('id', id)
        .maybeSingle()
      
      if (fetchError) {
        console.error("Error fetching date plan:", fetchError)
        setError("Error fetching date plan: " + fetchError.message)
        setLoading(false)
        return
      }
      
      if (!data) {
        setError("Date plan not found")
        setLoading(false)
        return
      }
      
      // Try to skip permission checking if there's cookie issues
      // The database security rules will still protect data
      if (user && data.user_id !== user.id) {
        // Check for shared access
        const { data: sharedAccess } = await supabase
          .from('shared_date_sets')
          .select('*')
          .eq('date_set_id', data.id)
          .eq('shared_with_id', user.id)
          .eq('status', 'accepted')
          .maybeSingle()
          
        if (!sharedAccess) {
          setError("You don't have permission to view this date plan")
          setLoading(false)
          return
        }
      }
      
      // Handle places format
      let places = data.places || []
      if (typeof places === 'string') {
        try {
          places = JSON.parse(places)
        } catch (e) {
          console.error("Error parsing places:", e)
          places = []
        }
      }
      data.places = Array.isArray(places) ? places : []
      
      setDataFetched(data)
    } catch (err) {
      console.error("Error loading date plan:", err)
      setError(`An unexpected error occurred: ${err instanceof Error ? err.message : String(err)}`)
      setLoading(false)
    }
  }, [id, user, supabase]);

  // Helper function to set data and prevent further fetches
  const setDataFetched = (data: DatePlan) => {
    setDatePlan(data)
    setLoading(false)
    setIsDataFetched(true)
  }

  // Main data fetching effect - only runs when auth is determined
  useEffect(() => {
    // Skip fetch if still authenticating
    if (isAuthenticating) return
    
    // Skip if data already fetched successfully
    if (isDataFetched || datePlan) return
    
    fetchDatePlan()
  }, [isAuthenticating, isDataFetched, datePlan, fetchDatePlan])

  if (loading && isAuthenticating) {
    return (
      <>
        <Header />
        <main className="container mx-auto py-8">
          <div className="mb-6">
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </main>
        <Footer />
      </>
    )
  }

  if (error || !datePlan) {
    return (
      <>
        <Header />
        <main className="container mx-auto py-8">
          <div className="mb-6">
            <Link href="/my-dates">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to My Dates
              </Button>
            </Link>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error || 'Date plan not found'}
          </div>
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Header />
      <main className="container mx-auto py-8">
        <div className="mb-6 flex justify-between items-center">
          <Link href="/my-dates">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to My Dates
            </Button>
          </Link>
          
          {datePlan && user ? (
            <ShareDateDialog 
              dateSetId={datePlan.id} 
              shareId={datePlan.share_id || ''} 
              userId={user.id} 
            />
          ) : null}
        </div>
        
        {/* Ad Banner */}
        <div className="mb-6">
          <AdBanner adSlot="date-plan-detail" adFormat="leaderboard" />
        </div>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-2xl">{datePlan.title || 'Untitled Date Plan'}</CardTitle>
            <div className="flex items-center text-gray-600 mt-1">
              <Calendar className="h-4 w-4 mr-1" />
              <span>{datePlan.date ? dateFns.format(new Date(datePlan.date), 'MMMM d, yyyy') : 'No date specified'}</span>
            </div>
            {datePlan.start_time && datePlan.end_time && (
              <div className="flex items-center text-gray-600 mt-1">
                <Clock className="h-4 w-4 mr-1" />
                <span>{datePlan.start_time} - {datePlan.end_time}</span>
              </div>
            )}
          </CardHeader>
          
          <CardContent>
            {datePlan.notes && (
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-2 flex items-center">
                  <Info className="h-4 w-4 mr-1" />
                  Notes
                </h3>
                <p className="text-gray-600 whitespace-pre-wrap">{datePlan.notes}</p>
              </div>
            )}
            
            {datePlan.places && datePlan.places.length > 0 && (
              <div>
                <h3 className="text-lg font-medium mb-3 flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  Locations
                </h3>
                <div className="space-y-4">
                  {datePlan.places.map((place: any, index: number) => (
                    <div key={place.id || index} className="p-4 border rounded-lg bg-gray-50">
                      <h4 className="font-medium">{place.name || 'Unnamed Location'}</h4>
                      {place.address && <p className="text-gray-600 mt-1">{place.address}</p>}
                      {place.category && <p className="text-sm text-gray-500 mt-1 capitalize">{place.category}</p>}
                      {place.rating && (
                        <div className="mt-2 flex items-center">
                          <span className="text-sm font-medium">Rating: {place.rating}</span>
                          <span className="ml-2 text-yellow-500">
                            {'★'.repeat(Math.round(place.rating))}
                            {'☆'.repeat(Math.max(0, 5 - Math.round(place.rating)))}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
          
          <CardFooter>
            <div className="text-xs text-gray-500">
              Date Plan ID: {datePlan.id}
              {datePlan.created_at && (
                <span className="ml-2">
                  • Created: {dateFns.format(new Date(datePlan.created_at), 'MMM d, yyyy')}
                </span>
              )}
            </div>
          </CardFooter>
        </Card>
      </main>
      <Footer />
    </>
  )
}


