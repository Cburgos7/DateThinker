"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  Compass,
  MapPin,
  Star,
  Clock,
  Heart,
  Search,
  Filter,
  Grid,
  List,
  TrendingUp,
  Users,
  Eye,
  Plus,
  ArrowRight,
  Check
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { toast } from '@/hooks/use-toast'
import { toggleFavorite as toggleFavoriteAction } from "@/app/actions/favorites"
import { addToPlanningStack, getPlanningStack } from "@/app/actions/planning-stack"
import { VenueDetailsModal } from "@/components/venue-details-modal"

interface Venue {
  id: string
  name: string
  rating?: number
  priceLevel?: number
  image?: string
  photos?: string[]
  description?: string
  category: 'restaurant' | 'activity' | 'event'
  address?: string
  phone?: string
  website?: string
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

interface PlaceResult {
  id: string;
  name: string;
  address: string;
  rating: number;
  price: number;
  photoUrl: string;
  category: "restaurant" | "activity" | "event";
  placeId: string;
  phone?: string;
  website?: string;
  description?: string;
}

export function ExploreSimple() {
  const router = useRouter()
  const [userLocation, setUserLocation] = useState<string>('')
  const [city, setCity] = useState('')
  const [userCoordinates, setUserCoordinates] = useState<{lat: number, lng: number} | null>(null)
  const cityLockedRef = useRef(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [venues, setVenues] = useState<Venue[]>([])
  const [trendingVenues, setTrendingVenues] = useState<Venue[]>([])
  const [socialData, setSocialData] = useState<SocialData | null>(null)
  const [loading, setLoading] = useState(true)
  const [trendingLoading, setTrendingLoading] = useState(true)
  const [socialLoading, setSocialLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [favorites, setFavorites] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [stackVenueIds, setStackVenueIds] = useState<string[]>([])
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null)
  const lastFetchKeyRef = useRef<string | null>(null)
  const isFetchingVenuesRef = useRef(false)
  const isFetchingTrendingRef = useRef(false)
  const isFetchingSocialRef = useRef(false)
  const TEST_MODE = typeof window !== 'undefined' && (process.env.NEXT_PUBLIC_TEST_MODE === 'true')

  // Get user's location
  const locationRequestedRef = useRef(false)
  const requestLocation = async () => {
    if (locationRequestedRef.current) return
    locationRequestedRef.current = true
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser.')
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
      
      // Store coordinates for use in venue searches
      setUserCoordinates({ lat: latitude, lng: longitude })
      
      const response = TEST_MODE ? null : await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
      )
      
      if (!response && TEST_MODE) {
        if (!cityLockedRef.current && (!city || city === '')) {
          setUserLocation('Test City, MN')
          setCity('Test City')
        }
      } else if (response && response.ok) {
        const data = await response.json()
        const city = data.city || data.locality || data.principalSubdivision || 'Unknown Location'
        const region = data.principalSubdivision || data.countryName || ''
        const locationString = region ? `${city}, ${region}` : city
        
        if (!cityLockedRef.current && (!city || city === '')) {
          setUserLocation(locationString)
          setCity(city)
        }
      } else {
        if (!cityLockedRef.current && (!city || city === '')) {
          setUserLocation(`Location near ${latitude.toFixed(2)}, ${longitude.toFixed(2)}`)
          setCity('Unknown Location')
        }
      }
    } catch (error) {
      console.error('Error getting location:', error)
      setLocationError('Unable to get your location. Please enter your city manually.')
    } finally {
      setIsGettingLocation(false)
    }
  }

  // Initialize from URL city if present, else request geolocation once
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const cityParam = params.get('city')
      if (cityParam && cityParam.trim()) {
        setCity(cityParam)
        setUserLocation(cityParam)
        cityLockedRef.current = true
        return
      }
      const saved = window.localStorage.getItem('dt_city')
      if (saved && saved.trim()) {
        setCity(saved)
        setUserLocation(saved)
        cityLockedRef.current = true
        return
      }
    } catch {}
    requestLocation()
  }, [])

  useEffect(() => {
    if (city && city.trim()) {
      try { window.localStorage.setItem('dt_city', city) } catch {}
    }
  }, [city])

  // Load planning stack on mount
  useEffect(() => {
    const loadStack = async () => {
      try {
        const items = await getPlanningStack()
        setStackVenueIds(items.map(i => i.venue_id))
      } catch (e) {
        // noop
      }
    }
    loadStack()
  }, [])

  // Fetch social data
  const fetchSocialData = useCallback(async (city: string) => {
    if (!city) return
    if (isFetchingSocialRef.current) return
    isFetchingSocialRef.current = true
    setSocialLoading(true)
    try {
      if (TEST_MODE) { setSocialData(null); return }
      const response = await fetch(`/api/explore?city=${encodeURIComponent(city)}&social=true`)
      if (!response.ok) throw new Error('Failed to fetch social data')
      
      const data = await response.json()
      setSocialData(data)
    } catch (error) {
      console.error('Error fetching social data:', error)
      setSocialData(null)
    } finally {
      setSocialLoading(false)
      isFetchingSocialRef.current = false
    }
  }, [])

  // Fetch trending venues
  const fetchTrendingVenues = useCallback(async (city: string) => {
    if (!city) return
    if (isFetchingTrendingRef.current) return
    isFetchingTrendingRef.current = true
    setTrendingLoading(true)
    try {
      if (TEST_MODE) { setTrendingVenues([]); return }
      const response = await fetch(`/api/explore?city=${encodeURIComponent(city)}&trending=true&limit=6`)
      if (!response.ok) throw new Error('Failed to fetch trending venues')
      
      const data = await response.json()
      setTrendingVenues(data.venues || [])
    } catch (error) {
      console.error('Error fetching trending venues:', error)
      setTrendingVenues([])
    } finally {
      setTrendingLoading(false)
      isFetchingTrendingRef.current = false
    }
  }, [])

  // Fetch venues
  const fetchVenues = useCallback(async (
    city: string,
    pageNum: number = 1,
    append: boolean = false,
    categoryParam?: string,
    currentIds?: string[]
  ) => {
    if (!city) return
    if (isFetchingVenuesRef.current) return
    
    if (pageNum === 1) {
      setLoading(true)
      setError(null)
    } else {
      setLoadingMore(true)
    }

    try {
      isFetchingVenuesRef.current = true
      const excludeIds = pageNum === 1 ? [] : (currentIds || [])
      const categoryQuery = categoryParam && categoryParam !== 'all' ? `&category=${encodeURIComponent(categoryParam)}` : ''
      // Use a smaller page size to better enable Load More
      // Build query parameters
      const params = new URLSearchParams({
        city: city,
        page: pageNum.toString(),
        limit: '25', // Increased to ensure we get at least 20+ places
        excludeIds: excludeIds.join(',')
      })
      
      // Add category if specified
      if (categoryParam && categoryParam !== 'all') {
        params.set('category', categoryParam)
      }
      
      // Add coordinates if available
      if (userCoordinates) {
        params.set('lat', userCoordinates.lat.toString())
        params.set('lng', userCoordinates.lng.toString())
      }
      
      const response = await fetch(`/api/explore?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch venues')
      }
      
      const data = await response.json()
      const incoming = Array.isArray(data.venues) ? data.venues : []
      const addedCount = append && currentIds ? incoming.filter((v: any) => !currentIds.includes(v.id)).length : incoming.length
      
      if (append) {
        setVenues(prev => [...prev, ...incoming])
      } else {
        setVenues(incoming)
      }
      
      setHasMore(addedCount > 0)
      setPage(pageNum)
    } catch (error) {
      console.error('Error fetching venues:', error)
      setError('Failed to load venues. Please try again.')
    } finally {
      setLoading(false)
      setLoadingMore(false)
      isFetchingVenuesRef.current = false
    }
  }, [])

  // Load data when city changes
  useEffect(() => {
    if (!city) return
    const key = `${city}|${selectedCategory}`
    if (lastFetchKeyRef.current === key) return
    lastFetchKeyRef.current = key
    fetchVenues(city, 1, false, selectedCategory)
    fetchTrendingVenues(city)
    fetchSocialData(city)
  }, [city, selectedCategory, fetchVenues, fetchTrendingVenues, fetchSocialData])

  // Handle search
  const handleSearch = () => {}

  // Handle category filter
  const handleCategoryFilter = (category: string) => {
    setSelectedCategory(category)
    fetchVenues(city, 1, false, category)
  }

  // Handle favorite toggle
  const handleFavoriteToggle = async (venue: Venue) => {
    try {
      // Convert Venue to PlaceResult format
      const placeResult: PlaceResult = {
        id: venue.id,
        name: venue.name,
        address: venue.address || '',
        rating: venue.rating || 0,
        price: venue.priceLevel || 0,
        photoUrl: venue.image || '',
        category: venue.category,
        placeId: venue.id, // Add this for redundancy
        phone: venue.phone,
        website: venue.website,
        description: venue.description
      }

      const result = await toggleFavoriteAction(placeResult)

      if (result.success) {
        setFavorites(prev => 
          prev.includes(venue.id) 
            ? prev.filter(id => id !== venue.id)
            : [...prev, venue.id]
        )
        toast({
          title: result.isFavorite ? "Added to favorites" : "Removed from favorites",
          description: `${venue.name} has been ${result.isFavorite ? 'added to' : 'removed from'} your favorites.`,
        })
      }
    } catch (error) {
      console.error("Error toggling favorite:", error)
      toast({
        title: "Error",
        description: "Failed to update favorites.",
        variant: "destructive",
      })
    }
  }

  // Handle add to planning stack
  const handleAddToStack = async (venue: Venue) => {
    try {
      const result = await addToPlanningStack({
        id: venue.id,
        name: venue.name,
        address: venue.address || '',
        rating: venue.rating,
        price: venue.priceLevel || 2,
        photoUrl: venue.image,
        category: venue.category,
        placeId: venue.id,
        phone: venue.phone,
        website: venue.website,
        description: venue.description
      })

      if (result.success) {
        setStackVenueIds(prev => prev.includes(venue.id) ? prev : [...prev, venue.id])
        toast({
          title: "Added to planning stack",
          description: `${venue.name} has been added to your planning stack.`,
        })
      } else {
        toast({
          title: "Already in stack",
          description: result.error || "This venue is already in your planning stack.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error adding to planning stack:", error)
      toast({
        title: "Error",
        description: "Failed to add venue to planning stack.",
        variant: "destructive",
      })
    }
  }

  // Open details modal
  const openDetails = (venue: Venue) => {
    setSelectedVenue(venue)
    setDetailsOpen(true)
  }

  // Toggle favorite by id for modal
  const handleToggleFavoriteById = (venueId: string) => {
    const venue = venues.find(v => v.id === venueId) || trendingVenues.find(v => v.id === venueId)
    if (venue) {
      handleFavoriteToggle(venue)
    }
  }

  // Load more venues
  const loadMore = () => {
    if (!loadingMore && city) {
      fetchVenues(city, page + 1, true, selectedCategory, venues.map(v => v.id))
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'restaurant':
        return '🍽️'
      case 'activity':
        return '🎯'
      case 'event':
        return '🎪'
      default:
        return '📍'
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'restaurant':
        return 'bg-orange-100 text-orange-800'
      case 'activity':
        return 'bg-blue-100 text-blue-800'
      case 'event':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (locationError && !city) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Location Required</h2>
            <p className="text-gray-600 mb-4">{locationError}</p>
            <div className="space-y-2">
              <Input
                placeholder="Enter your city (e.g., New York, NY)"
                value={city}
                onChange={(e) => { setCity(e.target.value); cityLockedRef.current = true }}
                className="max-w-md mx-auto"
              />
              <Button onClick={() => fetchVenues(city)} disabled={!city.trim()}>
                Explore {city}
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header Section */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Explore</h1>
              <p className="text-gray-600">
                {isGettingLocation ? 'Getting your location...' : 
                 userLocation ? `Discovering ${userLocation}` : 'Enter your city to start exploring'}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              >
                {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Location only input for Explore */}
          <div className="flex space-x-2">
            <Input
              placeholder="Enter your city (e.g., Saint Paul, MN)"
              value={city}
              onChange={(e) => { setCity(e.target.value); cityLockedRef.current = true; setUserLocation(e.target.value) }}
              className="flex-1"
            />
            <Button onClick={() => fetchVenues(city, 1, false, selectedCategory)} disabled={!city.trim()}>
              Explore
            </Button>
            <Button variant="outline" onClick={() => { cityLockedRef.current = false; requestLocation() }}>
              <MapPin className="w-4 h-4" />
            </Button>
          </div>

          {/* Category Filters */}
          <div className="flex space-x-2 mt-4 overflow-x-auto pb-2">
            {['all', 'restaurant', 'activity', 'event'].map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => handleCategoryFilter(category)}
                className="whitespace-nowrap"
              >
                {category === 'all' ? 'All' : 
                 category === 'restaurant' ? '🍽️ Restaurants' :
                 category === 'activity' ? '🎯 Activities' :
                 '🎪 Events'}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4">
        {/* Trending Section */}
        {!loading && trendingVenues.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                Trending Now
              </h2>
              <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                {socialData?.totalUsersExploring || 0} people exploring
              </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {trendingVenues.slice(0, 6).map((venue) => (
                <Card key={venue.id} className="group hover:shadow-lg transition-shadow cursor-pointer" onClick={() => openDetails(venue)}>
                  <CardContent className="p-4">
                    {(venue.image || (venue.photos && venue.photos[0])) ? (
                      <div className="mb-3 rounded-lg overflow-hidden aspect-video bg-gray-100">
                        <img
                          src={venue.image || (venue.photos && venue.photos[0]) || ''}
                          alt={venue.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            // Hide the image on error and show fallback content
                            e.currentTarget.style.display = 'none'
                            e.currentTarget.nextElementSibling?.classList.remove('hidden')
                          }}
                        />
                        <div className="hidden w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-blue-50 to-purple-50">
                          <div className="text-3xl mb-2">
                            {venue.category === 'restaurant' ? '🍽️' : 
                             venue.category === 'activity' ? '🎯' : 
                             venue.category === 'event' ? '🎪' : '📍'}
                          </div>
                          <h3 className="font-semibold text-gray-800 text-sm mb-1">{venue.name}</h3>
                          <Badge variant="outline" className="text-xs capitalize">
                            {venue.category}
                          </Badge>
                        </div>
                      </div>
                    ) : (
                      <div className="mb-3 rounded-lg aspect-video bg-gradient-to-br from-blue-50 to-purple-50 flex flex-col items-center justify-center p-4 text-center">
                        <div className="text-3xl mb-2">
                          {venue.category === 'restaurant' ? '🍽️' : 
                           venue.category === 'activity' ? '🎯' : 
                           venue.category === 'event' ? '🎪' : '📍'}
                        </div>
                        <h3 className="font-semibold text-gray-800 text-sm mb-1">{venue.name}</h3>
                        <Badge variant="outline" className="text-xs capitalize">
                          {venue.category}
                        </Badge>
                      </div>
                    )}
                    <div className="flex items-start justify-between mb-2">
                      <Badge className={getCategoryColor(venue.category)}>
                        {getCategoryIcon(venue.category)} {venue.category}
                      </Badge>
                      {venue.trending && (
                        <Badge variant="destructive" className="text-xs">
                          {venue.trending_reason || 'Trending'}
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-semibold text-lg mb-1 group-hover:text-blue-600 transition-colors">
                      {venue.name}
                    </h3>
                    <p className="text-gray-600 text-sm mb-2">{venue.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {venue.rating && (
                          <div className="flex items-center">
                            <Star className="w-4 h-4 text-yellow-400 fill-current" />
                            <span className="text-sm">{venue.rating}</span>
                          </div>
                        )}
                        {venue.priceLevel && (
                          <span className="text-sm text-gray-500">
                            {'$'.repeat(venue.priceLevel)}
                          </span>
                        )}
                      </div>
                      <div className="flex space-x-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => { e.stopPropagation(); handleFavoriteToggle(venue) }}
                        >
                          <Heart className={cn("w-4 h-4", favorites.includes(venue.id) && "fill-red-500 text-red-500")} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => { e.stopPropagation(); handleAddToStack(venue) }}
                          disabled={stackVenueIds.includes(venue.id)}
                        >
                          {stackVenueIds.includes(venue.id) ? <Check className="w-4 h-4 text-green-600" /> : <Plus className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Main Venues Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Discover Places</h2>
            {loading && <div className="text-sm text-gray-500">Loading...</div>}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-6 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <>
              <div className={cn(
                "gap-4",
                viewMode === 'grid' 
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3" 
                  : "space-y-4"
              )}>
                {venues.map((venue) => (
                  <Card key={venue.id} className="group hover:shadow-lg transition-shadow cursor-pointer" onClick={() => openDetails(venue)}>
                    <CardContent className="p-4">
                      {(venue.image || (venue.photos && venue.photos[0])) ? (
                        <div className="mb-3 rounded-lg overflow-hidden aspect-video bg-gray-100">
                          <img
                            src={venue.image || (venue.photos && venue.photos[0]) || ''}
                            alt={venue.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            onError={(e) => {
                              // Hide the image on error and show fallback content
                              e.currentTarget.style.display = 'none'
                              e.currentTarget.nextElementSibling?.classList.remove('hidden')
                            }}
                          />
                          <div className="hidden w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-blue-50 to-purple-50">
                            <div className="text-3xl mb-2">
                              {venue.category === 'restaurant' ? '🍽️' : 
                               venue.category === 'activity' ? '🎯' : 
                               venue.category === 'event' ? '🎪' : '📍'}
                            </div>
                            <h3 className="font-semibold text-gray-800 text-sm mb-1">{venue.name}</h3>
                            <Badge variant="outline" className="text-xs capitalize">
                              {venue.category}
                            </Badge>
                          </div>
                        </div>
                      ) : (
                        <div className="mb-3 rounded-lg aspect-video bg-gradient-to-br from-blue-50 to-purple-50 flex flex-col items-center justify-center p-4 text-center">
                          <div className="text-3xl mb-2">
                            {venue.category === 'restaurant' ? '🍽️' : 
                             venue.category === 'activity' ? '🎯' : 
                             venue.category === 'event' ? '🎪' : '📍'}
                          </div>
                          <h3 className="font-semibold text-gray-800 text-sm mb-1">{venue.name}</h3>
                          <Badge variant="outline" className="text-xs capitalize">
                            {venue.category}
                          </Badge>
                        </div>
                      )}
                      <div className="flex items-start justify-between mb-2">
                        <Badge className={getCategoryColor(venue.category)}>
                          {getCategoryIcon(venue.category)} {venue.category}
                        </Badge>
                        {venue.openNow && (
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            <Clock className="w-3 h-3 mr-1" />
                            Open
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-semibold text-lg mb-1 group-hover:text-blue-600 transition-colors">
                        {venue.name}
                      </h3>
                      <p className="text-gray-600 text-sm mb-2">{venue.description}</p>
                      {venue.address && (
                        <p className="text-gray-500 text-sm mb-2 flex items-center">
                          <MapPin className="w-3 h-3 mr-1" />
                          {venue.address}
                        </p>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {venue.rating && (
                            <div className="flex items-center">
                              <Star className="w-4 h-4 text-yellow-400 fill-current" />
                              <span className="text-sm">{venue.rating}</span>
                            </div>
                          )}
                          {venue.priceLevel && (
                            <span className="text-sm text-gray-500">
                              {'$'.repeat(venue.priceLevel)}
                            </span>
                          )}
                        </div>
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => { e.stopPropagation(); handleFavoriteToggle(venue) }}
                          >
                            <Heart className={cn("w-4 h-4", favorites.includes(venue.id) && "fill-red-500 text-red-500")} />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => { e.stopPropagation(); handleAddToStack(venue) }}
                            disabled={stackVenueIds.includes(venue.id)}
                          >
                            {stackVenueIds.includes(venue.id) ? <Check className="w-4 h-4 text-green-600" /> : <Plus className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Load More Button */}
              {venues.length > 0 && (
                <div className="text-center mt-8">
                  <Button
                    onClick={loadMore}
                    disabled={loadingMore}
                    variant="outline"
                    className="px-8"
                  >
                    {loadingMore ? 'Loading...' : 'Load More'}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
    </div>

    {/* Venue Details Modal */}
    <VenueDetailsModal
      isOpen={detailsOpen}
      onClose={() => setDetailsOpen(false)}
      venue={selectedVenue as any}
      onPlanDate={(v) => {
        // Map modal details back to add function
        handleAddToStack({
          id: v.id,
          name: v.name,
          rating: v.rating,
          priceLevel: v.priceLevel,
          image: v.image || (v.photos && v.photos[0]) || v.photoUrl,
          photos: v.photos,
          description: v.description,
          category: v.category as any,
          address: v.address,
          phone: v.phone,
          website: v.website,
          openNow: v.openNow,
        })
      }}
      onToggleFavorite={(id) => handleToggleFavoriteById(id)}
    />
    </div>
  )
}
