"use client"

import { useEffect, useState } from "react"
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Calendar, Clock, MapPin, Info } from 'lucide-react'
import Link from 'next/link'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { use } from 'react'

interface DatePlanPageProps {
  params: Promise<{
    id: string
  }>
}

export default function DatePlanPage({ params }: DatePlanPageProps) {
  // Properly unwrap the params Promise using React.use()
  const resolvedParams = use(params)
  const id = resolvedParams.id
  
  const [datePlan, setDatePlan] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadDatePlan() {
      try {
        console.log("DETAIL PAGE: Loading date plan", id);
        
        if (!supabase) {
          console.error("Supabase client not initialized");
          setError("Database connection unavailable");
          setLoading(false);
          return;
        }
        
        // First, get the current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          console.log("DETAIL PAGE: No authenticated user found");
          setError("Please log in to view this date plan");
          setLoading(false);
          return;
        }
        
        console.log("DETAIL PAGE: Fetching date plan for user", user.id);
        
        // Query directly from date_sets table
        const { data, error: fetchError } = await supabase
          .from('date_sets')
          .select('*')
          .eq('id', id)
          .single();
        
        console.log("DETAIL PAGE: Query result", { 
          success: !fetchError, 
          dataFound: !!data 
        });
        
        if (fetchError) {
          console.error("Error fetching date plan:", fetchError);
          setError(fetchError.message);
          setLoading(false);
          return;
        }
        
        if (!data) {
          console.log("DETAIL PAGE: Date plan not found");
          setError("Date plan not found");
          setLoading(false);
          return;
        }
        
        // Make sure places is an array
        let places = data.places || [];
        if (typeof places === 'string') {
          try {
            places = JSON.parse(places);
          } catch (e) {
            console.error("Error parsing places:", e);
            places = [];
          }
        }
        
        data.places = Array.isArray(places) ? places : [];
        console.log("DETAIL PAGE: Setting date plan data", { id: data.id, places: data.places.length });
        
        setDatePlan(data);
      } catch (err) {
        console.error("Unexpected error loading date plan:", err);
        setError(`An unexpected error occurred: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setLoading(false);
      }
    }

    loadDatePlan();
  }, [id]); // Keep using the unwrapped id

  if (loading) {
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
    );
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
    );
  }

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
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-2xl">{datePlan.title || 'Untitled Date Plan'}</CardTitle>
            <div className="flex items-center text-gray-600 mt-1">
              <Calendar className="h-4 w-4 mr-1" />
              <span>{datePlan.date ? format(new Date(datePlan.date), 'MMMM d, yyyy') : 'No date specified'}</span>
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
                  • Created: {format(new Date(datePlan.created_at), 'MMM d, yyyy')}
                </span>
              )}
            </div>
          </CardFooter>
        </Card>
      </main>
      <Footer />
    </>
  );
}

