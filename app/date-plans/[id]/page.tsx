"use client"

import { useEffect, useState } from "react"
import { getDatePlan } from "@/app/actions/date-plans"
import { DatePlan } from "@/lib/types"
import { DateSetCard } from '@/components/date-set-card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { PlaceResult } from '@/lib/search-utils'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { use } from 'react'

interface DatePlanPageProps {
  params: Promise<{
    id: string
  }>
}

export default function DatePlanPage({ params }: DatePlanPageProps) {
  const resolvedParams = use(params)
  const [datePlan, setDatePlan] = useState<DatePlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadDatePlan() {
      try {
        const plan = await getDatePlan(resolvedParams.id)
        if (plan) {
          setDatePlan(plan)
        } else {
          setError('Date plan not found')
          toast.error('Date plan not found')
        }
      } catch (err) {
        setError('An unexpected error occurred')
        toast.error('An unexpected error occurred')
        console.error('Error loading date plan:', err)
      } finally {
        setLoading(false)
      }
    }

    loadDatePlan()
  }, [resolvedParams.id])

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

  // Convert DatePlan to DateSet format for the DateSetCard component
  const dateSet = {
    id: datePlan.id,
    title: datePlan.title,
    date: new Date().toISOString().split('T')[0], // Default to today if no date
    start_time: '12:00', // Default start time
    end_time: '14:00', // Default end time
    places: datePlan.activities.map(activity => {
      // Extract address and rating from description
      const addressMatch = activity.description.match(/^([^ -]+)/);
      const ratingMatch = activity.description.match(/Rating: ([\d.]+)/);
      
      const address = addressMatch ? addressMatch[1] : '';
      const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 0;
      
      return {
        id: `place-${Math.random().toString(36).substring(2, 9)}`,
        name: activity.name,
        address: address,
        rating: rating,
        price: 2, // Default price level (moderate)
        isOutdoor: false,
        photoUrl: '',
        openNow: true,
        category: 'restaurant',
        placeId: `place-${Math.random().toString(36).substring(2, 9)}`
      } as PlaceResult;
    }),
    share_id: `share-${datePlan.id}`,
    notes: datePlan.description,
    created_at: datePlan.created_at,
    user_id: datePlan.user_id
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
        
        <DateSetCard dateSet={dateSet} />
      </main>
      <Footer />
    </>
  )
}

