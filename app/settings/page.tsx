"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { User, Bell, Shield, Trash2, Save, Heart, MapPin, Settings } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { 
  getUserPreferences, 
  updateUserPreferences, 
  getInterestCategories, 
  getAgeRanges, 
  getRelationshipStatuses, 
  getDateFrequencies, 
  getBudgetRanges,
  type UserInterests 
} from "@/app/actions/user-preferences"

export default function SettingsPage() {
  const { user, isLoading: isLoadingUser } = useAuth()
  const [profile, setProfile] = useState<any>(null)
  const [userSubscriptionStatus, setUserSubscriptionStatus] = useState<string>("free")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [fullName, setFullName] = useState("")
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [pushNotifications, setPushNotifications] = useState(false)
  const [userPreferences, setUserPreferences] = useState<any>(null)
  const [interests, setInterests] = useState<string[]>([])
  const [activityPreferences, setActivityPreferences] = useState<UserInterests['activity_preferences']>({
    indoor: false,
    outdoor: false,
    physical: false,
    relaxing: false,
    creative: false,
    social: false,
    educational: false,
    adventurous: false
  })
  const [diningPreferences, setDiningPreferences] = useState<UserInterests['dining_preferences']>({
    casual: false,
    fine_dining: false,
    ethnic_cuisine: false,
    vegetarian_friendly: false,
    vegan_friendly: false,
    cocktail_bars: false,
    wine_bars: false,
    breweries: false,
    coffee_shops: false
  })
  const [locationPreferences, setLocationPreferences] = useState<UserInterests['location_preferences']>({
    city_center: false,
    suburbs: false,
    waterfront: false,
    rooftop: false,
    historic_areas: false,
    nightlife_districts: false,
    quiet_neighborhoods: false,
    shopping_areas: false
  })
  const [ageRange, setAgeRange] = useState("")
  const [relationshipStatus, setRelationshipStatus] = useState("")
  const [dateFrequency, setDateFrequency] = useState("")
  const [budgetRange, setBudgetRange] = useState("")
  const [defaultCity, setDefaultCity] = useState("")
  const [defaultPriceRange, setDefaultPriceRange] = useState(0)
  const [availableInterests, setAvailableInterests] = useState<string[]>([])
  const [availableAgeRanges, setAvailableAgeRanges] = useState<string[]>([])
  const [availableRelationshipStatuses, setAvailableRelationshipStatuses] = useState<string[]>([])
  const [availableDateFrequencies, setAvailableDateFrequencies] = useState<string[]>([])
  const [availableBudgetRanges, setAvailableBudgetRanges] = useState<string[]>([])
  const supabase = createClient()

  useEffect(() => {
    async function fetchUserData() {
      try {
        if (user?.id) {
          // Get profile data
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single()
          
          if (profile) {
            setProfile(profile)
            setFullName(profile.full_name || "")
            setEmailNotifications(profile.email_notifications ?? true)
            setPushNotifications(profile.push_notifications ?? false)
            setUserSubscriptionStatus(profile.subscription_status || "free")
          }

          // Get user preferences
          const preferences = await getUserPreferences(user.id)
          if (preferences) {
            setUserPreferences(preferences)
            setInterests(preferences.interests || [])
            setActivityPreferences(preferences.activity_preferences || {
              indoor: false,
              outdoor: false,
              physical: false,
              relaxing: false,
              creative: false,
              social: false,
              educational: false,
              adventurous: false
            })
            setDiningPreferences(preferences.dining_preferences || {
              casual: false,
              fine_dining: false,
              ethnic_cuisine: false,
              vegetarian_friendly: false,
              vegan_friendly: false,
              cocktail_bars: false,
              wine_bars: false,
              breweries: false,
              coffee_shops: false
            })
            setLocationPreferences(preferences.location_preferences || {
              city_center: false,
              suburbs: false,
              waterfront: false,
              rooftop: false,
              historic_areas: false,
              nightlife_districts: false,
              quiet_neighborhoods: false,
              shopping_areas: false
            })
            setAgeRange(preferences.age_range || "")
            setRelationshipStatus(preferences.relationship_status || "")
            setDateFrequency(preferences.date_frequency || "")
            setBudgetRange(preferences.budget_range || "")
            setDefaultCity(preferences.default_city || "")
            setDefaultPriceRange(preferences.default_price_range || 0)
          }

          // Get available options for dropdowns
          const [interestOptions, ageOptions, relationshipOptions, frequencyOptions, budgetOptions] = await Promise.all([
            getInterestCategories(),
            getAgeRanges(),
            getRelationshipStatuses(),
            getDateFrequencies(),
            getBudgetRanges()
          ])
          
          setAvailableInterests(interestOptions)
          setAvailableAgeRanges(ageOptions)
          setAvailableRelationshipStatuses(relationshipOptions)
          setAvailableDateFrequencies(frequencyOptions)
          setAvailableBudgetRanges(budgetOptions)
        }
      } catch (error) {
        console.error("Error fetching user data:", error)
        // Fallback to API route
        try {
          const response = await fetch("/api/auth/subscription-status")
          const data = await response.json()
          if (data.authenticated) {
            setUserSubscriptionStatus(data.subscription_status || "free")
          }
        } catch (apiError) {
          console.error("API fallback failed:", apiError)
        }
      } finally {
        setIsLoading(false)
      }
    }

    if (!isLoadingUser) {
      fetchUserData()
    }
  }, [user, supabase, isLoadingUser])

  const handleSaveProfile = async () => {
    if (!user?.id) return

    setIsSaving(true)
    try {
      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          full_name: fullName,
          email_notifications: emailNotifications,
          push_notifications: pushNotifications,
          updated_at: new Date().toISOString()
        })

      if (error) throw error

      toast({
        title: "Settings saved",
        description: "Your profile settings have been updated successfully.",
      })
    } catch (error) {
      console.error("Error saving profile:", error)
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleSavePreferences = async () => {
    if (!user?.id) return

    setIsSaving(true)
    try {
      const result = await updateUserPreferences(user.id, {
        interests,
        activity_preferences: activityPreferences,
        dining_preferences: diningPreferences,
        location_preferences: locationPreferences,
        age_range: ageRange,
        relationship_status: relationshipStatus,
        date_frequency: dateFrequency,
        budget_range: budgetRange,
        default_city: defaultCity,
        default_price_range: defaultPriceRange
      })

      if (result.success) {
        toast({
          title: "Preferences saved",
          description: "Your interests and preferences have been updated successfully.",
        })
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error("Error saving preferences:", error)
      toast({
        title: "Error",
        description: "Failed to save preferences. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      return
    }

    try {
      // Note: You'll need to implement proper account deletion logic
      // This might involve deleting user data, canceling subscriptions, etc.
      toast({
        title: "Account deletion requested",
        description: "Please contact support to complete account deletion.",
      })
    } catch (error) {
      console.error("Error deleting account:", error)
      toast({
        title: "Error",
        description: "Failed to delete account. Please contact support.",
        variant: "destructive",
      })
    }
  }

  if (isLoadingUser || isLoading) {
    return (
      <>
        <Header />
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-3xl font-bold mb-8">Loading settings...</h1>
            <div className="animate-pulse h-8 w-24 bg-gray-200 rounded-md mx-auto"></div>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Header />
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Settings</h1>

          <div className="grid gap-8">
            {/* Profile Settings */}
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <CardTitle>Profile Settings</CardTitle>
                </div>
                <CardDescription>Manage your personal information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={user?.email || ""}
                    disabled
                    className="bg-gray-50"
                  />
                  <p className="text-sm text-muted-foreground">
                    Email cannot be changed. Contact support if you need to update your email.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleSaveProfile} disabled={isSaving}>
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </CardFooter>
            </Card>

            {/* Notification Settings */}
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Bell className="h-5 w-5" />
                  <CardTitle>Notification Preferences</CardTitle>
                </div>
                <CardDescription>Choose how you want to be notified</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email-notifications">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive updates about your date plans via email
                    </p>
                  </div>
                  <input
                    id="email-notifications"
                    type="checkbox"
                    checked={emailNotifications}
                    onChange={(e) => setEmailNotifications(e.target.checked)}
                    className="h-4 w-4"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="push-notifications">Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive push notifications in your browser
                    </p>
                  </div>
                  <input
                    id="push-notifications"
                    type="checkbox"
                    checked={pushNotifications}
                    onChange={(e) => setPushNotifications(e.target.checked)}
                    className="h-4 w-4"
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleSaveProfile} disabled={isSaving}>
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? "Saving..." : "Save Preferences"}
                </Button>
              </CardFooter>
            </Card>

            {/* Interests & Preferences */}
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Heart className="h-5 w-5" />
                  <CardTitle>Interests & Preferences</CardTitle>
                </div>
                <CardDescription>Tell us what you're interested in to get better recommendations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Main Interest Categories */}
                <div className="space-y-2">
                  <Label>What are you interested in?</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {availableInterests.map((interest) => (
                      <label
                        key={interest}
                        className="flex items-center space-x-2 cursor-pointer p-2 rounded-md border hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={interests.includes(interest)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setInterests([...interests, interest])
                            } else {
                              setInterests(interests.filter(i => i !== interest))
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-sm capitalize">{interest.replace('_', ' ')}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Activity Preferences */}
                <div className="space-y-2">
                  <Label>Activity Preferences</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {Object.entries(activityPreferences).map(([key, value]) => (
                      <label
                        key={key}
                        className="flex items-center space-x-2 cursor-pointer p-2 rounded-md border hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={(e) => {
                            setActivityPreferences({
                              ...activityPreferences,
                              [key]: e.target.checked
                            })
                          }}
                          className="rounded"
                        />
                        <span className="text-sm capitalize">{key.replace('_', ' ')}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Dining Preferences */}
                <div className="space-y-2">
                  <Label>Dining Preferences</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {Object.entries(diningPreferences).map(([key, value]) => (
                      <label
                        key={key}
                        className="flex items-center space-x-2 cursor-pointer p-2 rounded-md border hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={(e) => {
                            setDiningPreferences({
                              ...diningPreferences,
                              [key]: e.target.checked
                            })
                          }}
                          className="rounded"
                        />
                        <span className="text-sm capitalize">{key.replace('_', ' ')}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Location Preferences */}
                <div className="space-y-2">
                  <Label>Location Preferences</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {Object.entries(locationPreferences).map(([key, value]) => (
                      <label
                        key={key}
                        className="flex items-center space-x-2 cursor-pointer p-2 rounded-md border hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={(e) => {
                            setLocationPreferences({
                              ...locationPreferences,
                              [key]: e.target.checked
                            })
                          }}
                          className="rounded"
                        />
                        <span className="text-sm capitalize">{key.replace('_', ' ')}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Personal Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="age-range">Age Range</Label>
                    <select
                      id="age-range"
                      value={ageRange}
                      onChange={(e) => setAgeRange(e.target.value)}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="">Select age range</option>
                      {availableAgeRanges.map((range) => (
                        <option key={range} value={range}>{range}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="relationship-status">Relationship Status</Label>
                                          <select
                        id="relationship-status"
                        value={relationshipStatus}
                        onChange={(e) => setRelationshipStatus(e.target.value)}
                        className="w-full p-2 border rounded-md"
                      >
                        <option value="">Select status</option>
                        {availableRelationshipStatuses.map((status) => (
                          <option key={status} value={status}>
                            {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </option>
                        ))}
                      </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date-frequency">How often do you date?</Label>
                                          <select
                        id="date-frequency"
                        value={dateFrequency}
                        onChange={(e) => setDateFrequency(e.target.value)}
                        className="w-full p-2 border rounded-md"
                      >
                        <option value="">Select frequency</option>
                        {availableDateFrequencies.map((freq) => (
                          <option key={freq} value={freq}>
                            {freq.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </option>
                        ))}
                      </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="budget-range">Budget Range</Label>
                                          <select
                        id="budget-range"
                        value={budgetRange}
                        onChange={(e) => setBudgetRange(e.target.value)}
                        className="w-full p-2 border rounded-md"
                      >
                        <option value="">Select budget</option>
                        {availableBudgetRanges.map((budget) => (
                          <option key={budget} value={budget}>
                            {budget === 'budget_conscious' ? 'Budget Conscious ($)' :
                             budget === 'moderate' ? 'Moderate ($$)' :
                             budget === 'comfortable' ? 'Comfortable ($$$)' :
                             budget === 'luxury' ? 'Luxury ($$$$)' :
                             'Unlimited'}
                          </option>
                        ))}
                      </select>
                  </div>
                </div>

                {/* Default Location */}
                <div className="space-y-2">
                  <Label htmlFor="default-city">Default City</Label>
                  <Input
                    id="default-city"
                    type="text"
                    value={defaultCity}
                    onChange={(e) => setDefaultCity(e.target.value)}
                    placeholder="Enter your default city"
                  />
                </div>

                {/* Default Price Range */}
                <div className="space-y-2">
                  <Label htmlFor="default-price-range">Default Price Range (1-4)</Label>
                  <Input
                    id="default-price-range"
                    type="number"
                    min="0"
                    max="4"
                    value={defaultPriceRange}
                    onChange={(e) => setDefaultPriceRange(parseInt(e.target.value) || 0)}
                    placeholder="0 = No preference, 1 = Budget, 4 = Expensive"
                  />
                  <p className="text-sm text-muted-foreground">
                    0 = No preference, 1 = Budget-friendly, 2 = Moderate, 3 = Expensive, 4 = Very expensive
                  </p>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleSavePreferences} disabled={isSaving}>
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? "Saving..." : "Save Preferences"}
                </Button>
              </CardFooter>
            </Card>

            {/* Account Management */}
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <CardTitle>Account Management</CardTitle>
                </div>
                <CardDescription>Manage your account and subscription</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Subscription Status</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge
                      className={
                        userSubscriptionStatus === "premium"
                          ? "bg-purple-500"
                          : userSubscriptionStatus === "lifetime"
                            ? "bg-rose-500"
                            : "bg-gray-500"
                      }
                    >
                      {userSubscriptionStatus === "premium"
                        ? "Premium"
                        : userSubscriptionStatus === "lifetime"
                          ? "Lifetime"
                          : "Free"}
                    </Badge>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Account Created</p>
                  <p className="text-sm">
                    {profile?.created_at 
                      ? new Date(profile.created_at).toLocaleDateString()
                      : "Not available"}
                  </p>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button 
                  variant="outline"
                  onClick={() => window.location.href = '/account'}
                >
                  View Account Details
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => window.location.href = '/pricing'}
                >
                  Manage Subscription
                </Button>
              </CardFooter>
            </Card>

            {/* Danger Zone */}
            <Card className="border-red-200">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Trash2 className="h-5 w-5 text-red-500" />
                  <CardTitle className="text-red-700">Danger Zone</CardTitle>
                </div>
                <CardDescription>Irreversible actions for your account</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Once you delete your account, there is no going back. Please be certain.
                </p>
              </CardContent>
              <CardFooter>
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteAccount}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Account
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}