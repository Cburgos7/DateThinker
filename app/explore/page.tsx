"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Compass,
  MapPin,
  Star,
  Clock,
  Calendar,
  Heart,
  Navigation,
  Grid,
  List,
  Filter,
  Search,
  Camera,
  DollarSign
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Toggle } from "@/components/ui/toggle"
import { Badge } from "@/components/ui/badge"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"
import { type PlaceResult } from "@/lib/search-utils"
import Image from "next/image"

export default function ExplorePage() {
  const router = useRouter()
  const { user } = useAuth()
  const [city, setCity] = useState("")
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [venues, setVenues] = useState<PlaceResult[]>([])
  const [filteredVenues, setFilteredVenues] = useState<PlaceResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState("")
  const [activeFilters, setActiveFilters] = useState({
    restaurants: false,
    activities: false,
    outdoors: false,
    events: false,
  })
  const [favorites, setFavorites] = useState<string[]>([])

  // Get user's location on component mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
          // Reverse geocode to get city name
          reverseGeocode(position.coords.latitude, position.coords.longitude)
        },
        (error) => {
          console.error("Error getting location:", error)
          setLocationError("Unable to get your location. Please enter a city manually.")
        }
      )
    } else {
      setLocationError("Geolocation is not supported by this browser.")
    }
  }, [])

  // Load nearby venues when location is available
  useEffect(() => {
    if (userLocation || city) {
      loadNearbyVenues()
    }
  }, [userLocation, city])

  // Filter venues based on search and filters
  useEffect(() => {
    let filtered = venues

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(venue => 
        venue.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        venue.address.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Apply category filters
    const hasActiveFilters = Object.values(activeFilters).some(Boolean)
    if (hasActiveFilters) {
      filtered = filtered.filter(venue => {
        return (
          (activeFilters.restaurants && venue.category === 'restaurant') ||
          (activeFilters.activities && venue.category === 'activity') ||
          (activeFilters.outdoors && venue.category === 'outdoor') ||
          (activeFilters.events && venue.category === 'event')
        )
      })
    }

    setFilteredVenues(filtered)
  }, [venues, searchQuery, activeFilters])

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`)
      const data = await response.json()
      if (data.results && data.results.length > 0) {
        const cityResult = data.results.find((result: any) => 
          result.types.includes('locality') || result.types.includes('administrative_area_level_1')
        )
        if (cityResult) {
          const cityName = cityResult.address_components.find(
            (component: any) => component.types.includes('locality')
          )?.long_name || cityResult.address_components[0].long_name
          setCity(cityName)
        }
      }
    } catch (error) {
      console.error("Error reverse geocoding:", error)
    }
  }

  const getMockVenues = (): PlaceResult[] => {
    return [
      {
        id: "mock-restaurant-1",
        name: "The Rooftop Garden",
        address: "Downtown, 123 Main St",
        rating: 4.5,
        price: 3,
        category: "restaurant",
        photoUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop",
        openNow: true,
        placeId: "mock-restaurant-1"
      },
      {
        id: "mock-activity-1",
        name: "Art Gallery Downtown",
        address: "Arts District, 456 Gallery Ave",
        rating: 4.2,
        price: 2,
        category: "activity",
        photoUrl: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&h=300&fit=crop",
        openNow: true,
        placeId: "mock-activity-1"
      },
      {
        id: "mock-outdoor-1",
        name: "Sunset Point Trail",
        address: "Nature Reserve, Trail Head #3",
        rating: 4.8,
        price: 1,
        category: "outdoor",
        photoUrl: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=300&fit=crop",
        openNow: true,
        placeId: "mock-outdoor-1"
      },
      {
        id: "mock-restaurant-2",
        name: "Cozy Corner Café",
        address: "Old Town, 789 Bistro Blvd",
        rating: 4.3,
        price: 2,
        category: "restaurant",
        photoUrl: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400&h=300&fit=crop",
        openNow: false,
        placeId: "mock-restaurant-2"
      },
      {
        id: "mock-activity-2",
        name: "Escape Room Adventure",
        address: "Entertainment District, 321 Fun St",
        rating: 4.6,
        price: 2,
        category: "activity",
        photoUrl: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop",
        openNow: true,
        placeId: "mock-activity-2"
      },
      {
        id: "mock-event-1",
        name: "Jazz Night at Blue Note",
        address: "Music Quarter, 555 Jazz Ave",
        rating: 4.7,
        price: 3,
        category: "event",
        photoUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=300&fit=crop",
        openNow: true,
        placeId: "mock-event-1"
      },
      {
        id: "mock-outdoor-2",
        name: "Riverside Park",
        address: "Waterfront, 888 River Rd",
        rating: 4.4,
        price: 1,
        category: "outdoor",
        photoUrl: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=300&fit=crop",
        openNow: true,
        placeId: "mock-outdoor-2"
      },
      {
        id: "mock-restaurant-3",
        name: "Sushi Zen",
        address: "Japanese Quarter, 999 Sushi St",
        rating: 4.9,
        price: 4,
        category: "restaurant",
        photoUrl: "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400&h=300&fit=crop",
        openNow: true,
        placeId: "mock-restaurant-3"
      },
      {
        id: "mock-activity-3",
        name: "Pottery Workshop",
        address: "Creative District, 111 Clay Ave",
        rating: 4.1,
        price: 2,
        category: "activity",
        photoUrl: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop",
        openNow: true,
        placeId: "mock-activity-3"
      },
      {
        id: "mock-event-2",
        name: "Wine Tasting Evening",
        address: "Vineyard District, 222 Wine Way",
        rating: 4.5,
        price: 3,
        category: "event",
        photoUrl: "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=400&h=300&fit=crop",
        openNow: false,
        placeId: "mock-event-2"
      },
      {
        id: "mock-outdoor-3",
        name: "Botanical Gardens",
        address: "Green District, 333 Flora St",
        rating: 4.6,
        price: 2,
        category: "outdoor",
        photoUrl: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=300&fit=crop",
        openNow: true,
        placeId: "mock-outdoor-3"
      },
      {
        id: "mock-restaurant-4",
        name: "Street Tacos Fiesta",
        address: "Food Truck Plaza, 444 Taco Ln",
        rating: 4.2,
        price: 1,
        category: "restaurant",
        photoUrl: "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop",
        openNow: true,
        placeId: "mock-restaurant-4"
      }
    ]
  }

  const loadNearbyVenues = async () => {
    if (!city && !userLocation) return
    
    setIsLoading(true)
    try {
      // Try to fetch real data from the new explore API
      const response = await fetch("/api/explore", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          city,
          maxResults: 20,
          excludeIds: venues.map(v => v.id), // Exclude already loaded venues
        }),
      })

      if (response.ok) {
        const data = await response.json()
        console.log(`Loaded ${data.venues.length} real venues from API`)
        
        // Use real data if available, otherwise fall back to mock data
        if (data.venues && data.venues.length > 0) {
          setVenues(data.venues)
        } else {
          console.log("No real venues found, using mock data")
          setVenues(getMockVenues())
        }
      } else {
        console.log("API request failed, using mock data")
        setVenues(getMockVenues())
      }
    } catch (error) {
      console.error("Error loading nearby venues:", error)
      // Fallback to mock data even if API fails
      console.log("Using mock data as fallback")
      setVenues(getMockVenues())
    } finally {
      setIsLoading(false)
    }
  }

  const handlePlanDateWithVenue = (venue: PlaceResult) => {
    // Navigate to make-date page with this venue pre-selected
    router.push(`/make-date?venue=${venue.id}&city=${encodeURIComponent(city)}`)
  }

  const handleToggleFavorite = async (venue: PlaceResult) => {
    // Similar to make-date page favorite logic
    if (!user) {
      router.push("/login?redirect=/explore")
      return
    }

    try {
      const response = await fetch('/api/favorites/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ place: venue }),
      })
      
      if (response.ok) {
        const result = await response.json()
        if (result.isFavorite) {
          setFavorites(prev => [...prev, venue.id])
        } else {
          setFavorites(prev => prev.filter(id => id !== venue.id))
        }
      }
    } catch (error) {
      console.error("Error toggling favorite:", error)
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'restaurant': return 'bg-rose-100 text-rose-800'
      case 'activity': return 'bg-purple-100 text-purple-800'
      case 'outdoor': return 'bg-emerald-100 text-emerald-800'
      case 'event': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'restaurant': return '🍽️'
      case 'activity': return '🎯'
      case 'outdoor': return '🌳'
      case 'event': return '🎭'
      default: return '📍'
    }
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            {/* Header Section */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Explore Near You
              </h1>
              <p className="text-lg text-gray-600 mb-4">
                Discover amazing places and activities in your area
              </p>
              
              {userLocation && (
                <div className="flex items-center justify-center text-sm text-gray-500 mb-4">
                  <Navigation className="h-4 w-4 mr-1" />
                  <span>Using your current location</span>
                </div>
              )}
              
              {locationError && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4 max-w-md mx-auto">
                  <p className="text-sm text-orange-700">{locationError}</p>
                </div>
              )}
            </div>

            {/* Search and Filters */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <div className="flex flex-col space-y-4">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search places..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                {/* City Input */}
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Enter city..."
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-2 items-center">
                  <Filter className="h-4 w-4 text-gray-400 mr-2" />
                  <Toggle
                    pressed={activeFilters.restaurants}
                    onPressedChange={(pressed) => setActiveFilters(prev => ({...prev, restaurants: pressed}))}
                    className="data-[state=on]:bg-rose-200 data-[state=on]:text-rose-800"
                  >
                    🍽️ Restaurants
                  </Toggle>
                  <Toggle
                    pressed={activeFilters.activities}
                    onPressedChange={(pressed) => setActiveFilters(prev => ({...prev, activities: pressed}))}
                    className="data-[state=on]:bg-purple-200 data-[state=on]:text-purple-800"
                  >
                    🎯 Activities
                  </Toggle>
                  <Toggle
                    pressed={activeFilters.outdoors}
                    onPressedChange={(pressed) => setActiveFilters(prev => ({...prev, outdoors: pressed}))}
                    className="data-[state=on]:bg-emerald-200 data-[state=on]:text-emerald-800"
                  >
                    🌳 Outdoors
                  </Toggle>
                  <Toggle
                    pressed={activeFilters.events}
                    onPressedChange={(pressed) => setActiveFilters(prev => ({...prev, events: pressed}))}
                    className="data-[state=on]:bg-yellow-200 data-[state=on]:text-yellow-800"
                  >
                    🎭 Events
                  </Toggle>
                </div>

                {/* View Mode Toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                    >
                      <Grid className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                  <span className="text-sm text-gray-500">
                    {filteredVenues.length} places found
                  </span>
                </div>
              </div>
            </div>

            {/* Results */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <div className="h-48 bg-gray-200 rounded-t-lg"></div>
                    <CardContent className="p-4">
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className={cn(
                "grid gap-6",
                viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'
              )}>
                {filteredVenues.map((venue) => (
                  <Card key={venue.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    {/* Venue Image */}
                    <div className="relative h-48 bg-gray-100">
                      {venue.photoUrl ? (
                        <Image
                          src={venue.photoUrl}
                          alt={venue.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-400">
                          <Camera className="h-8 w-8" />
                        </div>
                      )}
                      
                      {/* Favorite Button */}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="absolute top-2 right-2 bg-white/80 hover:bg-white"
                        onClick={() => handleToggleFavorite(venue)}
                      >
                        <Heart className={cn(
                          "h-4 w-4",
                          favorites.includes(venue.id) ? "fill-red-500 text-red-500" : "text-gray-600"
                        )} />
                      </Button>
                    </div>

                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-1">{venue.name}</h3>
                          <p className="text-sm text-gray-600 mb-2">{venue.address}</p>
                        </div>
                        <Badge className={getCategoryColor(venue.category)}>
                          {getCategoryIcon(venue.category)} {venue.category}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 mr-1" />
                            <span className="text-sm font-medium">{venue.rating}</span>
                          </div>
                          <div className="flex items-center">
                            <DollarSign className="h-4 w-4 text-gray-400 mr-1" />
                            <span className="text-sm">{'$'.repeat(venue.price)}</span>
                          </div>
                        </div>
                        {venue.openNow !== undefined && (
                          <Badge variant={venue.openNow ? 'default' : 'secondary'}>
                            <Clock className="h-3 w-3 mr-1" />
                            {venue.openNow ? 'Open' : 'Closed'}
                          </Badge>
                        )}
                      </div>

                      <Button
                        onClick={() => handlePlanDateWithVenue(venue)}
                        className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:opacity-90"
                      >
                        <Calendar className="h-4 w-4 mr-2" />
                        Plan a Date Here
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {filteredVenues.length === 0 && !isLoading && (
              <div className="text-center py-12">
                <Compass className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No places found</h3>
                <p className="text-gray-600 mb-4">
                  Try adjusting your search or filters, or enter a different city.
                </p>
                <Button onClick={loadNearbyVenues}>
                  Refresh Results
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
} 