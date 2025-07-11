"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
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
  DollarSign,
  Plus,
  TrendingUp,
  Users,
  Eye,
  Calendar as CalendarIcon
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
import { toast } from '@/hooks/use-toast'

interface Venue {
  id: string
  name: string
  rating?: number
  priceLevel?: number
  image?: string
  description?: string
  category: 'restaurant' | 'activity' | 'outdoor' | 'event'
  address?: string
  location?: string
  openNow?: boolean
  isFavorite?: boolean
  trending?: boolean
  trending_reason?: string
}

interface SocialData {
  recentActivity: Array<{
    id: string
    type: string
    venue: string
    timeAgo: string
    userCount: number
  }>
  popularThisWeek: Array<{
    venue: string
    interactions: number
    favorites: number
    plans: number
  }>
  totalUsersExploring: number
  totalVenuesViewed: number
}

export default function ExplorePage() {
  const router = useRouter()
  const { user } = useAuth()
  const [city, setCity] = useState("")
  const [userLocation, setUserLocation] = useState<string>('')
  const [locationError, setLocationError] = useState<string | null>(null)
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt' | null>(null)
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [venues, setVenues] = useState<Venue[]>([])
  const [trendingVenues, setTrendingVenues] = useState<Venue[]>([])
  const [socialData, setSocialData] = useState<SocialData | null>(null)
  const [loading, setLoading] = useState(true)
  const [trendingLoading, setTrendingLoading] = useState(true)
  const [socialLoading, setSocialLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [activeFilters, setActiveFilters] = useState({
    restaurants: false,
    activities: false,
    outdoors: false,
    events: false,
  })
  const [favorites, setFavorites] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  
  // Get user's location
  const requestLocation = async () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser.')
      setLocationPermission('denied')
      return
    }

    setIsGettingLocation(true)
    setLocationError(null)

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        })
      })

      // Reverse geocode the coordinates to get city name
      const { latitude, longitude } = position.coords
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
      )
      
      if (response.ok) {
        const data = await response.json()
        const city = data.city || data.locality || data.principalSubdivision || 'Unknown Location'
        const region = data.principalSubdivision || data.countryName || ''
        const locationString = region ? `${city}, ${region}` : city
        
        setUserLocation(locationString)
        setLocationPermission('granted')
      } else {
        // Fallback: use a generic location based on coordinates
        setUserLocation(`Location near ${latitude.toFixed(2)}, ${longitude.toFixed(2)}`)
        setLocationPermission('granted')
      }
    } catch (error) {
      console.error('Error getting location:', error)
      setLocationError('Unable to get your location. Please enter your city manually.')
      setLocationPermission('denied')
    } finally {
      setIsGettingLocation(false)
    }
  }

  // Auto-request location on page load
  useEffect(() => {
    requestLocation()
  }, [])

  // Fetch social data
  const fetchSocialData = useCallback(async (city: string) => {
    if (!city) return
    
    setSocialLoading(true)
    try {
      const response = await fetch(`/api/explore?city=${encodeURIComponent(city)}&social=true`)
      if (!response.ok) throw new Error('Failed to fetch social data')
      
      const data = await response.json()
      setSocialData(data)
    } catch (error) {
      console.error('Error fetching social data:', error)
      setSocialData(null)
    } finally {
      setSocialLoading(false)
    }
  }, [])

  // Fetch trending venues
  const fetchTrendingVenues = useCallback(async (city: string) => {
    if (!city) return
    
    setTrendingLoading(true)
    try {
      const response = await fetch(`/api/explore?city=${encodeURIComponent(city)}&trending=true&limit=8`)
      if (!response.ok) throw new Error('Failed to fetch trending venues')
      
      const data = await response.json()
      setTrendingVenues(data.venues || [])
    } catch (error) {
      console.error('Error fetching trending venues:', error)
      setTrendingVenues([])
    } finally {
      setTrendingLoading(false)
    }
  }, [])

  // Fetch venues function
  const fetchVenues = useCallback(async (city: string, pageNum: number = 1, append: boolean = false, currentVenues: Venue[] = []) => {
    if (!city) return
    
    if (pageNum === 1) {
      setLoading(true)
      setError(null)
    } else {
      setLoadingMore(true)
    }

    try {
      const excludeIds = pageNum === 1 ? [] : currentVenues.map(v => v.id)
      const response = await fetch(`/api/explore?city=${encodeURIComponent(city)}&page=${pageNum}&limit=20&excludeIds=${excludeIds.join(',')}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch venues')
      }
      
      const data = await response.json()
      
      if (append) {
        setVenues(prev => [...prev, ...data.venues])
      } else {
        setVenues(data.venues)
      }
      
      setHasMore(data.hasMore)
      setPage(pageNum)
    } catch (error) {
      console.error('Error fetching venues:', error)
      setError('Failed to load venues. Please try again.')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  // Load initial data when location is available
  useEffect(() => {
    if (userLocation && locationPermission === 'granted') {
      fetchVenues(userLocation, 1, false, [])
      fetchTrendingVenues(userLocation)
      fetchSocialData(userLocation)
    }
  }, [userLocation, locationPermission]) // Only load when we have a real location

  // Filter venues based on search and category
  const filteredVenues = useMemo(() => venues.filter(venue => {
    const matchesSearch = venue.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         venue.description?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || venue.category === selectedCategory
    return matchesSearch && matchesCategory
  }), [venues, searchQuery, selectedCategory])

  const handlePlanDate = (venue: Venue) => {
    // Navigate to make-date page with pre-selected venue
    const params = new URLSearchParams({
      city: userLocation,
      preselected: venue.id,
      name: venue.name,
      category: venue.category
    })
    router.push(`/make-date?${params.toString()}`)
  }

  const handleManualLocationSearch = () => {
    if (city.trim()) {
      setUserLocation(city.trim())
      setLocationPermission('granted')
      setLocationError(null)
      // Reset city input
      setCity('')
    }
  }

  const toggleFavorite = async (venueId: string) => {
    // Update UI immediately
    setVenues(prev => prev.map(venue => 
      venue.id === venueId 
        ? { ...venue, isFavorite: !venue.isFavorite }
        : venue
    ))
    
    // TODO: Make API call to update favorites
    toast({
      title: "Favorite updated",
      description: "Your preference has been saved.",
    })
  }

  const getSocialProofText = (venueId: string) => {
    // Generate random social proof for demo
    const visitors = Math.floor(Math.random() * 15) + 1
    const favorites = Math.floor(Math.random() * 8) + 1
    
    if (visitors > 10) {
      return `${visitors} people visited this week`
    } else if (favorites > 5) {
      return `${favorites} people favorited this`
    } else {
      return `${visitors} people are exploring this`
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'favorite':
        return <Heart className="w-3 h-3 text-red-500" />
      case 'visit':
        return <Eye className="w-3 h-3 text-blue-500" />
      case 'plan':
        return <CalendarIcon className="w-3 h-3 text-green-500" />
      default:
        return <Users className="w-3 h-3 text-gray-500" />
    }
  }

  const renderVenueCard = (venue: Venue, showTrendingBadge: boolean = false) => (
    <Card key={`venue-${venue.id}-${venue.category}`} className="group hover:shadow-lg transition-all duration-300 cursor-pointer">
      <div className="relative">
        <img 
          src={venue.image || 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80'} 
          alt={venue.name}
          className="w-full h-48 object-cover rounded-t-lg"
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.src = 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80'
          }}
        />
        {showTrendingBadge && venue.trending && (
          <Badge className="absolute top-2 left-2 bg-orange-500 text-white">
            <TrendingUp className="w-3 h-3 mr-1" />
            {venue.trending_reason || 'Trending'}
          </Badge>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 bg-white/80 hover:bg-white"
          onClick={(e) => {
            e.stopPropagation()
            toggleFavorite(venue.id)
          }}
        >
          <Heart className={`w-4 h-4 ${venue.isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
        </Button>
      </div>
      
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-lg group-hover:text-blue-600 transition-colors">
            {venue.name}
          </h3>
          <div className="flex items-center space-x-1">
            {venue.rating && (
              <div className="flex items-center">
                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                <span className="text-sm ml-1">{venue.rating}</span>
              </div>
            )}
          </div>
        </div>
        
        <p className="text-gray-600 text-sm mb-2 line-clamp-2">
          {venue.description || 'Discover something new'}
        </p>
        
        {/* Social Proof */}
        <div className="flex items-center space-x-1 mb-3">
          <Users className="w-3 h-3 text-gray-400" />
          <span className="text-xs text-gray-500">
            {getSocialProofText(venue.id)}
          </span>
        </div>
        
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs">
              {venue.category}
            </Badge>
            {venue.priceLevel && venue.priceLevel > 0 && (
              <div className="flex items-center">
                {[...Array(venue.priceLevel)].map((_, i) => (
                  <DollarSign key={i} className="w-3 h-3 text-green-600" />
                ))}
              </div>
            )}
          </div>
          
          {venue.openNow !== undefined && (
            <div className="flex items-center space-x-1">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className={`text-xs ${venue.openNow ? 'text-green-600' : 'text-red-600'}`}>
                {venue.openNow ? 'Open' : 'Closed'}
              </span>
            </div>
          )}
        </div>
        
        <div className="flex space-x-2">
          <Button 
            size="sm" 
            className="flex-1"
            onClick={() => handlePlanDate(venue)}
          >
            Plan a Date Here
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              // TODO: Open venue details modal
              toast({
                title: "Coming soon",
                description: "Venue details will be available soon.",
              })
            }}
          >
            Details
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  // Show location permission prompt if no location
  if (isGettingLocation || (!userLocation && locationPermission !== 'denied')) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
          <div className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <Navigation className="w-12 h-12 mx-auto mb-4 text-blue-600" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Getting Your Location</h2>
                <p className="text-gray-600 mb-4">
                  {isGettingLocation ? 'Finding amazing places near you...' : 'Please allow location access to discover nearby venues'}
                </p>
                <div className="flex justify-center">
                  <Compass className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  // Show manual location input if permission denied
  if (!userLocation && locationPermission === 'denied') {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
          <div className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center max-w-md">
                <MapPin className="w-12 h-12 mx-auto mb-4 text-orange-600" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Enter Your Location</h2>
                <p className="text-gray-600 mb-6">
                  {locationError || 'Please enter your city to discover amazing places nearby'}
                </p>
                
                <div className="flex space-x-2 mb-4">
                  <div className="relative flex-1">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Enter city (e.g., San Francisco, CA)"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="pl-10"
                      onKeyPress={(e) => e.key === 'Enter' && handleManualLocationSearch()}
                    />
                  </div>
                  <Button onClick={handleManualLocationSearch} disabled={!city.trim()}>
                    Search
                  </Button>
                </div>
                
                <div className="text-center">
                  <Button 
                    variant="outline" 
                    onClick={requestLocation}
                    className="text-sm"
                  >
                    <Navigation className="w-4 h-4 mr-2" />
                    Try Location Again
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  if (loading) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
          <div className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <Compass className="w-8 h-8 mx-auto mb-4 animate-spin text-blue-600" />
                <p className="text-gray-600">Discovering amazing places near you...</p>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  if (error) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={() => fetchVenues(userLocation, 1, false, [])}>
                Try Again
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </>
    )
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
                  <span>Showing results for {userLocation}</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={requestLocation}
                    className="ml-2 text-xs"
                  >
                    <Navigation className="h-3 w-3 mr-1" />
                    Update Location
                  </Button>
                </div>
              )}
              
              {locationError && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4 max-w-md mx-auto">
                  <p className="text-sm text-orange-700">{locationError}</p>
                </div>
              )}
            </div>

            {/* Social Activity Summary */}
            {socialData && (
              <div className="mb-8">
                <div className="flex items-center space-x-4 text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-1">
                    <Users className="w-4 h-4" />
                    <span>{socialData.totalUsersExploring} people exploring nearby</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Eye className="w-4 h-4" />
                    <span>{socialData.totalVenuesViewed} venues viewed today</span>
                  </div>
                </div>
              </div>
            )}

            {/* Trending Section */}
            {trendingVenues.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center space-x-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-orange-500" />
                  <h2 className="text-xl font-semibold">Trending Now</h2>
                </div>
                
                {trendingLoading ? (
                  <div className="flex space-x-4 overflow-x-auto pb-4">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="flex-shrink-0 w-64 h-48 bg-gray-200 rounded-lg animate-pulse"></div>
                    ))}
                  </div>
                ) : (
                  <div className="flex space-x-4 overflow-x-auto pb-4">
                    {trendingVenues.map(venue => (
                      <div key={`trending-${venue.id}-${venue.category}`} className="flex-shrink-0 w-64">
                        {renderVenueCard(venue, true)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Recent Activity Section */}
            {socialData && socialData.recentActivity.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center space-x-2 mb-4">
                  <Users className="w-5 h-5 text-blue-500" />
                  <h2 className="text-xl font-semibold">Recent Activity</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {socialData.recentActivity.map(activity => (
                    <Card key={activity.id} className="p-4">
                      <div className="flex items-center space-x-2">
                        {getActivityIcon(activity.type)}
                        <div>
                          <p className="text-sm font-medium">{activity.venue}</p>
                          <p className="text-xs text-gray-500">
                            {activity.userCount} people • {activity.timeAgo}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

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
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Change location..."
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="pl-10"
                      onKeyPress={(e) => e.key === 'Enter' && handleManualLocationSearch()}
                    />
                  </div>
                  <Button 
                    onClick={handleManualLocationSearch} 
                    disabled={!city.trim()}
                    size="sm"
                  >
                    Update
                  </Button>
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
                    {hasMore && ` • More available`}
                  </span>
                </div>
              </div>
            </div>

            {/* Results */}
            {loading ? (
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
                {filteredVenues.map((venue: Venue, index: number) => renderVenueCard(venue, false))}
              </div>
            )}

            {/* Load More */}
            {hasMore && !loading && (
              <div ref={loadMoreRef} className="mt-8 text-center">
                <Button 
                  onClick={() => fetchVenues(userLocation, page + 1, true, venues)}
                  disabled={loadingMore}
                  className="px-8"
                >
                  {loadingMore ? 'Loading...' : 'Load More'}
                </Button>
              </div>
            )}

            {filteredVenues.length === 0 && !loading && (
              <div className="text-center py-12">
                <Compass className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No venues found</h3>
                <p className="text-gray-600 mb-4">
                  Try adjusting your search or filters, or enter a different city.
                </p>
                <Button onClick={() => fetchVenues(userLocation, 1, false, [])}>
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