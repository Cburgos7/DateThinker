"use client"

import { useEffect, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { getDatePlan } from "@/app/actions/date-plans"
import { DatePlan, Activity } from "@/lib/types"
import { getCurrentUser } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Clock, Calendar, Star } from "lucide-react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ShareDatePlan } from "@/components/share-date-plan"

export default function DatePlanPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const [datePlan, setDatePlan] = useState<DatePlan | null>(null)
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const [plan, currentUser] = await Promise.all([
          getDatePlan(params?.id as string),
          getCurrentUser()
        ])
        
        if (!plan) {
          throw new Error("Date plan not found")
        }
        setDatePlan(plan)
        setUser(currentUser)
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    if (params?.id) {
      fetchData()
    }
  }, [params?.id])

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (!datePlan) {
    return <div>Date plan not found</div>
  }

  const showShare = searchParams?.get("share") === "true"

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>{datePlan.title}</CardTitle>
            <CardDescription>{datePlan.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {datePlan.activities.map((activity: Activity, index: number) => (
                <div key={index} className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <MapPin className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{activity.name}</h3>
                    <p className="text-sm text-muted-foreground">{activity.description}</p>
                    <div className="mt-2 flex items-center space-x-2">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm">{activity.duration}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        {showShare && <ShareDatePlan dateSet={datePlan} />}
      </main>
      <Footer />
    </>
  )
}

