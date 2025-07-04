"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  RefreshCcw,
  Search,
  Heart,
  Sparkles,
  MapPin,
  Star,
  Save,
  Plus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Toggle } from "@/components/ui/toggle"
import { cn } from "@/lib/utils"
import { type PlaceResult, type SearchResults, refreshPlace } from "@/lib/search-utils"
import { AdBanner } from "@/components/ads/ad-banner"
import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import { Input } from "@/components/ui/input"
import { getCurrentUser } from "@/lib/supabase"
import { checkIsFavorite, toggleFavorite } from "@/app/actions/favorites"
import { SaveDateModal } from "@/components/save-date-modal"
import Image from "next/image"
import { createClient } from "@/utils/supabase/client"
import { type User } from "@supabase/supabase-js"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/contexts/auth-context"
import { getPersonalizedRecommendations, getRandomRecommendation, type RecommendationResult } from "@/lib/recommendation-engine"
import { getUserPreferences } from "@/app/actions/user-preferences"
import { MultipleVenuesSection } from "@/components/multiple-venues-section"
import { SequentialDatePlanner } from "@/components/sequential-date-planner"
import { VENUE_TYPE_OPTIONS } from "@/lib/types"

// Using consistent auth via useAuth hook

export default function Page() {
  const router = useRouter()
  // Remove old supabase instance - we'll create clients as needed
  const { user, isLoading: isLoadingUser } = useAuth()
  const [city, setCity] = useState("")
  const [placeId, setPlaceId] = useState<string | undefined>(undefined)
  const [priceRange, setPriceRange] = useState(0) // 0 means no price filter
  const [favorites, setFavorites] = useState<string[]>([])
  const [userSubscriptionStatus, setUserSubscriptionStatus] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    restaurants: false,
    activities: false,
    outdoors: false,
    events: false,
  })
  const [results, setResults] = useState<SearchResults>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDateModalOpen, setIsDateModalOpen] = useState(false)
  const [multipleVenues, setMultipleVenues] = useState<{
    restaurants: PlaceResult[]
    activities: PlaceResult[]
    outdoors: PlaceResult[]
  }>({
    restaurants: [],
    activities: [],
    outdoors: []
  })
  const [userPreferences, setUserPreferences] = useState<any>(null)
  const [isExploring, setIsExploring] = useState(false)
  const [planningMode, setPlanningMode] = useState<'quick' | 'sequential'>('quick')

  const [refreshing, setRefreshing] = useState<{
    restaurant?: boolean
    activity?: boolean
    drink?: boolean
    outdoor?: boolean
  }>({})

  // Fetch user subscription status when user changes
  useEffect(() => {
    async function fetchSubscriptionStatus() {
      console.log("🔄 Starting subscription status fetch...")
      console.log("🔍 Auth context user:", user?.email, user?.id)
      
      // Always use server-side API to bypass cookie parsing issues
      console.log("🌐 Using server-side API to bypass cookie parsing issues...")
      if (user?.id) {
        console.log("✅ User detected in auth context:", user.email)
        console.log("🔍 User ID:", user.id)
      } else {
        console.log("❌ No user in auth context, but trying server-side anyway...")
      }
      
      // Use server-side API to bypass corrupted cookie parsing
      try {
        const response = await fetch('/api/auth/subscription-status', {
          method: 'GET',
          credentials: 'include' // Include cookies
        })
        
        if (response.ok) {
          const data = await response.json()
          console.log("🌐 Server-side subscription result:", data)
          
          if (data.authenticated && data.subscription_status) {
            setUserSubscriptionStatus(data.subscription_status)
            console.log("✅ Server-side subscription status set:", data.subscription_status)
          } else {
            console.log("❌ Server-side: Not authenticated or no subscription")
            setUserSubscriptionStatus("free")
          }
        } else {
          console.log("❌ Server-side API failed:", response.status)
          setUserSubscriptionStatus(null)
        }
      } catch (serverError) {
        console.error("❌ Server-side API error:", serverError)
        setUserSubscriptionStatus(null)
      }
    }

    fetchSubscriptionStatus()
  }, [user])

  // Load user preferences when user changes
  useEffect(() => {
    async function loadUserPreferences() {
      if (user?.id) {
        try {
          const preferences = await getUserPreferences(user.id)
          setUserPreferences(preferences)
        } catch (error) {
          console.error("Error loading user preferences:", error)
        }
      }
    }

    loadUserPreferences()
  }, [user])

  // Time-based theming
  useEffect(() => {
    const hour = new Date().getHours()
    const root = document.documentElement
    if (hour >= 18 || hour < 6) {
      root.style.setProperty("--gradient-start", "rgb(255, 245, 250)")
      root.style.setProperty("--gradient-end", "rgb(255, 240, 245)")
    } else {
      root.style.setProperty("--gradient-start", "rgb(255, 250, 255)")
      root.style.setProperty("--gradient-end", "rgb(255, 245, 250)")
    }
  }, [])

  // Check if Places are in favorites using server-side API
  useEffect(() => {
    async function checkFavorites() {
      if (!user || !results) return

      try {
        // Get all place IDs from results
        const placeIds: string[] = []
        Object.values(results).forEach(place => {
          if (place) {
            placeIds.push(place.id)
          }
        })
        
        if (placeIds.length === 0) return
        
        console.log("🔍 Checking favorites for places:", placeIds)
        
        const response = await fetch('/api/favorites/check', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ placeIds }),
        })
        
        if (response.ok) {
          const data = await response.json()
          console.log("✅ Favorites check result:", data.favorites)
          setFavorites(data.favorites || [])
        } else {
          console.error("❌ Failed to check favorites:", response.status)
          setFavorites([])
        }
      } catch (error) {
        console.error("❌ Error checking favorites:", error)
        setFavorites([])
      }
    }

    if (user) {
      checkFavorites()
    }
  }, [results, user])

  const handleCityChange = (value: string, newPlaceId?: string) => {
    setCity(value)
    if (newPlaceId) {
      setPlaceId(newPlaceId)
    }
    // Clear error when user starts typing
    if (error) setError(null)
  }

  const handleSearch = async (e?: React.FormEvent, searchFilters = filters) => {
    if (e) {
      e.preventDefault()
    }

    // Check if city is entered
    if (!city.trim()) {
      setError("Please enter a city")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      console.log("Searching with filters:", searchFilters)

      // Try the App Router API route first
      let response = await fetch("/api/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          city,
          filters: searchFilters,
        }),
      })

      // If the App Router API route fails, try the legacy API route
      if (!response.ok) {
        console.log("App Router API route failed, trying legacy API route")
        response = await fetch("/api/search-legacy", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            city,
            filters: searchFilters,
          }),
        })
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to parse error response" }))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log("Search response:", data)

      if (!data || Object.keys(data).length === 0) {
        throw new Error("No results found")
      }

      // Count how many filters are selected
      const selectedFilters = Object.values(searchFilters).filter(Boolean).length
      const isMultipleMode = selectedFilters > 1

      if (isMultipleMode) {
        // Start directly in multiple venue mode
        console.log("🔄 Starting in multiple venue mode (multiple filters selected)")
        
        // Clear single results and populate multiple venues
        setResults({})
        setMultipleVenues({
          restaurants: data.restaurant ? [data.restaurant] : [],
          activities: data.activity ? [data.activity] : [],
          outdoors: data.outdoor ? [data.outdoor] : []
        })
      } else {
        // Single filter mode - show single results as before
        console.log("🔄 Starting in single venue mode (one filter selected)")
        setResults(data)
        // Clear multiple venues to avoid confusion
        setMultipleVenues({
          restaurants: [],
          activities: [],
          outdoors: []
        })
      }
      
      setError(null)

      // Trigger confetti if we have results
      import('canvas-confetti').then((confettiModule) => {
        const confetti = confettiModule.default;
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      });
    } catch (error) {
      console.error("Search error:", error)
      setError(error instanceof Error ? error.message : "Failed to search places")
      setResults({})
    } finally {
      setIsLoading(false)
    }
  }

  // Update the handleRefresh function to handle errors better
  const handleRefresh = async (type: "restaurant" | "activity" | "drink" | "outdoor") => {
    setRefreshing((prev) => ({ ...prev, [type]: true }))
    setError(null)

    try {
      if (results[type]) {
        // Try the App Router API route first
        let response = await fetch("/api/refresh", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: results[type]!.category,
            city,
            placeId: results[type]!.placeId,
          }),
        })

        // If the App Router API route fails, try the legacy API route
        if (!response.ok) {
          console.log("App Router API route failed, trying legacy API route")
          response = await fetch("/api/refresh-legacy", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              type: results[type]!.category,
              city,
              placeId: results[type]!.placeId,
            }),
          })
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "Failed to parse error response" }))
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
        }

        const refreshedPlace = await response.json()
        setResults((prevResults) => ({ ...prevResults, [type]: refreshedPlace }))
      }
    } catch (error: any) {
      console.error(`Failed to refresh ${type}:`, error)
      setError(`Couldn't find another ${type}. Try a different city or filter.`)
    } finally {
      setRefreshing((prev) => ({ ...prev, [type]: false }))
    }
  }

  const handleSurpriseMe = () => {
    // Check if city is entered
    if (!city.trim()) {
      setError("Please enter a city first")
      return
    }

    // Clear any previous errors
    setError(null)

    // Set random filters
    const randomFilters = {
      restaurants: Math.random() > 0.3, // 70% chance of including restaurants
      activities: Math.random() > 0.5, // 50% chance of including activities
      outdoors: Math.random() > 0.5, // 50% chance of outdoor options
      events: Math.random() > 0.5, // 50% chance of including events
    }

    // Ensure at least one filter is selected
    if (!randomFilters.restaurants && !randomFilters.activities && !randomFilters.outdoors && !randomFilters.events) {
      randomFilters.restaurants = true
    }

    console.log("Surprise Me filters:", randomFilters)

    // Update the UI filters to show what we're searching for
    setFilters(randomFilters)
    
    // Directly pass the random filters to the search function
    // instead of updating state and then searching
    handleSearch(undefined, randomFilters)
  }

  const handleExploreRecommendations = async () => {
    if (!user?.id || !city.trim()) {
      setError(!user?.id ? "Please sign in to get personalized recommendations" : "Please enter a city")
      return
    }

    setIsExploring(true)
    setError(null)

    try {
      const recommendations = await getPersonalizedRecommendations({
        city: city.trim(),
        placeId,
        userId: user.id,
        maxResults: 3
      })

      // Count how many categories have results
      const categoriesWithResults = [
        recommendations.restaurants.length > 0,
        recommendations.activities.length > 0,
        recommendations.outdoors.length > 0
      ].filter(Boolean).length

      const isMultipleMode = categoriesWithResults > 1

      if (isMultipleMode) {
        // Start directly in multiple venue mode
        console.log("🔄 Explore recommendations starting in multiple venue mode")
        setResults({})
        setMultipleVenues(recommendations)
      } else {
        // Single category mode - show single results
        console.log("🔄 Explore recommendations starting in single venue mode")
        const newResults: SearchResults = {}
        
        if (recommendations.restaurants.length > 0) {
          newResults.restaurant = recommendations.restaurants[0]
          setMultipleVenues(prev => ({ ...prev, restaurants: recommendations.restaurants }))
        }
        if (recommendations.activities.length > 0) {
          newResults.activity = recommendations.activities[0]
          setMultipleVenues(prev => ({ ...prev, activities: recommendations.activities }))
        }
        if (recommendations.outdoors.length > 0) {
          newResults.outdoor = recommendations.outdoors[0]
          setMultipleVenues(prev => ({ ...prev, outdoors: recommendations.outdoors }))
        }

        setResults(newResults)
        setMultipleVenues({
          restaurants: [],
          activities: [],
          outdoors: []
        })
      }

      // Update filters based on what was found
      setFilters({
        restaurants: recommendations.restaurants.length > 0,
        activities: recommendations.activities.length > 0,
        outdoors: recommendations.outdoors.length > 0,
        events: false,
      })

    } catch (error) {
      console.error("Error getting recommendations:", error)
      setError("Failed to get recommendations. Please try again.")
    } finally {
      setIsExploring(false)
    }
  }

  const handleRandomizeCategory = async (category: 'restaurant' | 'activity' | 'drink' | 'outdoor') => {
    if (!user?.id || !city.trim()) {
      setError(!user?.id ? "Please sign in to get random suggestions" : "Please enter a city")
      return
    }

    setRefreshing(prev => ({ ...prev, [category]: true }))

    try {
      const currentIds = Object.values(results)
        .filter(Boolean)
        .map(place => place!.id)

      const randomPlace = await getRandomRecommendation({
        city: city.trim(),
        placeId,
        userId: user.id,
        category,
        excludeIds: currentIds
      })

      if (randomPlace) {
        setResults(prev => ({
          ...prev,
          [category]: randomPlace
        }))

        // Update the filters to show this category
        setFilters(prev => ({
          ...prev,
          [`${category}s`]: true
        }))
      } else {
        setError(`No ${category} suggestions found. Try a different city or search criteria.`)
      }
    } catch (error) {
      console.error(`Error getting random ${category}:`, error)
      setError(`Failed to get random ${category}. Please try again.`)
    } finally {
      setRefreshing(prev => ({ ...prev, [category]: false }))
    }
  }

  const handleToggleFavorite = async (place: PlaceResult) => {
    console.log("❤️ Toggling favorite for:", place.name, "| User:", user?.email, "| Subscription:", userSubscriptionStatus)
    
    // If user is not logged in, redirect to login page
    if (!user) {
      console.log("❌ No user, redirecting to login")
      router.push("/login?redirect=/")
      return
    }

    // Toggle favorite using server-side API to bypass RLS issues
    try {
      console.log("❤️ Toggling favorite via API:", place.name)
      
      const response = await fetch('/api/favorites/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ place }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error("❌ API Error:", errorData)
        throw new Error(errorData.error || 'Failed to toggle favorite')
      }
      
      const result = await response.json()
      console.log("✅ API Success:", result)
      
      // Update local state based on API response
      if (result.isFavorite) {
        setFavorites((prev) => [...prev, place.id])
        // Show success toast
        import('@/components/ui/use-toast').then(({ toast }) => {
          toast({
            title: "Added to favorites!",
            description: `${place.name} has been saved to your favorites`,
          })
        })
      } else {
        setFavorites((prev) => prev.filter((id) => id !== place.id))
        // Show success toast
        import('@/components/ui/use-toast').then(({ toast }) => {
          toast({
            title: "Removed from favorites",
            description: `${place.name} has been removed from your favorites`,
          })
        })
      }
    } catch (error) {
      console.error("Error toggling favorite:", error)
      // Show generic error toast
      import('@/components/ui/use-toast').then(({ toast }) => {
        toast({
          title: "Error",
          description: "Something went wrong while saving your favorite. Please try again.",
          variant: "destructive",
        })
      })
    }
  }

  const handleAddMoreVenues = (category: 'restaurants' | 'activities' | 'outdoors') => {
    // Create an empty slot that users can fill manually or with surprise me
    const emptySlot = {
      id: `empty-${Date.now()}`,
      name: '',
      address: '',
      rating: 0,
      price: 0,
      category: category.slice(0, -1) as 'restaurant' | 'activity' | 'outdoor',
      photoUrl: '',
      openNow: undefined,
      isEmpty: true
    }
    
    setMultipleVenues(prev => ({
      ...prev,
      [category]: [...prev[category], emptySlot]
    }))
  }

  const handleRemoveVenue = (category: 'restaurants' | 'activities' | 'outdoors', venueId: string) => {
    setMultipleVenues(prev => ({
      ...prev,
      [category]: prev[category].filter(venue => venue.id !== venueId)
    }))
  }

  const handleRandomizeMultipleCategory = async (category: 'restaurants' | 'activities' | 'outdoors') => {
    if (!userPreferences || !city) return

    setIsLoading(true)
    try {
      const categoryMap = {
        restaurants: 'restaurant',
        activities: 'activity', 
        outdoors: 'outdoor'
      } as const

      const recommendation = await getRandomRecommendation({
        city,
        placeId,
        userId: user?.id || '',
        category: categoryMap[category],
        excludeIds: multipleVenues[category].map(v => v.id)
      })

      if (recommendation) {
        setMultipleVenues(prev => ({
          ...prev,
          [category]: [...prev[category], recommendation]
        }))
      }
    } catch (error) {
      console.error('Error randomizing category:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFillEmptySlot = async (category: 'restaurants' | 'activities' | 'outdoors', venueId: string, venueName: string) => {
    if (!city || !venueName.trim()) return

    setIsLoading(true)
    try {
      // Search for the specific venue
      const categoryFilter = {
        restaurants: category === 'restaurants',
        activities: category === 'activities',
        outdoors: category === 'outdoors',
      }

      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          city: `${venueName} in ${city}`,
          placeId,
          filters: categoryFilter,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      const newVenue = data[category === 'restaurants' ? 'restaurant' : 
                          category === 'activities' ? 'activity' : 'outdoor']

      if (newVenue) {
        setMultipleVenues(prev => ({
          ...prev,
          [category]: prev[category].map(venue => 
            venue.id === venueId ? newVenue : venue
          )
        }))
      } else {
        // If no venue found, create a placeholder
        const placeholderVenue = {
          id: venueId,
          name: venueName,
          address: `${city}`,
          rating: 0,
          price: 0,
          category: category.slice(0, -1) as 'restaurant' | 'activity' | 'outdoor',
          photoUrl: '',
          openNow: undefined,
        }
        setMultipleVenues(prev => ({
          ...prev,
          [category]: prev[category].map(venue => 
            venue.id === venueId ? placeholderVenue : venue
          )
        }))
      }
    } catch (error) {
      console.error('Error filling empty slot:', error)
      setError('Failed to find the specified venue. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRandomizeEmptySlot = async (category: 'restaurants' | 'activities' | 'outdoors', venueId: string) => {
    if (!city) return

    setIsLoading(true)
    try {
      const categoryFilter = {
        restaurants: category === 'restaurants',
        activities: category === 'activities',
        outdoors: category === 'outdoors',
      }

      // Get existing venue IDs to exclude
      const existingIds = multipleVenues[category].map(v => v.id).filter(id => id !== venueId)

      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          city,
          placeId,
          filters: categoryFilter,
          excludeIds: existingIds,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      const newVenue = data[category === 'restaurants' ? 'restaurant' : 
                          category === 'activities' ? 'activity' : 'outdoor']

      if (newVenue) {
        setMultipleVenues(prev => ({
          ...prev,
          [category]: prev[category].map(venue => 
            venue.id === venueId ? newVenue : venue
          )
        }))
      }
    } catch (error) {
      console.error('Error randomizing empty slot:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleMoveVenuesToMultiple = () => {
    // Move any single results to multiple venues arrays
    const newMultipleVenues = { ...multipleVenues }
    
    if (results.restaurant && !newMultipleVenues.restaurants.find(v => v.id === results.restaurant!.id)) {
      newMultipleVenues.restaurants = [...newMultipleVenues.restaurants, results.restaurant]
    }
    if (results.activity && !newMultipleVenues.activities.find(v => v.id === results.activity!.id)) {
      newMultipleVenues.activities = [...newMultipleVenues.activities, results.activity]
    }
    if (results.outdoor && !newMultipleVenues.outdoors.find(v => v.id === results.outdoor!.id)) {
      newMultipleVenues.outdoors = [...newMultipleVenues.outdoors, results.outdoor]
    }

    setMultipleVenues(newMultipleVenues)
    
    // Clear single results since they're now in multiple venues
    setResults({})
  }

  // Get all places from results as an array
  const getPlacesArray = (): PlaceResult[] => {
    const places: PlaceResult[] = []

    // Include current single results
    if (results.restaurant) places.push(results.restaurant)
    if (results.activity) places.push(results.activity)
    if (results.outdoor) places.push(results.outdoor)

    // Include multiple venues if any, but filter out empty slots
    places.push(...multipleVenues.restaurants.filter(venue => !venue.isEmpty))
    places.push(...multipleVenues.activities.filter(venue => !venue.isEmpty))
    places.push(...multipleVenues.outdoors.filter(venue => !venue.isEmpty))

    // Remove duplicates based on place ID
    return places.filter((place, index, array) => 
      array.findIndex(p => p.id === place.id) === index
    )
  }

  const handleSaveDatePlan = () => {
    // Open the save date modal directly without authentication check
    setIsDateModalOpen(true)
  }

  // Auth is now handled consistently via useAuth hook

  // Add loading state UI
  if (isLoadingUser) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[var(--gradient-start)] to-[var(--gradient-end)]">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading...</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  // Auth is handled by useAuth context - no need for manual error handling

  return (
    <>
      <Header />

      <main className="min-h-screen bg-[var(--gradient-start)] transition-colors duration-1000">
        <div className="absolute inset-0 bg-grid-white/[0.015] bg-[size:20px_20px]" />
        <div className="container mx-auto px-4 py-4 md:py-8 relative">
          <div className="max-w-2xl mx-auto space-y-6 md:space-y-8">
            <div className="text-center space-y-2 md:space-y-4">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-rose-500 to-purple-500 animate-gradient">
                DateThinker
              </h1>
              <p className="text-muted-foreground text-base md:text-lg">Discover the perfect date spots in your city</p>
              {(user || !isLoadingUser) && (
                <div className={`text-xs px-3 py-1 rounded-full inline-block ${
                  userSubscriptionStatus === 'premium' || userSubscriptionStatus === 'lifetime'
                    ? 'text-purple-700 bg-purple-100'
                    : user 
                      ? 'text-blue-700 bg-blue-100'
                      : 'text-red-700 bg-red-100'
                }`}>
                  {user ? (
                    <>👤 {user.email} | Status: {userSubscriptionStatus || 'Loading...'} {userSubscriptionStatus === 'premium' || userSubscriptionStatus === 'lifetime' ? '💎' : '⭐️'}</>
                  ) : (
                    <>❌ Not logged in - Click heart to sign in</>
                  )}
                </div>
              )}
              {isLoadingUser && (
                <div className="text-xs text-blue-500 bg-blue-50 px-3 py-1 rounded-full inline-block">
                  🔄 Loading authentication...
                </div>
              )}
            </div>

            <form onSubmit={handleSearch} className="space-y-6 md:space-y-8">
              <div className="relative group">
                <Input
                  type="text"
                  value={city}
                  onChange={(e) => handleCityChange(e.target.value)}
                  placeholder="Enter your city..."
                  className="pl-10 h-12 text-lg transition-all border-2 group-hover:border-rose-300"
                  required
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              </div>

              <div className="flex flex-wrap gap-3 md:gap-4 justify-center">
                <Toggle
                  pressed={filters.restaurants}
                  onPressedChange={(pressed) => setFilters((prev) => ({ ...prev, restaurants: pressed }))}
                  className="data-[state=on]:bg-rose-200 data-[state=on]:text-rose-800"
                >
                  <span className="text-sm mr-2">🍽️</span>
                  Restaurants
                </Toggle>
                <Toggle
                  pressed={filters.activities}
                  onPressedChange={(pressed) => setFilters((prev) => ({ ...prev, activities: pressed }))}
                  className="data-[state=on]:bg-purple-200 data-[state=on]:text-purple-800"
                >
                  <span className="text-sm mr-2">🎯</span>
                  Activities
                </Toggle>
                <Toggle
                  pressed={filters.outdoors}
                  onPressedChange={(pressed) => setFilters((prev) => ({ ...prev, outdoors: pressed }))}
                  className="data-[state=on]:bg-emerald-200 data-[state=on]:text-emerald-800"
                >
                  <span className="text-sm mr-2">🌳</span>
                  Outdoors
                </Toggle>
                <Toggle
                  pressed={filters.events}
                  onPressedChange={(pressed) => setFilters((prev) => ({ ...prev, events: pressed }))}
                  className="data-[state=on]:bg-yellow-200 data-[state=on]:text-yellow-800"
                >
                  <span className="text-sm mr-2">🎭</span>
                  Events
                </Toggle>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex gap-4">
                  <Button
                    type="submit"
                    className="flex-1 h-12 text-lg bg-gradient-to-r from-rose-500 to-purple-500 hover:opacity-90"
                    disabled={isLoading || isExploring}
                  >
                    {isLoading ? <div className="animate-pulse">Finding perfect spots...</div> : "Find Date Ideas"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSurpriseMe}
                    className="group"
                    disabled={isLoading || isExploring}
                  >
                    <Sparkles className="h-5 w-5 mr-2 group-hover:animate-spin" />
                    Surprise Me
                  </Button>
                </div>
                
                {user && userPreferences && (
                  <Button
                    type="button"
                    onClick={handleExploreRecommendations}
                    className="h-12 text-lg bg-gradient-to-r from-purple-500 to-blue-500 hover:opacity-90"
                    disabled={isLoading || isExploring}
                  >
                    {isExploring ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Getting personalized recommendations...
                      </div>
                    ) : (
                      <>
                        <Heart className="h-5 w-5 mr-2" />
                        🔍 Explore Based on Your Preferences
                      </>
                    )}
                  </Button>
                )}
                
                {user && !userPreferences && (
                  <div className="text-center text-sm text-muted-foreground p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    💡 Set up your preferences in <a href="/settings" className="text-blue-600 hover:underline">Settings</a> to get personalized recommendations!
                  </div>
                )}
              </div>

              {error && <div className="text-center text-red-500 animate-appear">{error}</div>}
            </form>

            {/* Planning Mode Selector */}
            <div className="flex justify-center">
              <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
                <button
                  onClick={() => setPlanningMode('quick')}
                  className={cn(
                    "px-4 py-2 text-sm font-medium rounded-md transition-all",
                    planningMode === 'quick'
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  Quick Search
                </button>
                <button
                  onClick={() => setPlanningMode('sequential')}
                  className={cn(
                    "px-4 py-2 text-sm font-medium rounded-md transition-all",
                    planningMode === 'sequential'
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  Sequential Planner
                </button>
              </div>
            </div>

            {/* Multiple Venue Mode Indicator */}
            {(multipleVenues.restaurants.length > 0 || 
              multipleVenues.activities.length > 0 || 
              multipleVenues.outdoors.length > 0) && (
              <div className="text-center my-4">
                <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-100 to-blue-100 rounded-full">
                  <Sparkles className="h-4 w-4 mr-2 text-purple-600" />
                  <span className="text-sm font-medium text-purple-700">
                    Multiple Venues Mode - Building your perfect date plan
                  </span>
                </div>
              </div>
            )}

            {/* Conditional Content Based on Planning Mode */}
            {planningMode === 'sequential' ? (
              <SequentialDatePlanner
                city={city}
                placeId={placeId}
                onSave={(plan) => {
                  console.log('Sequential plan saved:', plan)
                  // Handle saving the sequential plan
                }}
              />
            ) : (
              <>
                {/* Stand-alone Save Date Plan button */}
                <div className="flex justify-center">
                  <Button
                    onClick={handleSaveDatePlan}
                    className="bg-gradient-to-r from-purple-500 to-blue-500 hover:opacity-90"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Date Plan
                  </Button>
                </div>

            {Object.keys(results).length > 0 && (
              <>
                <div className="grid gap-4 md:gap-6">
                  {results.restaurant && (
                    <ResultCard
                      title="Restaurant"
                      result={results.restaurant}
                      onFavorite={() => handleToggleFavorite(results.restaurant!)}
                      isFavorite={favorites.includes(results.restaurant.id)}
                      onRefresh={() => handleRefresh("restaurant")}
                      onRandomize={() => handleRandomizeCategory("restaurant")}
                      isRefreshing={refreshing.restaurant}
                      isLoggedIn={!!user}
                      isPremium={userSubscriptionStatus === "premium" || userSubscriptionStatus === "lifetime"}
                    />
                  )}

                  {results.activity && (
                    <ResultCard
                      title="Activity"
                      result={results.activity}
                      onFavorite={() => handleToggleFavorite(results.activity!)}
                      isFavorite={favorites.includes(results.activity.id)}
                      onRefresh={() => handleRefresh("activity")}
                      onRandomize={() => handleRandomizeCategory("activity")}
                      isRefreshing={refreshing.activity}
                      isLoggedIn={!!user}
                      isPremium={userSubscriptionStatus === "premium" || userSubscriptionStatus === "lifetime"}
                    />
                  )}
                  {results.outdoor && (
                    <ResultCard
                      title="Outdoor Activity"
                      result={results.outdoor}
                      onFavorite={() => handleToggleFavorite(results.outdoor!)}
                      isFavorite={favorites.includes(results.outdoor.id)}
                      onRefresh={() => handleRefresh("outdoor")}
                      onRandomize={() => handleRandomizeCategory("outdoor")}
                      isRefreshing={refreshing.outdoor}
                      isLoggedIn={!!user}
                      isPremium={userSubscriptionStatus === "premium" || userSubscriptionStatus === "lifetime"}
                    />
                  )}
                </div>

                {/* Add transition to multiple venues - only show if not already in multiple mode */}
                {(results.restaurant || results.activity || results.outdoor) && 
                 (multipleVenues.restaurants.length === 0 && 
                  multipleVenues.activities.length === 0 && 
                  multipleVenues.outdoors.length === 0) && (
                  <div className="text-center my-6">
                    <Button
                      onClick={handleMoveVenuesToMultiple}
                      className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:opacity-90"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Convert to Multiple Venues Mode
                    </Button>
                  </div>
                )}

              </>
            )}

            {/* Multiple Venues Sections */}
            {(multipleVenues.restaurants.length > 0 || 
              multipleVenues.activities.length > 0 || 
              multipleVenues.outdoors.length > 0) && (
              <div className="space-y-6">

                {multipleVenues.restaurants.length > 0 && (
                  <MultipleVenuesSection
                    title="Restaurants"
                    category="restaurants"
                    venues={multipleVenues.restaurants}
                    onAddMore={() => handleAddMoreVenues('restaurants')}
                    onRemove={(venueId) => handleRemoveVenue('restaurants', venueId)}
                    onRandomize={() => handleRandomizeMultipleCategory('restaurants')}
                    onFillEmptySlot={(venueId, venueName) => handleFillEmptySlot('restaurants', venueId, venueName)}
                    onRandomizeEmptySlot={(venueId) => handleRandomizeEmptySlot('restaurants', venueId)}
                    isLoading={isLoading}
                    isLoggedIn={!!user}
                    isPremium={userSubscriptionStatus === "premium" || userSubscriptionStatus === "lifetime"}
                    categoryIcon={<span className="text-sm text-rose-500">🍽️</span>}
                    categoryColor="bg-rose-500 hover:bg-rose-600"
                  />
                )}

                {multipleVenues.activities.length > 0 && (
                  <MultipleVenuesSection
                    title="Activities"
                    category="activities"
                    venues={multipleVenues.activities}
                    onAddMore={() => handleAddMoreVenues('activities')}
                    onRemove={(venueId) => handleRemoveVenue('activities', venueId)}
                    onRandomize={() => handleRandomizeMultipleCategory('activities')}
                    onFillEmptySlot={(venueId, venueName) => handleFillEmptySlot('activities', venueId, venueName)}
                    onRandomizeEmptySlot={(venueId) => handleRandomizeEmptySlot('activities', venueId)}
                    isLoading={isLoading}
                    isLoggedIn={!!user}
                    isPremium={userSubscriptionStatus === "premium" || userSubscriptionStatus === "lifetime"}
                    categoryIcon={<span className="text-sm text-purple-500">🎯</span>}
                    categoryColor="bg-purple-500 hover:bg-purple-600"
                  />
                )}

                {multipleVenues.outdoors.length > 0 && (
                  <MultipleVenuesSection
                    title="Outdoor Activities"
                    category="outdoors"
                    venues={multipleVenues.outdoors}
                    onAddMore={() => handleAddMoreVenues('outdoors')}
                    onRemove={(venueId) => handleRemoveVenue('outdoors', venueId)}
                    onRandomize={() => handleRandomizeMultipleCategory('outdoors')}
                    onFillEmptySlot={(venueId, venueName) => handleFillEmptySlot('outdoors', venueId, venueName)}
                    onRandomizeEmptySlot={(venueId) => handleRandomizeEmptySlot('outdoors', venueId)}
                    isLoading={isLoading}
                    isLoggedIn={!!user}
                    isPremium={userSubscriptionStatus === "premium" || userSubscriptionStatus === "lifetime"}
                    categoryIcon={<span className="text-sm text-emerald-500">🌳</span>}
                    categoryColor="bg-emerald-500 hover:bg-emerald-600"
                  />
                )}

              </div>
            )}
              </>
            )}
          </div>
        </div>
        
        {/* Ad banner at the bottom of the page */}
        <div className="text-center my-6">
          <AdBanner adSlot="6789012345" adFormat="leaderboard" />
        </div>
      </main>
      <Footer />

      {/* Save Date Modal */}
      {isDateModalOpen && (
        <SaveDateModal isOpen={isDateModalOpen} onClose={() => setIsDateModalOpen(false)} places={getPlacesArray()} />
      )}
    </>
  )
}

function ResultCard({
  title,
  result,
  onFavorite,
  isFavorite,
  onRefresh,
  onRandomize,
  isRefreshing,
  isLoggedIn,
  isPremium,
}: {
  title: string
  result: PlaceResult
  onFavorite: () => void
  isFavorite: boolean
  onRefresh: () => void
  onRandomize?: () => void
  isRefreshing?: boolean
  isLoggedIn: boolean
  isPremium?: boolean
}) {
  // Determine the icon and color based on the category
  const getCategoryIcon = () => {
    switch (result.category) {
      case "restaurant":
        return <span className="text-sm text-rose-500">🍽️</span>
      case "activity":
        return <span className="text-sm text-purple-500">🎯</span>
      case "outdoor":
        return <span className="text-sm text-emerald-500">🌳</span>
      default:
        return null
    }
  }

  return (
    <Card
      className={cn(
        "transform transition-all hover:scale-[1.02] group overflow-hidden",
        result.category === "outdoor" && "border-emerald-200",
      )}
    >
      {result.photoUrl && (
        <div className="h-40 w-full overflow-hidden">
          <Image
            src={result.photoUrl || "/placeholder.svg"}
            alt={result.name}
            width={500}
            height={300}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
            crossOrigin="anonymous"
          />
        </div>
      )}
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-3 px-4">
        <div className="flex items-center gap-2">
          <CardTitle className="text-xl font-semibold">{title}</CardTitle>
          {getCategoryIcon()}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onFavorite()
            }}
            className={cn(
              "h-8 w-8", 
              !isLoggedIn ? "text-gray-400 hover:text-rose-500" :
              "text-rose-500"
            )}
            title={
              !isLoggedIn ? "Login to save favorites" :
              isFavorite ? "Remove from favorites" : "Add to favorites"
            }
          >
            <Heart className={cn("h-4 w-4", isFavorite && "fill-current")} />
            <span className="sr-only">Favorite {title}</span>
          </Button>
          {onRandomize && (
            <Button
              size="icon"
              variant="ghost"
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onRandomize()
              }}
              disabled={isRefreshing}
              className="h-8 w-8 transition-opacity"
              title={`Surprise me with a different ${title.toLowerCase()}`}
            >
              <Sparkles className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
              <span className="sr-only">Randomize {title}</span>
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onRefresh()
            }}
            disabled={isRefreshing}
            className="h-8 w-8 transition-opacity"
          >
            <RefreshCcw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            <span className="sr-only">Refresh {title}</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="py-2 px-4">
        <div className="space-y-2">
          <h3 className="font-medium text-lg">{result.name}</h3>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center">
              <Star className="h-4 w-4 text-yellow-500 mr-1" />
              <span className="text-sm">{result.rating?.toFixed(1) || 'N/A'}</span>
            </div>
            <div className="text-sm text-muted-foreground">
              {Array.from({ length: result.price }).map((_, i) => (
                <span key={i} className="text-green-500">
                  $
                </span>
              ))}
            </div>
            {result.openNow !== undefined && (
              <div className="text-sm">
                {result.openNow ? (
                  <span className="text-green-600">Open now</span>
                ) : (
                  <span className="text-red-500">Closed</span>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between items-center py-2 px-4">
        <div className="flex items-center text-sm text-muted-foreground">
          <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
          <p className="truncate">{result.address}</p>
        </div>
      </CardFooter>
    </Card>
  )
}

