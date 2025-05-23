"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  RefreshCcw,
  Search,
  Heart,
  Sparkles,
  DollarSign,
  TreePine,
  Utensils,
  Dumbbell,
  Wine,
  MapPin,
  Star,
  Save,
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
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { type User } from "@supabase/supabase-js"
import { Skeleton } from "@/components/ui/skeleton"

// Add this at the top of the file
const BYPASS_AUTH_CHECK = typeof window !== 'undefined' ? 
                         window.localStorage.getItem('bypass_auth_check') === 'true' ||
                         window.sessionStorage.getItem('bypass_auth_check') === 'true' :
                         false;

export default function Page() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [city, setCity] = useState("")
  const [placeId, setPlaceId] = useState<string | undefined>(undefined)
  const [priceRange, setPriceRange] = useState(0) // 0 means no price filter
  const [favorites, setFavorites] = useState<string[]>([])
  const [filters, setFilters] = useState({
    restaurants: true,
    activities: false,
    drinks: false,
    outdoors: false,
  })
  const [results, setResults] = useState<SearchResults>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [isLoadingUser, setIsLoadingUser] = useState(true)
  const [isDateModalOpen, setIsDateModalOpen] = useState(false)
  const [authCheckFailed, setAuthCheckFailed] = useState(false)
  const [showBypassOption, setShowBypassOption] = useState(false)

  const [refreshing, setRefreshing] = useState<{
    restaurant?: boolean
    activity?: boolean
    drink?: boolean
    outdoor?: boolean
  }>({})

  // Simplified user fetch effect
  useEffect(() => {
    let mounted = true

    async function fetchUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (mounted) {
          setUser(user)
          setIsLoadingUser(false)
        }
      } catch (error) {
        console.error("Error fetching user:", error)
        if (mounted) {
          setIsLoadingUser(false)
        }
      }
    }

    fetchUser()

    return () => {
      mounted = false
    }
  }, [])

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

  // Check if Places are in favorites
  useEffect(() => {
    async function checkFavorites() {
      if (!user || !results) return

      const newFavorites: string[] = []
      for (const [key, place] of Object.entries(results)) {
        if (place) {
          try {
            const isFavorite = await checkIsFavorite(place.id)
            if (isFavorite) {
              newFavorites.push(place.id)
            }
          } catch (error) {
            console.error(`Error checking if ${key} is favorite:`, error)
          }
        }
      }

      setFavorites(newFavorites)
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

  const handleSearch = async (e?: React.FormEvent, searchFilters = filters, searchPriceRange = priceRange) => {
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
          priceRange: searchPriceRange,
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
            priceRange: searchPriceRange,
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

      setResults(data)
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
            priceRange,
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
              priceRange,
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
      drinks: Math.random() > 0.5, // 50% chance of including drinks
      outdoors: Math.random() > 0.5, // 50% chance of outdoor options
    }

    // Ensure at least one filter is selected
    if (!randomFilters.restaurants && !randomFilters.activities && !randomFilters.drinks && !randomFilters.outdoors) {
      randomFilters.restaurants = true
    }

    // Set random price range (1-3)
    const randomPrice = Math.floor(Math.random() * 3) + 1

    console.log("Surprise Me filters:", randomFilters, "price:", randomPrice)

    // Directly pass the random filters to the search function
    // instead of updating state and then searching
    handleSearch(undefined, randomFilters, randomPrice)
  }

  const handleToggleFavorite = async (place: PlaceResult) => {
    // If user is not logged in, redirect to login page
    if (!user) {
      router.push("/login?redirect=/")
      return
    }

    // Toggle favorite
    try {
      const result = await toggleFavorite(place)

      if (result.success) {
        setFavorites((prev) => (result.isFavorite ? [...prev, place.id] : prev.filter((id) => id !== place.id)))
      }
    } catch (error) {
      console.error("Error toggling favorite:", error)
    }
  }

  // Get all places from results as an array
  const getPlacesArray = (): PlaceResult[] => {
    const places: PlaceResult[] = []

    if (results.restaurant) places.push(results.restaurant)
    if (results.activity) places.push(results.activity)
    if (results.drink) places.push(results.drink)
    if (results.outdoor) places.push(results.outdoor)

    return places
  }

  const handleSaveDatePlan = () => {
    // Open the save date modal directly without authentication check
    setIsDateModalOpen(true)
  }

  // Handle auth bypass if needed
  const handleBypassAuth = () => {
    // Store the bypass flag in both localStorage and sessionStorage
    window.localStorage.setItem('bypass_auth_check', 'true');
    window.sessionStorage.setItem('bypass_auth_check', 'true');
    
    // Force a page reload to apply the bypass
    window.location.reload();
  };

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

  // Add auth check failed UI
  if (authCheckFailed) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[var(--gradient-start)] to-[var(--gradient-end)]">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <h2 className="text-2xl font-semibold mb-4">Authentication Check Failed</h2>
              <p className="text-gray-600 mb-4">We're having trouble verifying your session.</p>
              <Button onClick={() => router.push('/login?showForm=true&manualSignIn=true')} className="mb-4">
                Sign In Again
              </Button>
              {showBypassOption && (
                <div className="mt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      window.localStorage.setItem('bypass_auth_check', 'true')
                      window.location.reload()
                    }}
                  >
                    Continue Anyway
                  </Button>
                </div>
              )}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

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
                  <Utensils className="h-4 w-4 mr-2" />
                  Restaurants
                </Toggle>
                <Toggle
                  pressed={filters.activities}
                  onPressedChange={(pressed) => setFilters((prev) => ({ ...prev, activities: pressed }))}
                  className="data-[state=on]:bg-purple-200 data-[state=on]:text-purple-800"
                >
                  <Dumbbell className="h-4 w-4 mr-2" />
                  Activities
                </Toggle>
                <Toggle
                  pressed={filters.drinks}
                  onPressedChange={(pressed) => setFilters((prev) => ({ ...prev, drinks: pressed }))}
                  className="data-[state=on]:bg-blue-200 data-[state=on]:text-blue-800"
                >
                  <Wine className="h-4 w-4 mr-2" />
                  Drinks
                </Toggle>
                <Toggle
                  pressed={filters.outdoors}
                  onPressedChange={(pressed) => setFilters((prev) => ({ ...prev, outdoors: pressed }))}
                  className="data-[state=on]:bg-emerald-200 data-[state=on]:text-emerald-800"
                >
                  <TreePine className="h-4 w-4 mr-2" />
                  Outdoors
                </Toggle>
              </div>

              <div className="flex flex-wrap gap-3 md:gap-4 justify-center">
                <Toggle
                  pressed={priceRange === 1}
                  onPressedChange={() => setPriceRange((prev) => (prev === 1 ? 0 : 1))}
                  className="data-[state=on]:bg-green-200 data-[state=on]:text-green-800"
                >
                  <DollarSign className="h-4 w-4 mr-1" />
                  Budget
                </Toggle>
                <Toggle
                  pressed={priceRange === 2}
                  onPressedChange={() => setPriceRange((prev) => (prev === 2 ? 0 : 2))}
                  className="data-[state=on]:bg-green-200 data-[state=on]:text-green-800"
                >
                  <DollarSign className="h-4 w-4 mr-1" />
                  <DollarSign className="h-4 w-4" />
                  Moderate
                </Toggle>
                <Toggle
                  pressed={priceRange === 3}
                  onPressedChange={() => setPriceRange((prev) => (prev === 3 ? 0 : 3))}
                  className="data-[state=on]:bg-green-200 data-[state=on]:text-green-800"
                >
                  <DollarSign className="h-4 w-4 mr-1" />
                  <DollarSign className="h-4 w-4 mr-1" />
                  <DollarSign className="h-4 w-4" />
                  Luxury
                </Toggle>
              </div>

              <div className="flex gap-4">
                <Button
                  type="submit"
                  className="flex-1 h-12 text-lg bg-gradient-to-r from-rose-500 to-purple-500 hover:opacity-90"
                  disabled={isLoading}
                >
                  {isLoading ? <div className="animate-pulse">Finding perfect spots...</div> : "Find Date Ideas"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSurpriseMe}
                  className="group"
                  disabled={isLoading}
                >
                  <Sparkles className="h-5 w-5 mr-2 group-hover:animate-spin" />
                  Surprise Me
                </Button>
              </div>

              {error && <div className="text-center text-red-500 animate-appear">{error}</div>}
            </form>

            {/* Ad Banner */}
            <div className="text-center my-6">
              <AdBanner adSlot="make-date-top" adFormat="leaderboard" />
            </div>

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

            {/* Middle ad banner - shown when no results yet */}
            {Object.keys(results).length === 0 && <AdBanner adSlot="7890123456" adFormat="rectangle" />}

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
                      isRefreshing={refreshing.restaurant}
                      isLoggedIn={!!user}
                    />
                  )}

                  {/* Ad between results */}
                  {results.restaurant && (results.activity || results.drink || results.outdoor) && (
                    <AdBanner adSlot="2345678901" adFormat="rectangle" className="my-2" />
                  )}

                  {results.activity && (
                    <ResultCard
                      title="Activity"
                      result={results.activity}
                      onFavorite={() => handleToggleFavorite(results.activity!)}
                      isFavorite={favorites.includes(results.activity.id)}
                      onRefresh={() => handleRefresh("activity")}
                      isRefreshing={refreshing.activity}
                      isLoggedIn={!!user}
                    />
                  )}
                  {results.drink && (
                    <ResultCard
                      title="Drinks"
                      result={results.drink}
                      onFavorite={() => handleToggleFavorite(results.drink!)}
                      isFavorite={favorites.includes(results.drink.id)}
                      onRefresh={() => handleRefresh("drink")}
                      isRefreshing={refreshing.drink}
                      isLoggedIn={!!user}
                    />
                  )}
                  {results.outdoor && (
                    <ResultCard
                      title="Outdoor Activity"
                      result={results.outdoor}
                      onFavorite={() => handleToggleFavorite(results.outdoor!)}
                      isFavorite={favorites.includes(results.outdoor.id)}
                      onRefresh={() => handleRefresh("outdoor")}
                      isRefreshing={refreshing.outdoor}
                      isLoggedIn={!!user}
                    />
                  )}
                </div>

                {/* Bottom ad banner - after results */}
                <div className="text-center my-6">
                  <AdBanner adSlot="5678901234" adFormat="leaderboard" />
                </div>
              </>
            )}
          </div>
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
  isRefreshing,
  isLoggedIn,
}: {
  title: string
  result: PlaceResult
  onFavorite: () => void
  isFavorite: boolean
  onRefresh: () => void
  isRefreshing?: boolean
  isLoggedIn: boolean
}) {
  // Determine the icon and color based on the category
  const getCategoryIcon = () => {
    switch (result.category) {
      case "restaurant":
        return <Utensils className="h-4 w-4 text-rose-500" />
      case "activity":
        return <Dumbbell className="h-4 w-4 text-purple-500" />
      case "drink":
        return <Wine className="h-4 w-4 text-blue-500" />
      case "outdoor":
        return <TreePine className="h-4 w-4 text-emerald-500" />
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
            onClick={onFavorite}
            className={cn("h-8 w-8", isLoggedIn ? "text-rose-500" : "text-gray-400 hover:text-rose-500")}
            title={isLoggedIn ? (isFavorite ? "Remove from favorites" : "Add to favorites") : "Login to save favorites"}
          >
            <Heart className={cn("h-4 w-4", isFavorite && "fill-current")} />
            <span className="sr-only">Favorite {title}</span>
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={onRefresh}
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
              <span className="text-sm">{result.rating.toFixed(1)}</span>
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

