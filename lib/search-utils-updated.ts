import { z } from "zod"
import { sanitizeInput, checkRateLimit } from "@/lib/api-utils"
import { 
  searchGooglePlaces, 
  getPhotoUrl, 
  type GooglePlace,
  extractAmenities,
  extractOpeningHours,
  extractReviews
} from "@/lib/google-places"
import { fetchAllEvents, createFallbackEvents } from "@/lib/events-api"
import { fetchYelpRestaurants } from "@/lib/yelp-api"
import { isTestMode } from "@/lib/app-config"

// Define the schema for search parameters with more strict validation
export const searchParamsSchema = z.object({
  city: z.string().min(1, "City is required").max(100, "City name too long").trim(),
  placeId: z.string().optional(),
  filters: z.object({
    restaurants: z.boolean().default(true),
    activities: z.boolean().default(false),
    outdoors: z.boolean().default(false),
    events: z.boolean().default(false),
  }),
  priceRange: z.number().int().min(0).max(4).default(0),
  excludeIds: z.array(z.string()).optional(),
})

// Enhanced PlaceResult type
export type PlaceResult = {
  id: string
  name: string
  rating?: number
  address: string
  price: number
  isOutdoor?: boolean
  photoUrl?: string
  openNow?: boolean
  category: "restaurant" | "activity" | "event"
  placeId?: string
  preferenceScore?: number
  isEmpty?: boolean
  // Enhanced Google Places data
  phone?: string
  website?: string
  hours?: { [key: string]: string }
  description?: string
  amenities?: string[]
  reviews?: Array<{
    author: string
    rating: number
    text: string
    timeAgo: string
  }>
  photos?: string[]
}

// Helper function to extract raw Google Place ID from prefixed IDs
export const extractRawGooglePlaceId = (id: string): string => {
  if (id.startsWith('google-')) {
    return id.split('-').slice(2).join('-') // Remove 'google-category-' prefix
  }
  if (id.startsWith('yelp-')) {
    return id.replace('yelp-', '') // Remove 'yelp-' prefix
  }
  return id
}

export type SearchResults = {
  restaurant?: PlaceResult
  activity?: PlaceResult
  event?: PlaceResult
}

// NEW: Cost-effective explore function using free APIs
export async function searchPlacesForExploreFree(params: {
  city: string
  placeId?: string
  maxResults?: number
  excludeIds?: string[]
  discoveryMode?: boolean
  category?: string
}): Promise<PlaceResult[]> {
  try {
    const { city, placeId, maxResults = 20, excludeIds = [], discoveryMode = false, category } = params
    
    // Apply rate limiting - optimized for cost savings
    const userIp = "user-ip"
    if (!checkRateLimit(`explore-free-${userIp}`, 200, 60000)) {
      throw new Error("Rate limit exceeded. Please try again later.")
    }

    // Sanitize city input
    const sanitizedCity = sanitizeInput(city)
    
    console.log(`Searching for venues in ${sanitizedCity}, max: ${maxResults}${isTestMode() ? ' [TEST MODE]' : ''}`)
    
    // If specific category is requested, search only that category
    if (category && category !== 'all') {
      if (category === 'events') {
        // Use Eventbrite + Ticketmaster for events
        try {
          const events = await fetchAllEvents(sanitizedCity, maxResults, excludeIds)
          return events
        } catch (error) {
          console.error(`Error fetching events from Eventbrite/Ticketmaster:`, error)
          return []
        }
      } else {
        // Use Geoapify for restaurants and activities
        try {
          const { searchGeoapifyPlaces } = await import("@/lib/geoapify")
          const venues = await searchGeoapifyPlaces({
            city: sanitizedCity,
            category,
            limit: maxResults,
            excludeIds
          })
          return venues
        } catch (error) {
          console.error(`Error fetching ${category} from Geoapify:`, error)
          return []
        }
      }
    }
    
    // **BALANCED APPROACH**: Divide maxResults across restaurant/activity/event
    const categoriesPerType = Math.floor(maxResults / 3)
    const remainder = maxResults % 3
    const targetCounts = {
      restaurants: categoriesPerType + (remainder > 0 ? 1 : 0),
      activities: categoriesPerType + (remainder > 1 ? 1 : 0),
      events: categoriesPerType
    }
    
    console.log(`Target balance: ${targetCounts.restaurants} restaurants, ${targetCounts.activities} activities, ${targetCounts.events} events`)
    
    const allVenues: PlaceResult[] = []
    
    // Keep track of venue names to prevent duplicates
    const seenVenueNames = new Set<string>()

    // 1. RESTAURANTS (Geoapify)
    try {
      const { searchGeoapifyRestaurants } = await import("@/lib/geoapify")
      const restaurantVenues = await searchGeoapifyRestaurants(
        sanitizedCity, 
        targetCounts.restaurants,
        excludeIds
      )
      
      // Track restaurant names to prevent duplicates
      restaurantVenues.forEach(restaurant => {
        seenVenueNames.add(normalizeVenueName(restaurant.name))
      })
      
      allVenues.push(...restaurantVenues)
      console.log(`Added ${restaurantVenues.length} restaurants from Geoapify (target: ${targetCounts.restaurants})`)
    } catch (error) {
      console.error("Error fetching restaurants from Geoapify:", error)
    }

    // 2. ACTIVITIES (Geoapify)
    try {
      const { searchGeoapifyActivities } = await import("@/lib/geoapify")
      const activities = await searchGeoapifyActivities(
        sanitizedCity,
        targetCounts.activities,
        excludeIds
      )
      
      // Filter out duplicates by name
      const uniqueActivities = activities.filter(activity => 
        !seenVenueNames.has(normalizeVenueName(activity.name))
      )
      
      allVenues.push(...uniqueActivities.slice(0, targetCounts.activities))
      console.log(`Added ${uniqueActivities.length} activities from Geoapify (target: ${targetCounts.activities})`)
    } catch (error) {
      console.error("Error fetching activities from Geoapify:", error)
    }

    // 3. EVENTS (Eventbrite + Ticketmaster - FREE APIs)
    try {
      const events = await fetchAllEvents(
        sanitizedCity,
        targetCounts.events,
        excludeIds
      )
      
      // Filter out duplicates by name
      const uniqueEvents = events.filter(event => 
        !seenVenueNames.has(normalizeVenueName(event.name))
      )
      
      allVenues.push(...uniqueEvents.slice(0, targetCounts.events))
      console.log(`Added ${uniqueEvents.length} events from Eventbrite/Ticketmaster (target: ${targetCounts.events})`)
    } catch (error) {
      console.error("Error fetching events from Eventbrite/Ticketmaster:", error)
    }

    // Optional category server-side filtering
    const filteredByCategory = category && category !== 'all'
      ? allVenues.filter(v => v.category === (category === 'restaurants' ? 'restaurant' : category === 'activities' ? 'activity' : category === 'events' ? 'event' : category))
      : allVenues

    // Shuffle the results to mix categories instead of grouping by type
    const shuffledVenues = filteredByCategory.sort(() => Math.random() - 0.5)
    
    console.log(`Returning ${shuffledVenues.length} venues for explore:`)
    console.log(`- Restaurants: ${shuffledVenues.filter(v => v.category === 'restaurant').length}`)
    console.log(`- Activities: ${shuffledVenues.filter(v => v.category === 'activity').length}`)
    console.log(`- Events: ${shuffledVenues.filter(v => v.category === 'event').length}`)
    
    return shuffledVenues.filter(v => !excludeIds.includes(v.id)).slice(0, maxResults)

  } catch (error) {
    console.error("Error in searchPlacesForExploreFree:", error)
    throw error
  }
}

// Enhanced function to search for specific venues by name with expanded discovery
export async function searchSpecificVenues(params: {
  city: string
  searchQuery: string
  maxResults?: number
  excludeIds?: string[]
  discoveryMode?: boolean // New parameter for expanded discovery
  categoryFilter?: string // New parameter for category-specific search
  offset?: number // New parameter for pagination offset
}): Promise<PlaceResult[]> {
  try {
    const { city, searchQuery, maxResults = 50, excludeIds = [], discoveryMode = false, categoryFilter = '', offset = 0 } = params
    
    // Apply rate limiting
    const userIp = "user-ip"
    if (!checkRateLimit(`search-specific-${userIp}`, 30, 60000)) {
      throw new Error("Search rate limit exceeded. Please try again later.")
    }

    // Sanitize inputs
    const sanitizedCity = sanitizeInput(city)
    const sanitizedQuery = sanitizeInput(searchQuery)
    
    console.log(`Searching for "${sanitizedQuery}" in ${sanitizedCity}${discoveryMode ? ' (discovery mode)' : ''}${categoryFilter ? ` with category filter: ${categoryFilter}` : ''}`)
    console.log(`Max results requested: ${maxResults}`)
    
    const allResults: PlaceResult[] = []
    
    // Determine category to search
    let category = 'restaurant' // default
    if (categoryFilter) {
      category = categoryFilter
    } else if (discoveryMode) {
      // In discovery mode, search across multiple categories
      const categories = ['restaurant', 'activity', 'event']
      for (const cat of categories) {
        try {
          if (cat === 'event') {
            // Use Eventbrite + Ticketmaster for events
            const events = await fetchAllEvents(sanitizedCity, Math.ceil(maxResults / 3), excludeIds)
            const filteredEvents = events.filter(event => 
              event.name.toLowerCase().includes(sanitizedQuery.toLowerCase()) ||
              event.description?.toLowerCase().includes(sanitizedQuery.toLowerCase())
            )
            allResults.push(...filteredEvents)
          } else {
            // Use Geoapify for restaurants and activities
            const { searchGeoapifyPlaces } = await import("@/lib/geoapify")
            const results = await searchGeoapifyPlaces({
              city: sanitizedCity,
              category: cat,
              query: sanitizedQuery,
              limit: Math.ceil(maxResults / 3),
              offset,
              excludeIds
            })
            allResults.push(...results)
          }
        } catch (error) {
          console.error(`Error searching ${cat} category:`, error)
        }
      }
      
      // Remove duplicates and return
      const uniqueResults = allResults.filter((result, index, self) => 
        index === self.findIndex(r => r.id === result.id)
      )
      
      return uniqueResults.slice(0, maxResults)
    }
    
    // Single category search
    try {
      if (category === 'event') {
        // Use Eventbrite + Ticketmaster for events
        const events = await fetchAllEvents(sanitizedCity, maxResults, excludeIds)
        const filteredEvents = events.filter(event => 
          event.name.toLowerCase().includes(sanitizedQuery.toLowerCase()) ||
          event.description?.toLowerCase().includes(sanitizedQuery.toLowerCase())
        )
        return filteredEvents.slice(0, maxResults)
      } else {
        // Use Geoapify for restaurants and activities
        const { searchGeoapifyPlaces } = await import("@/lib/geoapify")
        const results = await searchGeoapifyPlaces({
          city: sanitizedCity,
          category,
          query: sanitizedQuery,
          limit: maxResults,
          offset,
          excludeIds
        })
        return results
      }
    } catch (error) {
      console.error('Error searching venues:', error)
      return []
    }
  } catch (error) {
    console.error('Error in searchSpecificVenues:', error)
    throw error
  }
}

// NEW: Cost-effective search for make-a-date functionality
export async function searchSpecificVenuesCostEffective(params: {
  city: string
  searchQuery: string
  maxResults?: number
  excludeIds?: string[]
  useGoogleAPI?: boolean // Only use Google API for specific searches
}): Promise<PlaceResult[]> {
  try {
    const { city, searchQuery, maxResults = 20, excludeIds = [], useGoogleAPI = false } = params
    
    // Apply rate limiting
    const userIp = "user-ip"
    if (!checkRateLimit(`search-cost-effective-${userIp}`, 50, 60000)) {
      throw new Error("Search rate limit exceeded. Please try again later.")
    }

    // Sanitize inputs
    const sanitizedCity = sanitizeInput(city)
    const sanitizedQuery = sanitizeInput(searchQuery)
    
    console.log(`Cost-effective search for "${sanitizedQuery}" in ${sanitizedCity}${useGoogleAPI ? ' (with Google API)' : ' (free APIs only)'}`)
    
    const allResults: PlaceResult[] = []
    
    // 1. Try Yelp first (free API) for restaurant searches
    if (sanitizedQuery.toLowerCase().includes('restaurant') || 
        sanitizedQuery.toLowerCase().includes('food') || 
        sanitizedQuery.toLowerCase().includes('cafe') ||
        sanitizedQuery.toLowerCase().includes('bar') ||
        sanitizedQuery.toLowerCase().includes('dining')) {
      try {
        const { fetchYelpRestaurants } = await import("@/lib/yelp-api")
        const yelpResults = await fetchYelpRestaurants(
          sanitizedCity,
          maxResults,
          0,
          excludeIds,
          sanitizedQuery
        )
        
        allResults.push(...yelpResults)
        console.log(`Found ${yelpResults.length} Yelp results for "${sanitizedQuery}"`)
      } catch (error) {
        console.log("Yelp API not available for search")
      }
    }
    
    // 2. Try Events API (Eventbrite + Ticketmaster - FREE) for event searches
    if (sanitizedQuery.toLowerCase().includes('event') || 
        sanitizedQuery.toLowerCase().includes('concert') || 
        sanitizedQuery.toLowerCase().includes('show') ||
        sanitizedQuery.toLowerCase().includes('theater') ||
        sanitizedQuery.toLowerCase().includes('festival') ||
        sanitizedQuery.toLowerCase().includes('music') ||
        sanitizedQuery.toLowerCase().includes('sports') ||
        sanitizedQuery.toLowerCase().includes('comedy')) {
      try {
        const eventResults = await fetchAllEvents(
          sanitizedCity,
          maxResults,
          excludeIds
        )
        
        // Filter events by search query (more lenient for events)
        const filteredEvents = eventResults.filter(event => 
          event.name.toLowerCase().includes(sanitizedQuery.toLowerCase()) ||
          event.description?.toLowerCase().includes(sanitizedQuery.toLowerCase())
        )
        
        allResults.push(...filteredEvents)
        console.log(`Found ${filteredEvents.length} event results from Eventbrite/Ticketmaster for "${sanitizedQuery}"`)
      } catch (error) {
        console.log("Eventbrite/Ticketmaster APIs not available for search")
      }
    }
    
    // 3. Only use Google API if explicitly requested (for specific venue lookups)
    if (useGoogleAPI && process.env.GOOGLE_API_KEY) {
      try {
        console.log(`Using Google API for specific venue search: "${sanitizedQuery}"`)
        const places = await searchGooglePlaces(
          `${sanitizedQuery} in ${sanitizedCity}`,
          "establishment",
          undefined,
          10000,
          undefined,
          undefined,
          maxResults
        )
        
        // Convert and categorize results
        const searchResults = places
          .filter(place => !excludeIds.includes(place.id))
          .map(place => {
            // Determine category based on place types or name
            let category: "restaurant" | "activity" | "event" = "activity"
            
            const name = (place.displayName?.text || place.name || '').toLowerCase()
            const types = place.types || []
            
            if (types.includes('restaurant') || types.includes('food') || types.includes('meal_takeaway') || 
                name.includes('restaurant') || name.includes('cafe') || name.includes('bar') || name.includes('diner') ||
                name.includes('grill') || name.includes('kitchen') || name.includes('bistro') || name.includes('eatery')) {
              category = "restaurant"
            } else if (name.includes('concert') || name.includes('theater') || name.includes('show') || 
                       name.includes('festival') || name.includes('event')) {
              category = "event"
            }
            
            return convertGooglePlaceToResult(place, category)
          })
        
        allResults.push(...searchResults)
        console.log(`Found ${searchResults.length} Google Places results for "${sanitizedQuery}"`)
      } catch (error) {
        console.error(`Error with Google Places API:`, error)
      }
    }
    
    // 4. If no results found, create fallback suggestions
    if (allResults.length === 0) {
      console.log(`No results found for "${sanitizedQuery}", creating fallback suggestions`)
      
      const fallbackSuggestions = [
        createFallbackPlace(sanitizedCity, "restaurant", Math.floor(Math.random() * 3) + 1),
        createFallbackPlace(sanitizedCity, "activity", Math.floor(Math.random() * 3) + 1),
        createFallbackPlace(sanitizedCity, "event", Math.floor(Math.random() * 3) + 1)
      ]
      
      // Customize fallback suggestions based on search query
      fallbackSuggestions.forEach(suggestion => {
        if (sanitizedQuery.toLowerCase().includes('restaurant') || sanitizedQuery.toLowerCase().includes('food')) {
          suggestion.category = "restaurant"
          suggestion.name = `${getRandomRestaurantName()} in ${sanitizedCity}`
        } else if (sanitizedQuery.toLowerCase().includes('event') || sanitizedQuery.toLowerCase().includes('concert')) {
          suggestion.category = "event"
          suggestion.name = `${getRandomEventName()} in ${sanitizedCity}`
        }
      })
      
      allResults.push(...fallbackSuggestions)
    }
    
    // Remove duplicates and return results
    const uniqueResults = allResults.filter((result, index, self) => {
      return index === self.findIndex(other => 
        other.name.toLowerCase() === result.name.toLowerCase() && 
        other.address === result.address
      )
    })
    
    console.log(`Returning ${uniqueResults.length} cost-effective search results for "${sanitizedQuery}"`)
    return uniqueResults.slice(0, maxResults)
    
  } catch (error) {
    console.error('Error in searchSpecificVenuesCostEffective:', error)
    throw error
  }
}

export async function searchTrendingVenues(location: string, limit: number = 10) {
  const venues = []

  // In test mode, return mock trending items without hitting paid APIs
  if (isTestMode()) {
    for (let i = 0; i < limit; i++) {
      const type = i % 3 === 0 ? 'event' : i % 3 === 1 ? 'restaurant' : 'activity'
      venues.push({
        id: `trending-mock-${type}-${i}`,
        name: type === 'event' ? `Mock Concert ${i + 1}` : type === 'restaurant' ? `Mock Trending Restaurant ${i + 1}` : `Mock Trending Activity ${i + 1}`,
        address: `${sanitizeInput(location)} ${type} spot ${i + 1}`,
        rating: 4.6,
        price: type === 'restaurant' ? 2 : 3,
        category: type as 'event' | 'restaurant' | 'activity',
        photoUrl: type === 'event'
          ? 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=600&auto=format&fit=crop'
          : type === 'restaurant'
            ? 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=600&auto=format&fit=crop'
            : 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=600&auto=format&fit=crop',
        openNow: true,
      })
    }
    return venues.slice(0, limit)
  }
  
  try {
    // Get trending events (Eventbrite + Ticketmaster - FREE APIs)
    try {
      const trendingEvents = await fetchAllEvents(location, 3)
      const highRatedEvents = trendingEvents.filter(event => 
        (event.rating && event.rating >= 4.5) || event.name.toLowerCase().includes('music') || event.name.toLowerCase().includes('food')
      )
      venues.push(...highRatedEvents.slice(0, 2))
      console.log(`Found ${highRatedEvents.length} trending events from Eventbrite/Ticketmaster`)
    } catch (error) {
      console.log('Eventbrite/Ticketmaster APIs unavailable for trending, continuing with other sources')
    }

    // Get trending restaurants (high-rated from Yelp)
    if (process.env.YELP_API_KEY) {
      try {
        const yelpRestaurants = await fetchYelpRestaurants(location, 5)
        const trendingRestaurants = yelpRestaurants.filter(r => r.rating && r.rating >= 4.5)
        venues.push(...trendingRestaurants.slice(0, 3))
      } catch (error) {
        console.log('Yelp API not available for trending, using fallback')
      }
    }

    // Get trending activities from Google Places (only if billing is enabled)
    try {
      const trendingActivities = await searchGooglePlaces(`attractions in ${location}`, 'tourist_attraction', undefined, undefined, undefined, undefined, 20)
      const highRatedActivities = trendingActivities.filter(place => place.rating && place.rating >= 4.3)
      venues.push(...highRatedActivities.slice(0, 2).map(place => convertGooglePlaceToResult(place, 'activity')))
    } catch (error) {
      console.log('Google Places API unavailable for trending (billing may be disabled), using fallback')
    }

    // Get trending nightlife (only if Google Places is available)
    try {
      const trendingNightlife = await searchGooglePlaces(`nightlife in ${location}`, 'night_club', undefined, undefined, undefined, undefined, 20)
      const highRatedNightlife = trendingNightlife.filter(place => place.rating && place.rating >= 4.2)
      venues.push(...highRatedNightlife.slice(0, 1).map(place => convertGooglePlaceToResult(place, 'activity')))
    } catch (error) {
      console.log('Google Places API unavailable for nightlife trending')
    }

    // If we have very few venues, add more fallback venues
    if (venues.length < 3) {
      console.log('Not enough venues from APIs, adding fallback venues')
      const fallbackVenues = getFallbackTrendingVenues(location, limit - venues.length)
      venues.push(...fallbackVenues)
    }

    // Add trending badge to venues
    const trendingVenues = venues.map(venue => ({
      ...venue,
      trending: true,
      trending_reason: getTrendingReason(venue)
    }))

    // Sort by rating and shuffle to avoid same order
    return trendingVenues
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, limit)
  } catch (error) {
    console.error('Error fetching trending venues:', error)
    return getFallbackTrendingVenues(location, limit)
  }
}

// Helper functions
function getTrendingReason(venue: any): string {
  if (venue.category === 'event') {
    return 'Hot event'
  } else if (venue.rating && venue.rating >= 4.7) {
    return 'Highly rated'
  } else if (venue.rating && venue.rating >= 4.5) {
    return 'Popular choice'
  } else if (venue.category === 'restaurant') {
    return 'Food hotspot'
  } else {
    return 'Trending now'
  }
}

function getFallbackTrendingVenues(location: string, limit: number) {
  const fallbackVenues = [
    {
      id: 'trending-1',
      name: 'The Skyline Lounge',
      category: 'restaurant',
      rating: 4.8,
      priceLevel: 3,
      image: 'https://images.unsplash.com/photo-1549294413-26f195200c16?w=400&h=300&fit=crop',
      description: 'Rooftop dining with panoramic city views',
      location: location,
      trending: true,
      trending_reason: 'Highly rated'
    },
    {
      id: 'trending-2',
      name: 'Urban Art Experience',
      category: 'activity',
      rating: 4.7,
      priceLevel: 2,
      image: 'https://images.unsplash.com/photo-1578321272176-b7bbc0679853?w=400&h=300&fit=crop',
      description: 'Interactive art installation and gallery',
      location: location,
      trending: true,
      trending_reason: 'Popular choice'
    },
    {
      id: 'trending-3',
      name: 'Weekend Jazz Series',
      category: 'event',
      rating: 4.6,
      priceLevel: 2,
      image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=300&fit=crop',
      description: 'Live jazz performance this weekend',
      location: location,
      trending: true,
      trending_reason: 'Hot event'
    },
    {
      id: 'trending-4',
      name: 'Craft Beer Garden',
      category: 'restaurant',
      rating: 4.5,
      priceLevel: 2,
      image: 'https://images.unsplash.com/photo-1436076863939-06870fe779c2?w=400&h=300&fit=crop',
      description: 'Local brewery with outdoor seating',
      location: location,
      trending: true,
      trending_reason: 'Food hotspot'
    },
  ]

  return fallbackVenues.slice(0, limit)
}

// Enhanced helper function to normalize venue names for better duplicate detection
function normalizeVenueName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/\b(restaurant|bar|grill|cafe|coffee|shop|store|inc|llc|ltd|co|kitchen|dining|lounge|bistro|eatery)\b/g, '') // Remove common suffixes
    .replace(/\b(the|a|an)\b/g, '') // Remove articles
    .trim()
}

// Helper function to create a fallback place
function createFallbackPlace(
  city: string,
  type: "restaurant" | "activity" | "event",
  priceRange = 0,
): PlaceResult {
  const price = priceRange || Math.floor(Math.random() * 3) + 1
  const rating = 3.5 + Math.random() * 1.5

  let name: string
  let address: string

  switch (type) {
    case "restaurant":
      name = `${getRandomRestaurantName()} in ${city}`
      address = `${Math.floor(Math.random() * 999) + 1} ${getRandomStreetName()}, ${city}`
      break
    case "activity":
      name = `${getRandomActivityName()} in ${city}`
      address = `${Math.floor(Math.random() * 999) + 1} ${getRandomStreetName()}, ${city}`
      break
    case "event":
      name = `${getRandomEventName()} in ${city}`
      address = `${Math.floor(Math.random() * 999) + 1} ${getRandomStreetName()}, ${city}`
      break
    default:
      name = `Place in ${city}`
      address = `${city}`
  }

  return {
    id: `fallback-${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    rating,
    address,
    price,
    isOutdoor: false,
    openNow: Math.random() > 0.2, // 80% chance of being open
    category: type,
  }
}

// Enhanced helper function to convert Google Place to our result format
function convertGooglePlaceToResult(
  place: GooglePlace,
  category: "restaurant" | "activity" | "event",
): PlaceResult {
  // Only use real photos, no fallbacks
  let photoUrl: string | undefined = undefined
  
  if (place.photos && place.photos.length > 0) {
    photoUrl = getPhotoUrl(place.photos[0].name)
  }

  return {
    id: place.id ? `google-${category}-${place.id}` : `fallback-${category}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: place.displayName?.text || place.name || "Unknown Place",
    rating: place.rating || 4.0,
    address: place.formattedAddress || "Address not available",
    price: place.priceLevel || 2,
    isOutdoor: false,
    photoUrl,
    openNow: place.currentOpeningHours?.openNow || place.regularOpeningHours?.openNow || undefined,
    category,
    placeId: place.id,
    phone: place.nationalPhoneNumber || place.internationalPhoneNumber || undefined,
    website: place.websiteUri || undefined,
    hours: extractOpeningHours(place),
    description: place.editorialSummary?.text || place.primaryTypeDisplayName?.text || undefined,
    amenities: extractAmenities(place),
    reviews: extractReviews(place),
    photos: place.photos?.map(photo => getPhotoUrl(photo.name)) || []
  }
}

// Fallback data for names
function getRandomRestaurantName(): string {
  const prefixes = ["The", "A", ""]
  const types = ["Italian", "Mexican", "Japanese", "Chinese", "American", "French", "Thai", "Indian", "Mediterranean"]
  const suffixes = ["Restaurant", "Bistro", "Cafe", "Kitchen", "Dining", "Eatery", "Grill", "Place"]

  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]
  const type = types[Math.floor(Math.random() * types.length)]
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)]

  return `${prefix} ${type} ${suffix}`.trim()
}

function getRandomActivityName(): string {
  const prefixes = ["The", "A", ""]
  const types = ["Adventure", "Entertainment", "Experience", "Fun", "Exciting", "Amazing", "Wonderful", "Fantastic"]
  const suffixes = ["Center", "Zone", "Place", "Hub", "Spot", "Area", "Destination", "Attraction"]

  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]
  const type = types[Math.floor(Math.random() * types.length)]
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)]

  return `${prefix} ${type} ${suffix}`.trim()
}

function getRandomEventName(): string {
  const prefixes = ["The", "A", ""]
  const types = ["Concert", "Show", "Theater", "Festival", "Performance", "Comedy", "Music", "Live"]
  const suffixes = ["Hall", "Center", "Theater", "Arena", "Venue", "Stage", "Auditorium", "House"]

  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]
  const type = types[Math.floor(Math.random() * types.length)]
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)]

  return `${prefix} ${type} ${suffix}`.trim()
}

function getRandomStreetName(): string {
  const streets = [
    "Main St",
    "Oak Ave",
    "Maple Dr",
    "Cedar Ln",
    "Pine St",
    "Elm St",
    "Washington Ave",
    "Park Rd",
    "Lake Dr",
    "River Rd",
    "Hill St",
    "Valley Rd",
    "Forest Ave",
    "Beach Dr",
    "Mountain View",
  ]

  return streets[Math.floor(Math.random() * streets.length)]
}

export async function getSocialData(location: string) {
  try {
    // This would typically query the database for real social data
    // For now, we'll return mock data to demonstrate the concept
    return {
      recentActivity: [
        {
          id: 'activity-1',
          type: 'favorite',
          venue: 'Urban Art Gallery',
          timeAgo: '2 hours ago',
          userCount: 3
        },
        {
          id: 'activity-2',
          type: 'visit',
          venue: 'Sunset Rooftop Bar',
          timeAgo: '4 hours ago',
          userCount: 7
        },
        {
          id: 'activity-3',
          type: 'plan',
          venue: 'Central Park',
          timeAgo: '6 hours ago',
          userCount: 2
        }
      ],
      popularThisWeek: [
        {
          venue: 'The Skyline Lounge',
          interactions: 24,
          favorites: 8,
          plans: 5
        },
        {
          venue: 'Jazz & Wine Bar',
          interactions: 19,
          favorites: 12,
          plans: 3
        },
        {
          venue: 'Artisan Coffee House',
          interactions: 16,
          favorites: 6,
          plans: 4
        }
      ],
      totalUsersExploring: 47,
      totalVenuesViewed: 156
    }
  } catch (error) {
    console.error('Error fetching social data:', error)
    return {
      recentActivity: [],
      popularThisWeek: [],
      totalUsersExploring: 0,
      totalVenuesViewed: 0
    }
  }
}

export async function getVenueSocialProof(venueId: string) {
  try {
    // This would typically query the database for real social proof
    // For now, we'll return mock data
    return {
      recentVisitors: Math.floor(Math.random() * 20) + 1,
      timeFrame: 'this week',
      recentlyFavorited: Math.floor(Math.random() * 10) + 1,
      includedInPlans: Math.floor(Math.random() * 5) + 1
    }
  } catch (error) {
    console.error('Error fetching venue social proof:', error)
    return {
      recentVisitors: 0,
      timeFrame: 'this week',
      recentlyFavorited: 0,
      includedInPlans: 0
    }
  }
}
