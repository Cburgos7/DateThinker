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
  Calendar as CalendarIcon,
  Trash2,
  Save,
  ArrowUp,
  ArrowDown,
  Edit3,
  X,
  Check,
  RefreshCw
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Toggle } from "@/components/ui/toggle"
import { Badge } from "@/components/ui/badge"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { VenueDetailsModal } from "@/components/venue-details-modal"
import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"
import { type PlaceResult } from "@/lib/search-utils"
import Image from "next/image"
import { toast } from '@/hooks/use-toast'
import { toggleFavorite as toggleFavoriteAction } from "@/app/actions/favorites"
import { addToPlanningStack } from "@/app/actions/planning-stack"
import { getPlanningStack } from "@/app/actions/planning-stack"

interface Venue {
  id: string
  name: string
  rating?: number
  priceLevel?: number
  image?: string
  photos?: string[]
  description?: string
  category: 'restaurant' | 'activity' | 'outdoor' | 'event'
  address?: string
  location?: string
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

export default function ExplorePage() {
  const router = useRouter()
  const { user } = useAuth()
  const [userLocation, setUserLocation] = useState<string>('')
  const [city, setCity] = useState('') // Add back city state for manual input
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
  const [useLoadMoreButton, setUseLoadMoreButton] = useState(false) // New state for hybrid approach
  const [discoveryMode, setDiscoveryMode] = useState(false) // Track if we're in discovery mode
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [planningStackIds, setPlanningStackIds] = useState<string[]>([])
  
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

  // Fetch venues function with increased limit for better infinite scrolling
  const fetchVenues = useCallback(async (city: string, pageNum: number = 1, append: boolean = false, currentVenues: Venue[] = []) => {
    if (!city) return
    
    if (pageNum === 1) {
      setLoading(true)
      setError(null)
      setUseLoadMoreButton(false) // Reset on new search
    } else {
      setLoadingMore(true)
    }

    try {
      const excludeIds = pageNum === 1 ? [] : currentVenues.map(v => v.id)
      // Increased limit from 20 to 50 for better infinite scrolling experience
      const response = await fetch(`/api/explore?city=${encodeURIComponent(city)}&page=${pageNum}&limit=50&excludeIds=${excludeIds.join(',')}`)
      
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
      
      // Switch to Load More button after 3 pages to save on API costs
      if (pageNum >= 3 && data.hasMore) {
        setUseLoadMoreButton(true)
      }
      
      // Enable discovery mode after 5 pages
      if (pageNum >= 5) {
        setDiscoveryMode(true)
      }
    } catch (error) {
      console.error('Error fetching venues:', error)
      setError('Failed to load venues. Please try again.')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  // Load more venues when user scrolls to bottom (only if not using Load More button)
  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore && userLocation && !useLoadMoreButton) {
      fetchVenues(userLocation, page + 1, true, venues)
    }
  }, [loadingMore, hasMore, userLocation, page, venues, fetchVenues, useLoadMoreButton])

  // Intersection Observer for infinite scrolling (only active when not using Load More button)
  useEffect(() => {
    if (useLoadMoreButton) return // Don't observe if we're using Load More button
    
    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0]
        if (target.isIntersecting && hasMore && !loadingMore) {
          loadMore()
        }
      },
      {
        rootMargin: '100px', // Start loading 100px before reaching the bottom
        threshold: 0.1
      }
    )

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current)
    }

    return () => {
      if (loadMoreRef.current) {
        observer.unobserve(loadMoreRef.current)
      }
    }
  }, [hasMore, loadingMore, loadMore, useLoadMoreButton])

  // Load initial data when location is available
  useEffect(() => {
    if (userLocation && locationPermission === 'granted') {
      fetchVenues(userLocation, 1, false, [])
      fetchTrendingVenues(userLocation)
      fetchSocialData(userLocation)
    }
  }, [userLocation, locationPermission]) // Only load when we have a real location

  useEffect(() => {
    if (user) {
      loadPlanningStackIds()
    }
  }, [user])

  const loadPlanningStackIds = async () => {
    try {
      const stack = await getPlanningStack()
      setPlanningStackIds(stack.map(item => item.venue_id))
    } catch (error) {
      console.error("Error loading planning stack IDs:", error)
    }
  }

  // Log venue state changes
  useEffect(() => {
    console.log(`Venues state changed:`, {
      totalVenues: venues.length,
      categoryBreakdown: venues.reduce((acc, v) => {
        acc[v.category] = (acc[v.category] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    })
  }, [venues])

  // Filter venues based on active filters
  const filteredVenues = useMemo(() => {
    // Check if any filters are active
    const hasActiveFilters = Object.values(activeFilters).some(filter => filter)
    
    if (!hasActiveFilters) {
      // If no filters are active, show all venues
      console.log(`Filtered venues (no filters active):`, {
        totalVenues: venues.length,
        filteredCount: venues.length,
        activeFilters,
        categoryBreakdown: venues.reduce((acc, v) => {
          acc[v.category] = (acc[v.category] || 0) + 1
          return acc
        }, {} as Record<string, number>)
      })
      return venues
    }
    
    // Filter venues based on active category filters
    const filtered = venues.filter(venue => {
      // Map venue categories to filter keys
      const categoryMap: Record<string, keyof typeof activeFilters> = {
        'restaurant': 'restaurants',
        'activity': 'activities', 
        'outdoor': 'outdoors',
        'event': 'events'
      }
      
      const filterKey = categoryMap[venue.category]
      return filterKey ? activeFilters[filterKey] : false
    })
    
    console.log(`Filtered venues (filters active):`, {
      totalVenues: venues.length,
      filteredCount: filtered.length,
      activeFilters,
      categoryBreakdown: venues.reduce((acc, v) => {
        acc[v.category] = (acc[v.category] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      filteredCategoryBreakdown: filtered.reduce((acc, v) => {
        acc[v.category] = (acc[v.category] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    })
    
    return filtered
  }, [venues, activeFilters])

  const handleDiscoverySearch = async (query: string) => {
    if (!userLocation) return
    
    setLoading(true)
    setError(null)
    
    try {
      const excludeIds = venues.map(v => v.id)
      const response = await fetch(`/api/explore/discovery?city=${encodeURIComponent(userLocation)}&query=${encodeURIComponent(query)}&limit=20&excludeIds=${excludeIds.join(',')}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch discovery venues')
      }
      
      const data = await response.json()
      setVenues(prev => [...prev, ...data.venues])
      setHasMore(data.hasMore)
      setDiscoveryMode(true)
      
      toast({
        title: "Discovery Results",
        description: `Found ${data.venues.length} new ${query.toLowerCase()} venues!`
      })
    } catch (error) {
      console.error('Error fetching discovery venues:', error)
      setError('Failed to load discovery venues. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCategoryDiscovery = async (category: string) => {
    if (!userLocation) return
    
    setLoading(true)
    setError(null)
    
    try {
      // Use existing venue IDs to prevent duplicates
      const excludeIds: string[] = venues.map(v => v.id)
      
      // Use category-specific search strategy
      let searchQuery = category
      let apiEndpoint = '/api/explore/discovery'
      
      // Map categories to specific search terms and API strategies
      switch (category) {
        case 'restaurants':
          searchQuery = 'restaurants food dining'
          break
        case 'activities':
          searchQuery = 'activities entertainment recreation'
          break
        case 'outdoors':
          searchQuery = 'outdoors parks nature trails'
          break
        case 'events':
          searchQuery = 'events concerts shows'
          break
        default:
          searchQuery = category
      }
      
                 const response = await fetch(`${apiEndpoint}?city=${encodeURIComponent(userLocation)}&query=${encodeURIComponent(searchQuery)}&limit=150&excludeIds=${excludeIds.join(',')}&category=${category}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch category discovery venues')
      }
      
      const data = await response.json()
      console.log(`Category discovery response for ${category}:`, {
        venuesReturned: data.venues.length,
        hasMore: data.hasMore,
        totalVenuesBefore: venues.length,
        totalVenuesAfter: venues.length + data.venues.length
      })
      setVenues(prev => {
        const newVenues = [...prev, ...data.venues]
        console.log(`Venues state updated:`, {
          previousCount: prev.length,
          newVenuesCount: data.venues.length,
          totalCount: newVenues.length,
          newVenues: data.venues.slice(0, 3).map((v: any) => ({ name: v.name, category: v.category }))
        })
        return newVenues
      })
             setHasMore(data.hasMore)
       setDiscoveryMode(true)
       
       // Only update active filters if they're not already set (for discovery buttons, not filter toggles)
       const isFilterToggle = activeFilters[category as keyof typeof activeFilters]
       if (!isFilterToggle) {
         setActiveFilters(prev => ({
           ...prev,
           restaurants: category === 'restaurants' ? true : prev.restaurants,
           activities: category === 'activities' ? true : prev.activities,
           outdoors: category === 'outdoors' ? true : prev.outdoors,
           events: category === 'events' ? true : prev.events,
         }))
       }
      
      toast({
        title: "Category Discovery",
        description: `Found ${data.venues.length} new ${category.toLowerCase()} venues!`
      })
    } catch (error) {
      console.error('Error fetching category discovery venues:', error)
      setError('Failed to load category discovery venues. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handlePlanDate = (venue: Venue) => {
    // Add debugging at the very start
    console.log('🔥 PLAN DATE CLICKED - Function started')
    console.log('🔥 Venue data received:', venue)
    console.log('🔥 User data:', user)
    console.log('🔥 User location:', userLocation)

    if (!user) {
      console.log('🔥 No user - redirecting to login')
      toast({
        title: "Sign in required",
        description: "Please sign in to plan a date.",
        variant: "destructive"
      })
      router.push('/login')
      return
    }

    try {
      console.log('🔥 Converting venue to PlaceResult...')
      
      // Convert venue to complete PlaceResult format for make-date page
      const placeResult: PlaceResult = {
        id: venue.id,
        name: venue.name,
        rating: venue.rating || 4.0,
        address: venue.address || venue.location || '',
        price: venue.priceLevel || 2,
        category: venue.category,
        photoUrl: venue.image,
        openNow: venue.openNow,
        placeId: venue.id,
        phone: venue.phone,
        website: venue.website,
        description: venue.description
      }

      console.log('🔥 PlaceResult created:', placeResult)

      // Navigate to make-date page with complete venue data (as JSON array)
      const params = new URLSearchParams({
        city: userLocation,
        preselected: JSON.stringify([placeResult]), // Send as JSON array
        mode: 'single',
        source: 'explore'
      })

      console.log('🔥 URL params created:', params.toString())
      console.log('🔥 About to navigate to:', `/make-date?${params.toString()}`)
      
      toast({
        title: "Planning your date...",
        description: `Starting with ${venue.name}`
      })

      router.push(`/make-date?${params.toString()}`)
      console.log('🔥 Navigation completed')
      
    } catch (error) {
      console.error('🔥 ERROR in handlePlanDate:', error)
      toast({
        title: "Error",
        description: "Failed to start date planning. Please try again.",
        variant: "destructive"
      })
    }
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

  const openVenueDetails = (venue: Venue) => {
    setSelectedVenue(venue)
    setIsDetailsModalOpen(true)
  }

  const closeVenueDetails = () => {
    setIsDetailsModalOpen(false)
    setSelectedVenue(null)
  }

  const handleToggleFavorite = async (venue: Venue) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to save favorites.",
        variant: "destructive"
      })
      return
    }

    try {
      // Convert venue to PlaceResult format for the API
      const placeResult: PlaceResult = {
        id: venue.id,
        name: venue.name,
        rating: venue.rating || 4.0,
        address: venue.address || venue.location || '',
        price: venue.priceLevel || 2,
        category: venue.category,
        photoUrl: venue.image,
        openNow: venue.openNow,
        placeId: venue.id,
        phone: venue.phone,
        website: venue.website,
        description: venue.description
      }

      // Call the proper API function
      const result = await toggleFavoriteAction(placeResult)
      
      if (result.success) {
        // Update UI with the actual database state
        setVenues(prev => prev.map(v => 
          v.id === venue.id 
            ? { ...v, isFavorite: result.isFavorite }
            : v
        ))
        
        toast({
          title: "Favorite updated",
          description: result.isFavorite ? "Added to favorites" : "Removed from favorites",
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to update favorite. Please try again.",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error toggling favorite:', error)
      toast({
        title: "Error", 
        description: "Failed to update favorite. Please try again.",
        variant: "destructive"
      })
    }
  }

  const handleAddToStack = async (venue: Venue) => {
    console.log("🔍 handleAddToStack called with venue:", venue) // Debug log
    
    if (!user) {
      console.log("❌ No user found") // Debug log
      toast({
        title: "Please sign in",
        description: "You need to be signed in to add venues to your planning stack.",
        variant: "destructive",
      })
      return
    }

    console.log("✅ User found:", user.email) // Debug log

    try {
      console.log("🔄 Converting venue to PlaceResult format...") // Debug log
      
      const placeResult = {
        id: venue.id,
        name: venue.name,
        category: venue.category,
        address: venue.address || '',
        rating: venue.rating,
        price: venue.priceLevel || 0, // Default to 0 if priceLevel is undefined
        photoUrl: venue.image,
      }
      
      console.log("📦 PlaceResult:", placeResult) // Debug log
      
      const result = await addToPlanningStack(placeResult)

      console.log(" addToPlanningStack result:", result) // Debug log

      if (result.success) {
        // Refresh the planning stack IDs
        await loadPlanningStackIds()
        toast({
          title: "Added to planning stack!",
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
      console.error("❌ Error adding to planning stack:", error)
      toast({
        title: "Error",
        description: "Failed to add venue to planning stack.",
        variant: "destructive",
      })
    }
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

  // Update the renderVenueCard function to remove fallbacks
  const renderVenueCard = (venue: Venue, showTrendingBadge: boolean = false) => (
    <Card key={`venue-${venue.id}-${venue.category}`} className="group hover:shadow-lg transition-all duration-300 cursor-pointer">
      <div className="relative">
        {venue.image ? (
          <img 
            src={venue.image} 
            alt={venue.name}
            className="w-full h-48 object-cover rounded-t-lg"
          />
        ) : (
          <div className="w-full h-48 bg-gray-200 rounded-t-lg flex items-center justify-center">
            <span className="text-gray-500 text-sm">No image available</span>
          </div>
        )}
        
        {/* Status Badges */}
        <div className="absolute top-2 left-2 flex flex-col space-y-1">
          {venue.isFavorite && (
            <Badge className="bg-red-500 text-white text-xs">
              <Heart className="w-3 h-3 mr-1 fill-current" />
              Favorited
            </Badge>
          )}
          {planningStackIds.includes(venue.id) && (
            <Badge className="bg-blue-500 text-white text-xs">
              <Plus className="w-3 h-3 mr-1" />
              In Stack
            </Badge>
          )}
        </div>
        
        {showTrendingBadge && venue.trending && (
          <Badge className="absolute top-2 right-2 bg-orange-500 text-white">
            <TrendingUp className="w-3 h-3 mr-1" />
            {venue.trending_reason || 'Trending'}
          </Badge>
        )}
        {!showTrendingBadge && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2 bg-white/80 hover:bg-white"
            onClick={(e) => {
              e.stopPropagation()
              handleToggleFavorite(venue)
            }}
          >
            <Heart className={`w-4 h-4 ${venue.isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
          </Button>
        )}
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
        
        {venue.description && (
          <p className="text-gray-600 text-sm mb-2 line-clamp-2">
            {venue.description}
          </p>
        )}
        
        {/* Social Proof - only show if we have real data */}
        {socialData && (
          <div className="flex items-center space-x-1 mb-3">
            <Users className="w-3 h-3 text-gray-400" />
            <span className="text-xs text-gray-500">
              {getSocialProofText(venue.id)}
            </span>
          </div>
        )}
        
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
            variant={venue.isFavorite ? "default" : "outline"}
            onClick={(e) => {
              e.stopPropagation()
              handleToggleFavorite(venue)
            }}
          >
            <Heart className={`w-4 h-4 mr-1 ${venue.isFavorite ? 'fill-current' : ''}`} />
            {venue.isFavorite ? 'Favorited' : 'Add to Favorites'}
          </Button>
          <Button 
            variant={planningStackIds.includes(venue.id) ? "default" : "outline"}
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              console.log("🔘 Add to Stack button clicked!")
              handleAddToStack(venue)
            }}
          >
            <Plus className="w-4 h-4 mr-1" />
            {planningStackIds.includes(venue.id) ? 'In Stack' : 'Add to Stack'}
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              openVenueDetails(venue)
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
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Location Access Required</h2>
                <p className="text-gray-600 mb-6">
                  Please enable location access or enter your city to discover amazing places near you.
                </p>
                
                <div className="space-y-4">
                  <Button 
                    variant="outline" 
                    onClick={requestLocation}
                    className="w-full"
                  >
                    <Navigation className="w-4 h-4 mr-2" />
                    Enable Location Access
                  </Button>
                  
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MapPin className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input
                      type="text"
                      placeholder="Enter your city (e.g., Minneapolis, MN)"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="pl-10"
                      onKeyPress={(e) => e.key === 'Enter' && handleManualLocationSearch()}
                    />
                  </div>
                  
                  <Button 
                    onClick={handleManualLocationSearch}
                    disabled={!city.trim()}
                    className="w-full"
                  >
                    <Search className="w-4 h-4 mr-2" />
                    Search in {city.trim() || 'your city'}
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
                <div className="flex items-center justify-between space-x-4 text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      <Users className="w-4 h-4" />
                      <span>{socialData.totalUsersExploring} people exploring nearby</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Eye className="w-4 h-4" />
                      <span>{socialData.totalVenuesViewed} venues viewed today</span>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs text-gray-500">
                    Demo Data
                  </Badge>
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

            {/* Location and Filters */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <div className="flex flex-col space-y-4">
                {/* Location Input */}
                <div className="flex flex-col space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Location
                  </label>
                  <div className="flex space-x-2">
                    <div className="relative flex-1">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Enter city (e.g., Minneapolis, MN)"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="pl-10"
                        onKeyPress={(e) => e.key === 'Enter' && handleManualLocationSearch()}
                      />
                    </div>
                    <Button 
                      onClick={handleManualLocationSearch}
                      disabled={!city.trim()}
                    >
                      <Search className="h-4 w-4 mr-1" />
                      Update Location
                    </Button>
                  </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-2 items-center">
                  <Filter className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-600 mr-2">
                    Filter by category:
                  </span>
                                     <Toggle
                     pressed={activeFilters.restaurants}
                     onPressedChange={async (pressed) => {
                       setActiveFilters(prev => ({...prev, restaurants: pressed}))
                       if (pressed) {
                         // When restaurant filter is activated, search for more restaurants
                         await handleCategoryDiscovery('restaurants')
                       }
                     }}
                     className="data-[state=on]:bg-rose-200 data-[state=on]:text-rose-800"
                   >
                     🍽️ Restaurants
                   </Toggle>
                   <Toggle
                     pressed={activeFilters.activities}
                     onPressedChange={async (pressed) => {
                       setActiveFilters(prev => ({...prev, activities: pressed}))
                       if (pressed) {
                         // When activities filter is activated, search for more activities
                         await handleCategoryDiscovery('activities')
                       }
                     }}
                     className="data-[state=on]:bg-purple-200 data-[state=on]:text-purple-800"
                   >
                     🎯 Activities
                   </Toggle>
                   <Toggle
                     pressed={activeFilters.outdoors}
                     onPressedChange={async (pressed) => {
                       setActiveFilters(prev => ({...prev, outdoors: pressed}))
                       if (pressed) {
                         // When outdoors filter is activated, search for more outdoor venues
                         await handleCategoryDiscovery('outdoors')
                       }
                     }}
                     className="data-[state=on]:bg-emerald-200 data-[state=on]:text-emerald-800"
                   >
                     🌳 Outdoors
                   </Toggle>
                   <Toggle
                     pressed={activeFilters.events}
                     onPressedChange={async (pressed) => {
                       setActiveFilters(prev => ({...prev, events: pressed}))
                       if (pressed) {
                         // When events filter is activated, search for more events
                         await handleCategoryDiscovery('events')
                       }
                     }}
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
                    {filteredVenues.length} places found{hasMore ? (useLoadMoreButton ? ' • Load more available' : ' • Scroll for more') : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* Main Results */}
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

            {/* Hybrid Loading System */}
            {!loading && (
              <div ref={loadMoreRef} className="mt-8 text-center">
                {loadingMore && (
                  <div className="flex items-center justify-center space-x-2">
                    <Compass className="h-6 w-6 animate-spin text-blue-600" />
                    <span className="text-gray-600">Loading more venues...</span>
                  </div>
                )}
                
                                 {/* Load More Button (shown after 3 pages to save on API costs) */}
                 {useLoadMoreButton && hasMore && !loadingMore && (
                   <div className="flex flex-col items-center space-y-4">
                     <div className="text-sm text-gray-500 mb-2">
                       Showing {filteredVenues.length} venues • {hasMore ? 'More available' : 'All loaded'}
                       {discoveryMode && (
                         <span className="ml-2 text-blue-600 font-medium">
                           🔍 Discovery Mode Active
                         </span>
                       )}
                     </div>
                     <Button
                       onClick={() => fetchVenues(userLocation, page + 1, true, venues)}
                       disabled={loadingMore}
                       className="px-8"
                     >
                       {loadingMore ? (
                         <>
                           <Compass className="h-4 h-4 animate-spin mr-2" />
                           Loading...
                         </>
                       ) : (
                         <>
                           <Plus className="h-4 h-4 mr-2" />
                           {discoveryMode ? 'Discover More Venues' : 'Load More Venues'}
                         </>
                       )}
                     </Button>
                     <p className="text-xs text-gray-400">
                       {discoveryMode ? 
                         'Exploring expanded search areas and related venues for more unique options' :
                         'Load more to discover additional venues in your area'
                       }
                     </p>
                   </div>
                 )}
                 
                 {/* Category-specific Load More Button when filters are active */}
                 {Object.values(activeFilters).some(filter => filter) && !loadingMore && (
                   <div className="flex flex-col items-center space-y-4 mt-4">
                     <div className="text-sm text-gray-500 mb-2">
                       Showing {filteredVenues.length} filtered venues
                     </div>
                     <Button
                       onClick={async () => {
                         const activeCategory = Object.entries(activeFilters).find(([_, isActive]) => isActive)?.[0]
                         if (activeCategory) {
                           await handleCategoryDiscovery(activeCategory)
                         }
                       }}
                       disabled={loading}
                       className="px-8"
                     >
                       {loading ? (
                         <>
                           <Compass className="h-4 h-4 animate-spin mr-2" />
                           Loading...
                         </>
                       ) : (
                         <>
                           <Plus className="h-4 h-4 mr-2" />
                           Load More {Object.entries(activeFilters).find(([_, isActive]) => isActive)?.[0]?.replace('s', '')}s
                         </>
                       )}
                     </Button>
                     <p className="text-xs text-gray-400">
                       Load more venues of this specific category
                     </p>
                   </div>
                 )}
                
                {/* End of results message */}
                {!hasMore && filteredVenues.length > 0 && (
                  <div className="flex flex-col items-center space-y-4">
                    <div className="flex items-center justify-center space-x-2 text-gray-500">
                      <Check className="h-5 w-5" />
                      <span>You've reached the end! {filteredVenues.length} venues loaded.</span>
                    </div>
                    
                    {/* Category Discovery suggestions */}
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-3">
                        Want to discover more unique venues?
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCategoryDiscovery('restaurants')}
                          className="text-xs data-[state=on]:bg-rose-200 data-[state=on]:text-rose-800"
                        >
                          🍽️ Restaurants
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCategoryDiscovery('activities')}
                          className="text-xs data-[state=on]:bg-purple-200 data-[state=on]:text-purple-800"
                        >
                          🎯 Activities
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCategoryDiscovery('outdoors')}
                          className="text-xs data-[state=on]:bg-emerald-200 data-[state=on]:text-emerald-800"
                        >
                          🌳 Outdoors
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCategoryDiscovery('events')}
                          className="text-xs data-[state=on]:bg-yellow-200 data-[state=on]:text-yellow-800"
                        >
                          🎭 Events
                        </Button>
                      </div>
                      {discoveryMode && (
                        <div className="mt-4">
                          <Button
                            variant="outline"
                            onClick={() => handleCategoryDiscovery(activeFilters.restaurants ? 'restaurants' : 
                              activeFilters.activities ? 'activities' : 
                              activeFilters.outdoors ? 'outdoors' : 
                              activeFilters.events ? 'events' : 'restaurants')}
                            disabled={loading}
                            className="mt-2"
                          >
                            {loading ? "Loading..." : "Load More Options"}
                          </Button>
                        </div>
                      )}
                      
                      
                    </div>
                  </div>
                )}
              </div>
            )}

            {filteredVenues.length === 0 && !loading && (
              <div className="text-center py-12">
                <Compass className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No venues found
                </h3>
                <p className="text-gray-600 mb-4 max-w-md mx-auto">
                  No venues found in {userLocation}. This might be due to limited data in this area.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button 
                    onClick={() => {
                      setSelectedCategory('all')
                      setActiveFilters({
                        restaurants: false,
                        activities: false,
                        outdoors: false,
                        events: false,
                      })
                      fetchVenues(userLocation, 1, false, [])
                    }}
                    variant="outline"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Clear Filters & Refresh
                  </Button>
                </div>
                <div className="mt-6 text-sm text-gray-500">
                  <p>💡 Tips:</p>
                  <ul className="mt-2 space-y-1">
                    <li>• Check if you're in a major city or try a nearby location</li>
                    <li>• Clear all filters to see all available venues</li>
                    {discoveryMode && (
                      <>
                        <li>• Discovery mode is active - we're searching expanded areas</li>
                        <li>• Try searching for specific cuisines like "Italian" or "Mexican"</li>
                        <li>• Search for activities like "museum" or "bowling"</li>
                      </>
                    )}
                  </ul>
                </div>
              </div>
            )}

            {/* Venue Details Modal */}
            <VenueDetailsModal
              isOpen={isDetailsModalOpen}
              onClose={closeVenueDetails}
              venue={selectedVenue}
              onPlanDate={(venue) => {
                const params = new URLSearchParams({
                  city: userLocation,
                  preselected: venue.id,
                  name: venue.name,
                  category: venue.category
                })
                router.push(`/make-date?${params.toString()}`)
              }}
              onToggleFavorite={(venueId: string) => {
                const venue = venues.find(v => v.id === venueId)
                if (venue) {
                  handleToggleFavorite(venue)
                }
              }}
            />
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
} 