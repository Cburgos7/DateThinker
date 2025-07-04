"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

import { Settings, Heart, MapPin, DollarSign, Calendar, Users } from "lucide-react"
import { getUserPreferences } from "@/app/actions/user-preferences"
import { 
  INTEREST_CATEGORIES, 
  BUDGET_RANGES, 
  RELATIONSHIP_STATUSES, 
  DATE_FREQUENCIES,
  type UserPreferences,
  hasCompletedPreferences,
  getDisplayInterests,
  getDisplayBudgetRange
} from "@/lib/user-preferences"

interface PreferencesOverviewProps {
  userId: string
  onSetupPreferences?: () => void
}

export function PreferencesOverview({ userId, onSetupPreferences }: PreferencesOverviewProps) {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [completionPercentage, setCompletionPercentage] = useState(0)

  useEffect(() => {
    async function fetchPreferences() {
      try {
        setIsLoading(true)
        const prefs = await getUserPreferences(userId)
        setPreferences(prefs)
        
        // Calculate completion percentage
        if (prefs) {
          let completed = 0
          let total = 8 // Total recommended fields
          
          // Required basics
          if (prefs.interests && prefs.interests.length > 0) completed++
          if (prefs.age_range) completed++
          if (prefs.relationship_status) completed++
          if (prefs.date_frequency) completed++
          if (prefs.budget_range) completed++
          
          // Optional but recommended
          if (prefs.default_city) completed++
          if (prefs.activity_preferences && Object.values(prefs.activity_preferences).some(Boolean)) completed++
          if (prefs.dining_preferences && Object.values(prefs.dining_preferences).some(Boolean)) completed++
          
          setCompletionPercentage((completed / total) * 100)
        }
      } catch (error) {
        console.error("Error fetching preferences:", error)
      } finally {
        setIsLoading(false)
      }
    }

    if (userId) {
      fetchPreferences()
    }
  }, [userId])

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-48 bg-gray-200 rounded-lg"></div>
      </div>
    )
  }

  const isComplete = hasCompletedPreferences(preferences)
  const displayInterests = getDisplayInterests(preferences)
  const displayBudget = getDisplayBudgetRange(preferences)
  
  // Get additional preference counts
  const activityPrefsCount = preferences?.activity_preferences ? 
    Object.values(preferences.activity_preferences).filter(Boolean).length : 0
  const diningPrefsCount = preferences?.dining_preferences ? 
    Object.values(preferences.dining_preferences).filter(Boolean).length : 0
  const locationPrefsCount = preferences?.location_preferences ? 
    Object.values(preferences.location_preferences).filter(Boolean).length : 0

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-rose-500" />
            <CardTitle>Your Dating Preferences</CardTitle>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/settings">
              <Settings className="h-4 w-4 mr-2" />
              Edit
            </Link>
          </Button>
        </div>
        <CardDescription>
          {isComplete 
            ? "Your preferences help us find the perfect date ideas for you"
            : "Complete your preferences to get personalized recommendations"
          }
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Completion Status */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Profile Completion</span>
            <span>{Math.round(completionPercentage)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-rose-500 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>

        {isComplete ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Interests */}
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Interests & Preferences
              </h4>
              <div className="space-y-2">
                {/* Main Interests */}
                <div className="flex flex-wrap gap-2">
                  {displayInterests.slice(0, 3).map((interest) => (
                    <Badge key={interest} variant="secondary" className="text-xs">
                      {interest}
                    </Badge>
                  ))}
                  {displayInterests.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{displayInterests.length - 3} more interests
                    </Badge>
                  )}
                </div>
                {/* Additional Preferences Summary */}
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {activityPrefsCount > 0 && (
                    <span>{activityPrefsCount} activity preferences</span>
                  )}
                  {diningPrefsCount > 0 && (
                    <span>{diningPrefsCount} dining preferences</span>
                  )}
                  {locationPrefsCount > 0 && (
                    <span>{locationPrefsCount} location preferences</span>
                  )}
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Location
              </h4>
              <p className="text-sm text-muted-foreground">
                {preferences?.default_city || "No default city set"}
              </p>
            </div>

            {/* Budget */}
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Budget
              </h4>
              <p className="text-sm text-muted-foreground">
                {displayBudget}
              </p>
            </div>

            {/* Date Frequency */}
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Date Frequency
              </h4>
              <p className="text-sm text-muted-foreground">
                {preferences?.date_frequency ? 
                  DATE_FREQUENCIES[preferences.date_frequency as keyof typeof DATE_FREQUENCIES] || preferences.date_frequency
                  : "Not specified"
                }
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="space-y-4">
              <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto">
                <Heart className="h-8 w-8 text-rose-500" />
              </div>
              <h3 className="text-lg font-semibold">Complete Your Profile</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Tell us about your interests and preferences to get personalized date recommendations tailored just for you.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button 
                  onClick={onSetupPreferences}
                  className="bg-rose-500 hover:bg-rose-600"
                >
                  Set Up Preferences
                </Button>
                <Button asChild variant="outline">
                  <Link href="/settings">
                    Complete Later
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 