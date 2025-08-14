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

// Function to search for places
export async function searchPlaces(params: z.infer<typeof searchParamsSchema>): Promise<SearchResults> {
  try {
    // Apply rate limiting
    const userIp = "user-ip" // In a real app, get this from the request
    if (!checkRateLimit(`search-${userIp}`, 10, 60000)) {
      throw new Error("Rate limit exceeded. Please try again later.")
    }

    // Validate the input parameters
    const validParams = searchParamsSchema.parse(params)

    // Sanitize city input to prevent XSS
    const sanitizedCity = sanitizeInput(validParams.city)

    console.log(
      "Server received search params:",
      JSON.stringify(
        {
          ...validParams,
          city: sanitizedCity,
        },
        null,
        2,
      ),
    )

    // Initialize results with an empty object
    const results: SearchResults = {
      restaurant: undefined,
      activity: undefined,
      event: undefined
    }

    // Get the price range for Google Places API (0-4)
    const priceLevel = validParams.priceRange || undefined

    // Verify API key is available
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error("Google API key is not configured")
    }

    // Search for restaurants if the filter is enabled
    if (validParams.filters.restaurants) {
      try {
        // Use the updated Places API v1 format
        const restaurants = await searchGooglePlaces(
          `restaurants in ${sanitizedCity}`,
          "restaurant",
          undefined,
          5000,
          priceLevel,
          priceLevel,
          20
        )

        console.log(`Found ${restaurants.length} restaurants in ${sanitizedCity}`)

        if (restaurants.length > 0) {
          // Filter out excluded IDs
          const filteredRestaurants = restaurants.filter(restaurant => {
            const placeId = restaurant.id || restaurant.name || ''
            return !validParams.excludeIds?.includes(placeId)
          })
          
          if (filteredRestaurants.length > 0) {
            const randomIndex = Math.floor(Math.random() * Math.min(filteredRestaurants.length, 5))
            const restaurant = filteredRestaurants[randomIndex]
            console.log(
              `Selected restaurant: ${restaurant.displayName?.text || restaurant.name}, ${restaurant.formattedAddress}`,
            )
            results.restaurant = convertGooglePlaceToResult(restaurant, "restaurant")
          } else {
            console.warn(`No new restaurants found (all excluded) in ${sanitizedCity}, using fallback`)
            results.restaurant = createFallbackPlace(sanitizedCity, "restaurant", validParams.priceRange)
          }
        } else {
          console.warn(`No restaurants found in ${sanitizedCity}, using fallback`)
          results.restaurant = createFallbackPlace(sanitizedCity, "restaurant", validParams.priceRange)
        }
      } catch (error) {
        console.error("Error fetching restaurants:", error)
        results.restaurant = createFallbackPlace(sanitizedCity, "restaurant", validParams.priceRange)
      }
    }

    // Search for activities if the filter is enabled
    if (validParams.filters.activities) {
      try {
        // Use the updated Places API v1 format
        const activities = await searchGooglePlaces(
          `attractions in ${sanitizedCity}`,
          "tourist_attraction",
          undefined,
          5000,
          priceLevel,
          priceLevel,
          20
        )

        console.log(`Found ${activities.length} activities in ${sanitizedCity}`)

        if (activities.length > 0) {
          // Filter out excluded IDs
          const filteredActivities = activities.filter(activity => {
            const placeId = activity.id || activity.name || ''
            return !validParams.excludeIds?.includes(placeId)
          })
          
          if (filteredActivities.length > 0) {
            const randomIndex = Math.floor(Math.random() * Math.min(filteredActivities.length, 5))
            const activity = filteredActivities[randomIndex]
            console.log(
              `Selected activity: ${activity.displayName?.text || activity.name}, ${activity.formattedAddress}`,
            )
            results.activity = convertGooglePlaceToResult(activity, "activity")
          } else {
            console.warn(`No new activities found (all excluded) in ${sanitizedCity}, using fallback`)
            results.activity = createFallbackPlace(sanitizedCity, "activity", validParams.priceRange)
          }
        } else {
          console.warn(`No activities found in ${sanitizedCity}, using fallback`)
          results.activity = createFallbackPlace(sanitizedCity, "activity", validParams.priceRange)
        }
      } catch (error) {
        console.error("Error fetching activities:", error)
        results.activity = createFallbackPlace(sanitizedCity, "activity", validParams.priceRange)
      }
    }





    if (Object.keys(results).length === 0) {
      throw new Error("No results found. Try different filters or another city.")
    }

    console.log("Server returning results:", Object.keys(results).join(", "))

    return results
  } catch (error) {
    console.error("Error searching places:", error)

    if (error instanceof z.ZodError) {
      throw new Error(`Invalid input: ${error.errors.map((e) => e.message).join(", ")}`)
    }

    throw error
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
  // If no real photo exists, leave photoUrl as undefined

  return {
    id: place.id ? `google-${category}-${place.id}` : `fallback-${category}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: place.displayName?.text || place.name || "Unknown Place",
    rating: place.rating || 4.0,
    address: place.formattedAddress || "Address not available",
    price: place.priceLevel || 2,
    isOutdoor: false, // Removed outdoor category
    photoUrl, // Will be undefined if no real photo
    openNow: place.currentOpeningHours?.openNow || place.regularOpeningHours?.openNow || undefined,
    category,
    placeId: place.id,
    // Enhanced data from Google Places API
    phone: place.nationalPhoneNumber || place.internationalPhoneNumber || undefined,
    website: place.websiteUri || undefined,
    hours: extractOpeningHours(place),
    description: place.editorialSummary?.text || place.primaryTypeDisplayName?.text || undefined,
    amenities: extractAmenities(place),
    reviews: extractReviews(place),
    photos: place.photos?.map(photo => getPhotoUrl(photo.name)) || []
  }
}

// Helper function to get a random image from a list
function getRandomImage(images: string[]): string {
  return images[Math.floor(Math.random() * images.length)]
}

// Helper function to get a random image for a category
function getRandomImageForCategory(category: "restaurant" | "activity" | "event"): string {
  switch (category) {
    case "restaurant":
      return getRandomImage(restaurantImages)
    case "activity":
      return getRandomImage(activityImages)
    case "event":
      return getRandomImage(eventImages)
    default:
      return getRandomImage(restaurantImages)
  }
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
    isOutdoor: false, // Removed outdoor category
    // photoUrl: getRandomImageForCategory(type), // Removed fallback image
    openNow: Math.random() > 0.2, // 80% chance of being open
    category: type,
  }
}

// Fallback data for when the API fails
const restaurantImages = [
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1552566626-52f8b828add9?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=600&auto=format&fit=crop",
]

const activityImages = [
  "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?q=80&w=600&auto=format&fit=crop",
]

const eventImages = [
  "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?q=80&w=600&auto=format&fit=crop", // Concert/music event
  "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?q=80&w=600&auto=format&fit=crop", // Live music performance
  "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?q=80&w=600&auto=format&fit=crop", // Theater/stage performance
  "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=600&auto=format&fit=crop", // Concert venue
  "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?q=80&w=600&auto=format&fit=crop", // Music festival
  "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?q=80&w=600&auto=format&fit=crop", // Concert crowd
  "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=600&auto=format&fit=crop", // Theater seats
  "https://images.unsplash.com/photo-1583912267550-3ed0991b8e33?q=80&w=600&auto=format&fit=crop", // Live performance
]

// Removed outdoor images and category

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

// removed park fallback name generator

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

export async function refreshPlace(
  type: "restaurant" | "activity" | "event",
  city: string,
  placeId?: string,
  priceRange = 0,
): Promise<PlaceResult> {
  try {
    // Apply rate limiting
    const userIp = "user-ip" // In a real app, get this from the request
    if (!checkRateLimit(`refresh-${userIp}`, 20, 60000)) {
      throw new Error("Rate limit exceeded. Please try again later.")
    }

    // Sanitize city input
    const sanitizedCity = sanitizeInput(city)

    // Define search parameters based on type
    let searchTerm: string
    let placeType: string

    switch (type) {
      case "restaurant":
        searchTerm = `restaurants in ${sanitizedCity}`
        placeType = "restaurant"
        break
      case "activity":
        searchTerm = `attractions in ${sanitizedCity}`
        placeType = "tourist_attraction"
        break
      // removed outdoor
      case "event":
        searchTerm = `events in ${sanitizedCity}`
        placeType = "event_venue"
        break
      default:
        throw new Error("Invalid place type")
    }

    try {
      // Search for places using the updated Places API v1 approach
      const places = await searchGooglePlaces(
        searchTerm,
        placeType,
        undefined,
        5000,
        priceRange || undefined,
        priceRange || undefined,
        20
      )

      console.log(`Found ${places.length} ${type} places in ${sanitizedCity} for refresh`)

      // If places were found, return a random one
      if (places.length > 0) {
        // Filter out the current place if placeId is provided
        const filteredPlaces = placeId ? places.filter((place) => place.id !== placeId) : places

        // If there are still places after filtering, return a random one
        if (filteredPlaces.length > 0) {
          const randomIndex = Math.floor(Math.random() * Math.min(filteredPlaces.length, 5))
          const selectedPlace = filteredPlaces[randomIndex]
          console.log(
            `Selected ${type} for refresh: ${selectedPlace.displayName?.text || selectedPlace.name}, ${selectedPlace.formattedAddress}`,
          )
      return convertGooglePlaceToResult(filteredPlaces[randomIndex], type as any)
        }
      }

      // Fall back to generated data if no places were found
      console.warn(`No ${type} places found for ${sanitizedCity}, using fallback`)
      return createFallbackPlace(sanitizedCity, type as any, priceRange)
    } catch (error) {
      console.error(`Error with Google Places API, using fallback data for ${type}:`, error)
      return createFallbackPlace(sanitizedCity, type, priceRange)
    }
  } catch (error) {
    console.error(`Error refreshing ${type}:`, error)

    // Return fallback data on error
    const sanitizedCity = sanitizeInput(city)
    return createFallbackPlace(sanitizedCity, type as any, priceRange)
  }
} 

// NEW: Cost-effective explore function using only free APIs
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
    
    console.log(`Searching for FREE explore venues in ${sanitizedCity}, max: ${maxResults}${isTestMode() ? ' [TEST MODE]' : ''}`)
    
    // **BALANCED APPROACH with real-only sources**: Divide maxResults across restaurant/activity/event
    const categoriesPerType = Math.floor(maxResults / 3)
    const remainder = maxResults % 3
    const targetCounts = {
      restaurants: categoriesPerType + (remainder > 0 ? 1 : 0),
      activities: categoriesPerType + (remainder > 1 ? 1 : 0),
      events: categoriesPerType
    }
    
    console.log(`Target balance: ${targetCounts.restaurants} restaurants, ${targetCounts.activities} activities, ${targetCounts.events} events`)
    
    const allVenues: PlaceResult[] = []
    
    // Get raw IDs from excludeIds for proper filtering
    const excludedRawIds = excludeIds.map(extractRawGooglePlaceId)
    
    // Keep track of venue names to prevent duplicates
    const seenVenueNames = new Set<string>()

    // 1. RESTAURANTS (Yelp only - free, no fallbacks)
    try {
      const restaurantVenues: PlaceResult[] = []
      
      // Get Yelp restaurants (free API)
      try {
        const { fetchYelpRestaurants } = await import("@/lib/yelp-api")
        const yelpRestaurants = await fetchYelpRestaurants(
          sanitizedCity, 
          targetCounts.restaurants * 2, // Get more to filter
          0,
          excludeIds
        )
        
        // Track Yelp restaurant names to prevent duplicates
        yelpRestaurants.forEach(restaurant => {
          seenVenueNames.add(normalizeVenueName(restaurant.name))
        })
        
        restaurantVenues.push(...yelpRestaurants.slice(0, targetCounts.restaurants))
      } catch (error) {
        console.log("Yelp API not available, skipping restaurants (no fallbacks)")
      }
      
      allVenues.push(...restaurantVenues)
      console.log(`Added ${restaurantVenues.length} restaurants (target: ${targetCounts.restaurants})`)
    } catch (error) {
      console.error("Error fetching restaurants for explore:", error)
    }

    // 2. ACTIVITIES (Yelp only - free, no fallbacks)
    try {
      const { fetchYelpActivities } = await import("@/lib/yelp-api")
      const activities = await fetchYelpActivities(
        sanitizedCity,
        targetCounts.activities * 2,
        0,
        excludeIds
      )
      allVenues.push(...activities.slice(0, targetCounts.activities))
      console.log(`Added ${activities.length} activities (target kept: ${targetCounts.activities})`)
    } catch (error) {
      console.error("Error fetching activities for explore:", error)
    }

    // 3. EVENTS (Events API - free, no fallbacks)
    try {
      const eventVenues: PlaceResult[] = []
      
      const { fetchAllEvents } = await import("@/lib/events-api")
      const events = await fetchAllEvents(
        sanitizedCity,
        targetCounts.events,
        excludeIds
      )
      
      eventVenues.push(...events)
      allVenues.push(...eventVenues)
      console.log(`Added ${eventVenues.length} events (target: ${targetCounts.events})`)
    } catch (error) {
      console.error("Error fetching events for explore:", error)
    }

    // Optional category server-side filtering
    const filteredByCategory = category && category !== 'all'
      ? allVenues.filter(v => v.category === (category === 'restaurants' ? 'restaurant' : category === 'activities' ? 'activity' : category === 'events' ? 'event' : category))
      : allVenues

    // Shuffle the results to mix categories instead of grouping by type
    const shuffledVenues = filteredByCategory.sort(() => Math.random() - 0.5)
    
    console.log(`Returning ${shuffledVenues.length} FREE venues for explore:`)
    console.log(`- Restaurants: ${shuffledVenues.filter(v => v.category === 'restaurant').length}`)
    console.log(`- Activities: ${shuffledVenues.filter(v => v.category === 'activity').length}`)
    console.log(`- Events: ${shuffledVenues.filter(v => v.category === 'event').length}`)
    
    return shuffledVenues.filter(v => !excludedRawIds.includes(extractRawGooglePlaceId(v.id))).slice(0, maxResults)

  } catch (error) {
    console.error("Error in searchPlacesForExploreFree:", error)
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
    // Get trending events (recent and popular)
    try {
      const trendingEvents = await fetchAllEvents(location, 3)
      const highRatedEvents = trendingEvents.filter(event => 
        (event.rating && event.rating >= 4.5) || event.name.toLowerCase().includes('music') || event.name.toLowerCase().includes('food')
      )
      venues.push(...highRatedEvents.slice(0, 2))
    } catch (error) {
      console.log('Events API unavailable for trending, continuing with other sources')
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

    // Removed outdoor category

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
    // Removed outdoor fallback item
  ]

  return fallbackVenues.slice(0, limit)
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
    if (!checkRateLimit(`search-${userIp}`, 30, 60000)) {
      throw new Error("Search rate limit exceeded. Please try again later.")
    }

    // Sanitize inputs
    const sanitizedCity = sanitizeInput(city)
    const sanitizedQuery = sanitizeInput(searchQuery)
    
    console.log(`Searching for "${sanitizedQuery}" in ${sanitizedCity}${discoveryMode ? ' (discovery mode)' : ''}${categoryFilter ? ` with category filter: ${categoryFilter}` : ''}`)
    console.log(`Max results requested: ${maxResults}`)
    
    const allResults: PlaceResult[] = []
    
    // Enhanced search queries for discovery mode
    const searchQueries = discoveryMode ? 
      generateDiscoveryQueries(sanitizedQuery, sanitizedCity, offset) : 
      generateFoodSearchQueries(sanitizedQuery, sanitizedCity, offset)
    
    console.log(`Generated ${searchQueries.length} search queries:`, searchQueries)
    
    // Search Google Places with multiple queries
    for (const query of searchQueries) {
      try {
        console.log(`Searching Google Places for: "${query}"`)
        const places = await searchGooglePlaces(
          query,
          "establishment", // General establishment type
          undefined,
          discoveryMode ? 15000 : 10000, // Larger radius for better coverage
          undefined,
          undefined,
          Math.min(maxResults * 3, 300) // Pass maxResults parameter for pagination
        )
        
        console.log(`Google Places returned ${places.length} raw results for "${query}"`)
        
        // Debug: Log filtering statistics
        const beforeFiltering = places.length
        const afterExactIdFilter = places.filter(place => !excludeIds.includes(place.id)).length
        const isLargeExcludeList = excludeIds.length > 100
        
        console.log(`🔍 Filtering debug for "${query}":`, {
          beforeFiltering,
          afterExactIdFilter,
          excludeIdsLength: excludeIds.length,
          isLargeExcludeList,
          filteredOutByExactId: beforeFiltering - afterExactIdFilter
        })
        
        // Convert and categorize results
        const searchResults = places
          .filter(place => {
            // If we have too many excludeIds, be more lenient with filtering
            const isLargeExcludeList = excludeIds.length > 100
            
            // Check if this place ID is in excludeIds (exact match)
            if (excludeIds.includes(place.id)) return false
            
            // For large exclude lists, only do basic filtering to avoid removing too many results
            if (isLargeExcludeList) {
              // Only check for exact ID matches, skip complex raw ID checking
              return true
            }
            
            // Check if the raw place ID (without category prefix) is in excludeIds
            // We need to check all possible category prefixes
            const excludedRawIds = excludeIds.map(extractRawGooglePlaceId)
            const possibleCategories = ['restaurant', 'activity', 'event']
            for (const cat of possibleCategories) {
              const rawPlaceId = extractRawGooglePlaceId(`google-${cat}-${place.id}`)
              if (excludedRawIds.includes(rawPlaceId)) return false
            }
            
            return true
          })
          .slice(0, Math.min(maxResults * 4, 400)) // Increase results for better coverage
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
          .filter(result => {
            // Apply category filter if specified
            if (categoryFilter) {
              // Map plural category names to singular venue categories
              const categoryMap: Record<string, string> = {
                'restaurants': 'restaurant',
                'activities': 'activity', 
                'events': 'event'
              }
              const expectedCategory = categoryMap[categoryFilter] || categoryFilter
              return result.category === expectedCategory
            }
            return true
          })
        
        allResults.push(...searchResults)
        console.log(`Found ${searchResults.length} places for query "${query}" (after filtering)`)
        console.log(`Categories found:`, searchResults.reduce((acc, r) => {
          acc[r.category] = (acc[r.category] || 0) + 1
          return acc
        }, {} as Record<string, number>))
      } catch (error) {
        console.error(`Error searching Google Places for query "${query}":`, error)
      }
    }
    
    // Enhanced Yelp search for restaurants or when category filter is restaurants
    const shouldSearchYelp = categoryFilter === 'restaurants' || discoveryMode || sanitizedQuery.toLowerCase().includes('restaurant') || 
        sanitizedQuery.toLowerCase().includes('food') || 
        sanitizedQuery.toLowerCase().includes('cafe') ||
        sanitizedQuery.toLowerCase().includes('bar') ||
        sanitizedQuery.toLowerCase().includes('burger') ||
        sanitizedQuery.toLowerCase().includes('pizza') ||
        sanitizedQuery.toLowerCase().includes('coffee')
    
    console.log(`🔍 Yelp search condition check:`, {
      categoryFilter,
      discoveryMode,
      sanitizedQuery,
      shouldSearchYelp
    })
    
    if (shouldSearchYelp) {
      try {
        const { fetchYelpRestaurants } = await import("@/lib/yelp-api")
        const yelpQueries = discoveryMode ? 
          generateYelpDiscoveryQueries(sanitizedQuery, sanitizedCity, offset) : 
          [`${sanitizedQuery} ${sanitizedCity}`]
        
        for (const query of yelpQueries) {
          console.log(`Searching Yelp for: "${query}"`)
          const yelpResults = await fetchYelpRestaurants(
            sanitizedCity, // Pass city as location parameter
            Math.min(maxResults * 4, 200), // Increase results to get more options
            offset, // Use the offset parameter for pagination
            excludeIds,
            query // Pass the search query as term parameter
          )
          
          console.log(`Yelp returned ${yelpResults.length} raw results for "${query}"`)
          
          // For food searches, be much more inclusive - include ALL restaurants
          const filteredYelpResults = (discoveryMode ? 
            yelpResults : 
            yelpResults.filter(restaurant => {
              const restaurantName = restaurant.name.toLowerCase()
              const restaurantDescription = (restaurant.description || '').toLowerCase()
              const searchTerm = sanitizedQuery.toLowerCase()
              
              // For food-related searches, include ALL restaurants that could serve the food type
              if (searchTerm.includes('burger') || searchTerm.includes('food') || 
                  searchTerm.includes('restaurant') || searchTerm.includes('dining') ||
                  searchTerm.includes('cafe') || searchTerm.includes('bar') ||
                  searchTerm.includes('pizza') || searchTerm.includes('coffee') ||
                  searchTerm.includes('italian') || searchTerm.includes('mexican') ||
                  searchTerm.includes('chinese') || searchTerm.includes('japanese') ||
                  searchTerm.includes('thai') || searchTerm.includes('indian')) {
                // Include ALL restaurants for food searches - they all serve food!
                return restaurant.category === 'restaurant'
              }
              
              // For other searches, be more strict
              return restaurantName.includes(searchTerm) || 
                      restaurantDescription.includes(searchTerm)
            }))
            .filter(result => {
              // Apply category filter if specified
              if (categoryFilter) {
                // Map plural category names to singular venue categories
                const categoryMap: Record<string, string> = {
                  'restaurants': 'restaurant',
                  'activities': 'activity', 
                  'outdoors': 'outdoor',
                  'events': 'event'
                }
                const expectedCategory = categoryMap[categoryFilter] || categoryFilter
                return result.category === expectedCategory
              }
              return true
            })
          
          allResults.push(...filteredYelpResults)
          console.log(`Found ${filteredYelpResults.length} Yelp restaurants for query "${query}" (after filtering)`)
        }
      } catch (error) {
        console.log("Yelp API not available for search")
      }
    }
    
    // Enhanced events search for events or when category filter is events
    console.log(`🔍 Events search condition check:`, {
      categoryFilter,
      discoveryMode,
      sanitizedQuery,
      shouldSearchEvents: categoryFilter === 'events' || discoveryMode || sanitizedQuery.toLowerCase().includes('event') || 
        sanitizedQuery.toLowerCase().includes('concert') || 
        sanitizedQuery.toLowerCase().includes('show') ||
        sanitizedQuery.toLowerCase().includes('theater') ||
        sanitizedQuery.toLowerCase().includes('festival')
    })
    
    if (categoryFilter === 'events' || discoveryMode || sanitizedQuery.toLowerCase().includes('event') || 
        sanitizedQuery.toLowerCase().includes('concert') || 
        sanitizedQuery.toLowerCase().includes('show') ||
        sanitizedQuery.toLowerCase().includes('theater') ||
        sanitizedQuery.toLowerCase().includes('festival')) {
      try {
        const { fetchAllEvents } = await import("@/lib/events-api")
        const eventResults = await fetchAllEvents(
          sanitizedCity,
          Math.min(maxResults * 3, 90),
          excludeIds
        )
        
        // Filter events by search query (less strict in discovery mode)
        const filteredEventResults = (discoveryMode ? 
          eventResults : 
          eventResults.filter(event => 
            event.name.toLowerCase().includes(sanitizedQuery.toLowerCase())
          ))
          .filter(result => {
            // Apply category filter if specified
            if (categoryFilter) {
              // Map plural category names to singular venue categories
              const categoryMap: Record<string, string> = {
                'restaurants': 'restaurant',
                'activities': 'activity', 
                'events': 'event'
              }
              const expectedCategory = categoryMap[categoryFilter] || categoryFilter
              return result.category === expectedCategory
            }
            return true
          })
        
        allResults.push(...filteredEventResults)
        console.log(`Found ${filteredEventResults.length} events for search "${sanitizedQuery}"`)
      } catch (error) {
        console.log("Events API not available for search")
      }
    }
    
    console.log(`Total results before deduplication: ${allResults.length}`)
    console.log(`Results by category before deduplication:`, allResults.reduce((acc, r) => {
      acc[r.category] = (acc[r.category] || 0) + 1
      return acc
    }, {} as Record<string, number>))
    
    // Log excludeIds being used for deduplication
    console.log(`Using ${excludeIds.length} excludeIds for deduplication:`, excludeIds.slice(0, 3))
    console.log(`ExcludeIds raw IDs:`, excludeIds.map(extractRawGooglePlaceId).slice(0, 5))
    
    // Enhanced duplicate prevention with multiple strategies
    const uniqueResults = allResults.filter((result, index, self) => {
      // Check if this result is a duplicate of any previous result
      return index === self.findIndex(other => {
        // Strategy 1: Exact name and address match
        if (other.name.toLowerCase() === result.name.toLowerCase() && 
            other.address === result.address) {
          return true
        }
        
        // Strategy 2: Similar names (normalized) with same address
        const normalizedName1 = normalizeVenueName(other.name)
        const normalizedName2 = normalizeVenueName(result.name)
        if (normalizedName1 === normalizedName2 && other.address === result.address) {
          return true
        }
        
        // Strategy 3: High similarity score with same address
        if (areVenueNamesSimilar(other.name, result.name) && other.address === result.address) {
          return true
        }
        
        // Strategy 4: Same place ID (for Google Places results) - CRITICAL FIX
        if (other.placeId && result.placeId && other.placeId === result.placeId) {
          return true
        }
        
        // Strategy 5: Same raw place ID regardless of category prefix (NEW)
        const otherRawId = extractRawGooglePlaceId(other.id)
        const resultRawId = extractRawGooglePlaceId(result.id)
        if (otherRawId && resultRawId && otherRawId === resultRawId) {
          return true
        }
        
        return false
      })
    })
    
    console.log(`Total results after deduplication: ${uniqueResults.length}`)
    console.log(`Results by category after deduplication:`, uniqueResults.reduce((acc, r) => {
      acc[r.category] = (acc[r.category] || 0) + 1
      return acc
    }, {} as Record<string, number>))
    
    // Log any potential duplicates that might have slipped through
    const duplicateCheck = uniqueResults.reduce((acc, venue) => {
      const key = `${venue.name.toLowerCase()}-${venue.address}`
      if (acc[key]) {
        console.warn(`🚨 DUPLICATE DETECTED: ${venue.name} at ${venue.address}`)
        console.warn(`   Original ID: ${acc[key].venue.id}`)
        console.warn(`   Duplicate ID: ${venue.id}`)
        console.warn(`   Original Raw ID: ${extractRawGooglePlaceId(acc[key].venue.id)}`)
        console.warn(`   Duplicate Raw ID: ${extractRawGooglePlaceId(venue.id)}`)
        acc[key].count++
      } else {
        acc[key] = { venue, count: 1 }
      }
      return acc
    }, {} as Record<string, { venue: any, count: number }>)
    
    const actualDuplicates = Object.values(duplicateCheck).filter(item => item.count > 1)
    if (actualDuplicates.length > 0) {
      console.warn(`🚨 Found ${actualDuplicates.length} duplicates that slipped through:`, 
        actualDuplicates.map(d => `${d.venue.name} (${d.count} instances, IDs: ${d.venue.id})`))
    }
    
    // Enhanced relevance scoring and sorting
    const scoredResults = uniqueResults.map(result => {
      const name = result.name.toLowerCase()
      const description = (result.description || '').toLowerCase()
      const category = result.category
      const searchTerm = sanitizedQuery.toLowerCase()
      
      let relevanceScore = 0
      
      // Name relevance (highest weight)
      if (name.includes(searchTerm)) {
        relevanceScore += 100
        // Bonus for exact name match
        if (name === searchTerm) {
          relevanceScore += 50
        }
        // Bonus for name starting with search term
        if (name.startsWith(searchTerm)) {
          relevanceScore += 30
        }
      }
      
      // STRICT SEARCH TERM FILTERING - Only include results that actually match the search term
      const searchTermWords = searchTerm.split(' ').filter(word => word.length > 2) // Filter out short words like "in", "the"
      const nameWords = name.split(' ')
      const descriptionWords = description.split(' ')
      
      // Check if any search term word appears in name or description
      const hasRelevantMatch = searchTermWords.some(term => 
        nameWords.some(word => word.includes(term)) || 
        descriptionWords.some(word => word.includes(term))
      )
      
      // For food-related searches, be more lenient with filtering
      const isFoodSearch = searchTerm.includes('burger') || searchTerm.includes('food') || 
                          searchTerm.includes('restaurant') || searchTerm.includes('dining') ||
                          searchTerm.includes('cafe') || searchTerm.includes('bar') ||
                          searchTerm.includes('pizza') || searchTerm.includes('coffee') ||
                          searchTerm.includes('italian') || searchTerm.includes('mexican') ||
                          searchTerm.includes('chinese') || searchTerm.includes('japanese') ||
                          searchTerm.includes('thai') || searchTerm.includes('indian')
       
      // If no relevant match found, apply penalty (but be much more lenient for food searches)
      if (!hasRelevantMatch) {
        if (isFoodSearch && category === 'restaurant') {
          relevanceScore -= 10 // Very small penalty for restaurants in food searches
        } else {
          relevanceScore -= 1000 // Heavy penalty for irrelevant results
        }
      }
      
      // DYNAMIC CATEGORY RELEVANCE - Prioritize whatever the user actually searches for
      // Check if the search term appears in the venue name or description
      const searchTermInName = name.includes(searchTerm)
      const searchTermInDescription = description.includes(searchTerm)
      
      // If the search term is found in name or description, give it a significant boost
      if (searchTermInName || searchTermInDescription) {
        relevanceScore += 60 // High boost for direct matches
        
        // Extra boost for name matches (more relevant than description matches)
        if (searchTermInName) {
          relevanceScore += 20
        }
      } else {
        // If the search term is NOT found, penalize this result
        relevanceScore -= 40 // Penalty for not containing the search term
      }
      
      // Category-specific logic for general terms
      if (searchTerm.includes('restaurant') || searchTerm.includes('food') || searchTerm.includes('dining')) {
        if (category === 'restaurant') {
          relevanceScore += 30
        } else if (category === 'event') {
          relevanceScore -= 20 // Penalize events for food searches
        }
      } else if (searchTerm.includes('park') || searchTerm.includes('museum') || 
                 searchTerm.includes('gallery') || searchTerm.includes('theater') ||
                 searchTerm.includes('bowling') || searchTerm.includes('golf')) {
        if (category === 'activity') {
          relevanceScore += 30
        } else if (category === 'event') {
          relevanceScore -= 10
        }
      }
      
      // Description relevance (lower weight, but only if it's actually relevant)
      if (description.includes(searchTerm)) {
        relevanceScore += 10
      }
      
      // Rating bonus (small weight)
      relevanceScore += (result.rating || 0) * 2
      
      return { ...result, relevanceScore }
    })
    
    // Sort by relevance score (highest first), then by rating
    const sortedResults = scoredResults.sort((a, b) => {
      if (b.relevanceScore !== a.relevanceScore) {
        return b.relevanceScore - a.relevanceScore
      }
      return (b.rating || 0) - (a.rating || 0)
    })
    
    // Filter out results with very low relevance scores (likely irrelevant)
    const relevantResults = sortedResults.filter(result => {
      const isFoodSearch = sanitizedQuery.includes('burger') || sanitizedQuery.includes('food') || 
                           sanitizedQuery.includes('restaurant') || sanitizedQuery.includes('dining') ||
                           sanitizedQuery.includes('cafe') || sanitizedQuery.includes('bar') ||
                           sanitizedQuery.includes('pizza') || sanitizedQuery.includes('coffee') ||
                           sanitizedQuery.includes('italian') || sanitizedQuery.includes('mexican') ||
                           sanitizedQuery.includes('chinese') || sanitizedQuery.includes('japanese') ||
                           sanitizedQuery.includes('thai') || sanitizedQuery.includes('indian')
       
      // Be much more lenient for food searches - include ALL restaurants
      if (isFoodSearch && result.category === 'restaurant') {
        return result.relevanceScore > -50 // Very lenient threshold for restaurants in food searches
      }
      
      return result.relevanceScore > -500 // Standard threshold for other searches
    })
    
    // Remove the relevanceScore from final results
    const finalResults = relevantResults.map(({ relevanceScore, ...result }) => result)
    
    console.log(`Final results before maxResults limit: ${finalResults.length}`)
    console.log(`Max results limit: ${maxResults}`)
    
    // If we don't have enough results, log a warning but don't do recursive fallback
    if (finalResults.length < maxResults * 0.3 && excludeIds.length > 0) {
      console.log(`⚠️ Not enough results (${finalResults.length}) - excludeIds might be too restrictive`)
      console.log(`Consider reducing excludeIds or expanding search area`)
    }
    
    console.log(`Returning ${Math.min(finalResults.length, maxResults)} final results for "${sanitizedQuery}"`)
    console.log(`Top 3 results:`, finalResults.slice(0, 3).map(r => `${r.name} (${r.category}, score: ${scoredResults.find(s => s.id === r.id)?.relevanceScore})`))
    return finalResults.slice(0, maxResults)
  } catch (error) {
    console.error('Error in searchSpecificVenues:', error)
    throw error
  }
}

// Helper function to generate expanded discovery queries
function generateDiscoveryQueries(baseQuery: string, city: string, offset: number = 0): string[] {
  const queries = [`${baseQuery} in ${city}`]
  
  // Add related terms and synonyms
  const relatedTerms = getRelatedTerms(baseQuery)
  for (const term of relatedTerms) {
    queries.push(`${term} in ${city}`)
  }
  
  // Add nearby areas for broader search
  const nearbyAreas = getNearbyAreas(city)
  for (const area of nearbyAreas) {
    queries.push(`${baseQuery} in ${area}`)
  }
  
  // Add time-based variations
  const timeVariations = getTimeVariations(baseQuery)
  for (const variation of timeVariations) {
    queries.push(`${variation} in ${city}`)
  }
  
  // Add offset-based variations to get more diversity
  const offsetVariations = [
    `best ${baseQuery}`,
    `popular ${baseQuery}`,
    `top rated ${baseQuery}`,
    `trending ${baseQuery}`,
    `local ${baseQuery}`,
    `authentic ${baseQuery}`,
    `famous ${baseQuery}`,
    `hidden gem ${baseQuery}`
  ]
  
  // Use offset to cycle through different variations
  const variationIndex = Math.floor(offset / 50) % offsetVariations.length
  const selectedVariations = offsetVariations.slice(variationIndex, variationIndex + 2)
  if (selectedVariations.length < 2) {
    selectedVariations.push(...offsetVariations.slice(0, 2 - selectedVariations.length))
  }
  
  for (const variation of selectedVariations) {
    queries.push(`${variation} in ${city}`)
  }
  
  return queries.slice(0, 10) // Allow more queries for better diversity
}

// Helper function to generate comprehensive food search queries
function generateFoodSearchQueries(baseQuery: string, city: string, offset: number = 0): string[] {
  const queries = [`${baseQuery} in ${city}`]
  const searchTerm = baseQuery.toLowerCase()
  
  // For food searches, add many more comprehensive queries
  if (searchTerm.includes('burger') || searchTerm.includes('food') || 
      searchTerm.includes('restaurant') || searchTerm.includes('dining') ||
      searchTerm.includes('cafe') || searchTerm.includes('bar') ||
      searchTerm.includes('pizza') || searchTerm.includes('coffee') ||
      searchTerm.includes('italian') || searchTerm.includes('mexican') ||
      searchTerm.includes('chinese') || searchTerm.includes('japanese') ||
      searchTerm.includes('thai') || searchTerm.includes('indian')) {
    
    // Add general restaurant queries
    queries.push(`restaurants in ${city}`)
    queries.push(`food in ${city}`)
    queries.push(`dining in ${city}`)
    queries.push(`places to eat in ${city}`)
    
    // Add specific food type queries
    if (searchTerm.includes('burger')) {
      queries.push(`burger restaurants in ${city}`)
      queries.push(`fast food in ${city}`)
      queries.push(`casual dining in ${city}`)
    }
    
    if (searchTerm.includes('pizza')) {
      queries.push(`pizza places in ${city}`)
      queries.push(`italian restaurants in ${city}`)
    }
    
    if (searchTerm.includes('coffee')) {
      queries.push(`coffee shops in ${city}`)
      queries.push(`cafes in ${city}`)
    }
    
    // Add nearby areas for broader search
    const nearbyAreas = getNearbyAreas(city)
    for (const area of nearbyAreas.slice(0, 3)) {
      queries.push(`restaurants in ${area}`)
    }
    
    // Add offset-based food variations
    const foodVariations = [
      'casual dining',
      'fine dining', 
      'fast casual',
      'family restaurants',
      'date night restaurants',
      'romantic restaurants',
      'outdoor dining',
      'rooftop restaurants',
      'wine bars',
      'craft beer bars',
      'cocktail bars',
      'dive bars',
      'sports bars',
      'live music restaurants',
      'jazz restaurants',
      'pizza places',
      'burger joints',
      'taco places',
      'sushi restaurants',
      'steakhouse'
    ]
    
    // Use offset to cycle through different food variations
    const variationIndex = Math.floor(offset / 40) % foodVariations.length
    const selectedVariations = foodVariations.slice(variationIndex, variationIndex + 3)
    if (selectedVariations.length < 3) {
      selectedVariations.push(...foodVariations.slice(0, 3 - selectedVariations.length))
    }
    
    for (const variation of selectedVariations) {
      queries.push(`${variation} in ${city}`)
    }
  } else {
    // For non-food searches, just use the original query
    queries.push(`${baseQuery} in ${city}`)
  }
  
  return queries.slice(0, 15) // Allow more queries for food searches
}

// Helper function to generate Yelp discovery queries
function generateYelpDiscoveryQueries(baseQuery: string, city: string, offset: number = 0): string[] {
  const queries = [`${baseQuery} ${city}`]
  
  // Add cuisine types for restaurant searches
  if (baseQuery.toLowerCase().includes('restaurant') || baseQuery.toLowerCase().includes('food')) {
    const cuisines = ['Italian', 'Mexican', 'Japanese', 'Chinese', 'American', 'French', 'Thai', 'Indian', 'Mediterranean', 'Greek', 'Vietnamese', 'Korean', 'Spanish', 'Brazilian', 'Peruvian', 'Ethiopian', 'Lebanese', 'Turkish', 'Russian', 'German']
    
    // Use offset to cycle through different cuisines
    const cuisineIndex = Math.floor(offset / 50) % cuisines.length
    const selectedCuisines = cuisines.slice(cuisineIndex, cuisineIndex + 4)
    if (selectedCuisines.length < 4) {
      selectedCuisines.push(...cuisines.slice(0, 4 - selectedCuisines.length))
    }
    
    for (const cuisine of selectedCuisines) {
      queries.push(`${cuisine} restaurant ${city}`)
    }
  }
  
  // Add meal types with offset-based rotation
  const mealTypes = ['breakfast', 'lunch', 'dinner', 'brunch', 'dessert', 'coffee', 'late night', 'happy hour', 'weekend brunch', 'date night']
  const mealIndex = Math.floor(offset / 30) % mealTypes.length
  const selectedMeals = mealTypes.slice(mealIndex, mealIndex + 3)
  if (selectedMeals.length < 3) {
    selectedMeals.push(...mealTypes.slice(0, 3 - selectedMeals.length))
  }
  
  for (const meal of selectedMeals) {
    queries.push(`${meal} ${city}`)
  }
  
  return queries.slice(0, 6)
}

// Helper function to get related terms for a query
function getRelatedTerms(query: string): string[] {
  const queryLower = query.toLowerCase()
  const relatedTerms: string[] = []
  
  // Restaurant-related terms
  if (queryLower.includes('restaurant') || queryLower.includes('food') || queryLower.includes('dining')) {
    relatedTerms.push('cafe', 'bistro', 'eatery', 'kitchen', 'grill', 'bar', 'pub', 'tavern')
  }
  
  // Activity-related terms
  if (queryLower.includes('activity') || queryLower.includes('entertainment') || queryLower.includes('fun')) {
    relatedTerms.push('attraction', 'museum', 'gallery', 'theater', 'cinema', 'bowling', 'arcade', 'escape room')
  }
  
  // Removed outdoor-related terms
  
  // Event-related terms
  if (queryLower.includes('event') || queryLower.includes('concert') || queryLower.includes('show')) {
    relatedTerms.push('performance', 'festival', 'exhibition', 'workshop', 'class', 'tour', 'experience')
  }
  
  return relatedTerms.slice(0, 4)
}

// Helper function to get nearby areas for broader search
function getNearbyAreas(city: string): string[] {
  // This could be enhanced with a real geocoding service
  // For now, we'll use common nearby area patterns
  const nearbyAreas: string[] = []
  
  // Add common nearby area suffixes
  const suffixes = ['Downtown', 'Uptown', 'Midtown', 'West', 'East', 'North', 'South', 'Center', 'District']
  for (const suffix of suffixes.slice(0, 3)) {
    nearbyAreas.push(`${city} ${suffix}`)
  }
  
  return nearbyAreas
}

// Helper function to get time-based variations
function getTimeVariations(query: string): string[] {
  const variations: string[] = []
  
  // Add time-based modifiers
  const timeModifiers = ['evening', 'night', 'day', 'weekend', 'date night', 'romantic']
  for (const modifier of timeModifiers.slice(0, 3)) {
    variations.push(`${modifier} ${query}`)
  }
  
  return variations
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

// Enhanced helper function to check if two venue names are similar
function areVenueNamesSimilar(name1: string, name2: string): boolean {
  const normalized1 = normalizeVenueName(name1)
  const normalized2 = normalizeVenueName(name2)
  
  // Exact match after normalization
  if (normalized1 === normalized2) return true
  
  // Check if one name contains the other (for cases like "Estelle" vs "Estelle Restaurant")
  if (normalized1.length > 0 && normalized2.length > 0) {
    if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
      return true
    }
  }
  
  // For very short names (like "Estelle"), be more strict about similarity
  if (normalized1.length <= 8 || normalized2.length <= 8) {
    return normalized1 === normalized2
  }
  
  // Check for very similar names (≥85% similarity)
  const similarity = calculateStringSimilarity(normalized1, normalized2)
  return similarity >= 0.85
}

// Helper function to calculate string similarity using Levenshtein distance
function calculateStringSimilarity(str1: string, str2: string): number {
  if (str1.length === 0) return str2.length === 0 ? 1 : 0
  if (str2.length === 0) return 0
  
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null))
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1
      matrix[j][i] = Math.min(
        matrix[j - 1][i] + 1,     // deletion
        matrix[j][i - 1] + 1,     // insertion
        matrix[j - 1][i - 1] + cost // substitution
      )
    }
  }
  
  const maxLength = Math.max(str1.length, str2.length)
  return (maxLength - matrix[str2.length][str1.length]) / maxLength
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
    
    // 2. Try Events API (free) for event searches
    if (sanitizedQuery.toLowerCase().includes('event') || 
        sanitizedQuery.toLowerCase().includes('concert') || 
        sanitizedQuery.toLowerCase().includes('show') ||
        sanitizedQuery.toLowerCase().includes('theater') ||
        sanitizedQuery.toLowerCase().includes('festival')) {
      try {
        const { fetchAllEvents } = await import("@/lib/events-api")
        const eventResults = await fetchAllEvents(
          sanitizedCity,
          maxResults,
          excludeIds
        )
        
        // Filter events by search query
        const filteredEvents = eventResults.filter(event => 
          event.name.toLowerCase().includes(sanitizedQuery.toLowerCase())
        )
        
        allResults.push(...filteredEvents)
        console.log(`Found ${filteredEvents.length} event results for "${sanitizedQuery}"`)
      } catch (error) {
        console.log("Events API not available for search")
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