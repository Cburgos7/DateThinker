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
  lat?: number
  lng?: number
  page?: number // Add page parameter for pagination
}): Promise<PlaceResult[]> {
  try {
    const { city, placeId, maxResults = 20, excludeIds = [], discoveryMode = false, category, lat, lng, page = 1 } = params
    
    // Apply rate limiting - optimized for cost savings
    const userIp = "user-ip"
    if (!checkRateLimit(`explore-geoapify-${userIp}`, 200, 60000)) {
      throw new Error("Rate limit exceeded. Please try again later.")
    }

    // Sanitize city input
    const sanitizedCity = sanitizeInput(city)
    
    console.log(`Searching for venues in ${sanitizedCity}, max: ${maxResults}, page: ${page}${isTestMode() ? ' [TEST MODE]' : ''}`)
    
    // If specific category is requested, search only that category
    if (category && category !== 'all') {
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
    
    // **PAGINATION-AWARE APPROACH**: Adjust strategy based on page number
    let targetCounts: { restaurants: number; activities: number; events: number }
    
    // Ensure we always have at least 20 total places
    const minTotal = 20
    const adjustedMaxResults = Math.max(maxResults, minTotal)
    
    if (page === 1) {
      // First page: balanced approach but ensure minimum counts
      const categoriesPerType = Math.max(5, Math.floor(adjustedMaxResults / 3))
      const remainder = adjustedMaxResults % 3
      targetCounts = {
        restaurants: Math.max(8, categoriesPerType + (remainder > 0 ? 1 : 0)), // At least 8 restaurants
        activities: Math.max(4, categoriesPerType + (remainder > 1 ? 1 : 0)),  // At least 4 activities  
        events: Math.max(4, categoriesPerType)                                  // At least 4 events
      }
    } else {
      // Subsequent pages: restaurant-focused but ensure we hit minimum total
      const restaurantFocus = Math.ceil(adjustedMaxResults * 0.75) // 75% restaurants
      const activityFocus = Math.ceil(adjustedMaxResults * 0.15)   // 15% activities
      const eventFocus = Math.ceil(adjustedMaxResults * 0.10)      // 10% events
      
      targetCounts = {
        restaurants: Math.max(15, restaurantFocus), // At least 15 restaurants per load more
        activities: Math.max(3, activityFocus),     // At least 3 activities 
        events: Math.max(2, eventFocus)            // At least 2 events
      }
    }
    
    console.log(`Page ${page} target balance: ${targetCounts.restaurants} restaurants, ${targetCounts.activities} activities, ${targetCounts.events} events`)
    
    const allVenues: PlaceResult[] = []
    
    // Keep track of venue names to prevent duplicates
    const seenVenueNames = new Set<string>()

    // 1. RESTAURANTS - Use restaurant pool for consistent variety
    try {
      console.log("🏊‍♂️ Using restaurant pool for better variety...")
      console.log(`🔍 Target restaurants: ${targetCounts.restaurants}`)
      console.log(`🔍 City: ${sanitizedCity}, Page: ${page}`)
      
      // Import and use the restaurant pool manager
      const { RestaurantPoolManager } = await import("@/lib/restaurant-pool")
      
      // Limit excludeIds to prevent over-exclusion (keep only the most recent 40 IDs)
      const recentExcludeIds = excludeIds.slice(-40)
      console.log(`🔍 Limited exclude IDs from ${excludeIds.length} to ${recentExcludeIds.length} for better variety`)
      
      const poolResult = await RestaurantPoolManager.getNextRestaurants(
        sanitizedCity,
        targetCounts.restaurants,
        recentExcludeIds
      )
      
      const restaurantVenues = poolResult.restaurants
      
      console.log(`🏊‍♂️ Pool returned ${restaurantVenues.length} restaurants for page ${page}`)
      console.log(`🏊‍♂️ Pool has more: ${poolResult.hasMore}`)
      
      // Track restaurant names to prevent duplicates
      restaurantVenues.forEach(restaurant => {
        seenVenueNames.add(normalizeVenueName(restaurant.name))
      })
      
      allVenues.push(...restaurantVenues)
      console.log(`✅ Added ${restaurantVenues.length} restaurants from pool (target: ${targetCounts.restaurants})`)
      
      // Debug: Log pool stats
      const poolStats = RestaurantPoolManager.getPoolStats(sanitizedCity)
      if (poolStats) {
        console.log(`📊 Pool stats: ${poolStats.size} total, index: ${poolStats.currentIndex}, has more: ${poolStats.hasMore}`)
      }
      
    } catch (error) {
      console.error("❌ Error in restaurant pool:", error)
      console.error("Error details:", error instanceof Error ? error.message : String(error))
      
      // Fallback to direct API calls if pool fails
      console.log("🔄 Falling back to direct restaurant search...")
      try {
        const { searchGeoapifyRestaurants } = await import("@/lib/geoapify")
        const fallbackRestaurants = await searchGeoapifyRestaurants(
          sanitizedCity, 
          targetCounts.restaurants,
          excludeIds,
          lat,
          lng
        )
        
        fallbackRestaurants.forEach(restaurant => {
          seenVenueNames.add(normalizeVenueName(restaurant.name))
        })
        
        allVenues.push(...fallbackRestaurants)
        console.log(`🔄 Fallback added ${fallbackRestaurants.length} restaurants`)
      } catch (fallbackError) {
        console.error("❌ Fallback also failed:", fallbackError)
      }
    }

    // 2. ACTIVITIES (Geoapify) - Only if we need them
    if (targetCounts.activities > 0) {
      try {
        console.log("🔍 Starting Geoapify activity search...")
        console.log(`🔍 Target activities: ${targetCounts.activities}`)
        console.log(`🔍 City: ${sanitizedCity}`)
        const { searchGeoapifyActivities } = await import("@/lib/geoapify")
        console.log("✅ Successfully imported searchGeoapifyActivities")
        
        const activities = await searchGeoapifyActivities(
          sanitizedCity,
          targetCounts.activities * 2, // Request more to ensure we have enough
          excludeIds,
          lat,
          lng
        )
        
        console.log(`📊 Geoapify returned ${activities.length} activities`)
        
        // Filter out duplicates by name
        const uniqueActivities = activities.filter(activity => 
          !seenVenueNames.has(normalizeVenueName(activity.name))
        )
        
        allVenues.push(...uniqueActivities.slice(0, targetCounts.activities))
        console.log(`✅ Added ${uniqueActivities.length} activities from Geoapify (target: ${targetCounts.activities})`)
      } catch (error) {
        console.error("❌ Error fetching activities from Geoapify:", error)
        console.error("Error details:", error instanceof Error ? error.message : String(error))
      }
    }

    // 3. EVENTS (Eventbrite + Ticketmaster) - Only if we need them and not on restaurant-heavy pages
    if (targetCounts.events > 0) {
      try {
        const { fetchAllEvents } = await import("@/lib/events-api")
        const events = await fetchAllEvents(
          sanitizedCity,
          targetCounts.events * 3, // Request more events to ensure variety
          excludeIds
        )
        
        // Filter out duplicates by name
        const uniqueEvents = events.filter(event => 
          !seenVenueNames.has(normalizeVenueName(event.name))
        )
        
        allVenues.push(...uniqueEvents.slice(0, targetCounts.events))
        console.log(`✅ Added ${uniqueEvents.length} events from Eventbrite/Ticketmaster (target: ${targetCounts.events})`)
      } catch (error) {
        console.error("❌ Error fetching events from Eventbrite/Ticketmaster:", error)
      }
    }

    // Optional category server-side filtering
    const filteredByCategory = category && category !== 'all'
      ? allVenues.filter(v => v.category === (category === 'restaurants' ? 'restaurant' : category === 'activities' ? 'activity' : category === 'events' ? 'event' : category))
      : allVenues

    // IMPROVED SHUFFLING: Maintain restaurant priority while mixing categories
    const restaurants = filteredByCategory.filter(v => v.category === 'restaurant')
    const activities = filteredByCategory.filter(v => v.category === 'activity')
    const events = filteredByCategory.filter(v => v.category === 'event')
    
    console.log(`Pre-shuffle counts: ${restaurants.length} restaurants, ${activities.length} activities, ${events.length} events`)
    
    // Create a mixed array with restaurants interspersed throughout for better distribution
    const mixedVenues: any[] = []
    const maxLength = Math.max(restaurants.length, activities.length, events.length)
    
    for (let i = 0; i < maxLength; i++) {
      // Add restaurant first (priority)
      if (i < restaurants.length) mixedVenues.push(restaurants[i])
      // Then activity
      if (i < activities.length) mixedVenues.push(activities[i])
      // Then event
      if (i < events.length) mixedVenues.push(events[i])
    }
    
    console.log(`Returning ${mixedVenues.length} FREE venues for explore (page ${page}):`)
    console.log(`- Restaurants: ${mixedVenues.filter(v => v.category === 'restaurant').length}`)
    console.log(`- Activities: ${mixedVenues.filter(v => v.category === 'activity').length}`)
    console.log(`- Events: ${mixedVenues.filter(v => v.category === 'event').length}`)
    
    const finalResults = mixedVenues.filter(v => !excludeIds.includes(v.id))
    
    // Ensure we return at least 20 places (or whatever was requested)
    const targetReturn = Math.max(maxResults, 20)
    const slicedResults = finalResults.slice(0, targetReturn)
    
    console.log(`📊 Final result: ${slicedResults.length} venues (target: ${targetReturn})`)
    
    // If we still don't have enough, log a warning
    if (slicedResults.length < 15) {
      console.warn(`⚠️ Only returning ${slicedResults.length} venues, which is less than desired minimum of 15`)
    }
    
    return slicedResults

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

                   // Get trending restaurants (high-rated from Geoapify)
      try {
        const { searchGeoapifyRestaurants } = await import("@/lib/geoapify")
        const geoapifyRestaurants = await searchGeoapifyRestaurants(location, 5)
        const trendingRestaurants = geoapifyRestaurants.filter(r => r.rating && r.rating >= 4.5)
        venues.push(...trendingRestaurants.slice(0, 3))
        console.log(`Found ${trendingRestaurants.length} trending restaurants from Geoapify`)
      } catch (error) {
        console.log('Geoapify API not available for trending restaurants')
      }

         // Get trending activities from Geoapify
     try {
       const { searchGeoapifyActivities } = await import("@/lib/geoapify")
       const trendingActivities = await searchGeoapifyActivities(location, 10)
       const highRatedActivities = trendingActivities.filter(place => place.rating && place.rating >= 4.3)
       venues.push(...highRatedActivities.slice(0, 2))
       console.log(`Found ${highRatedActivities.length} trending activities from Geoapify`)
     } catch (error) {
       console.log('Geoapify API unavailable for trending activities')
     }

         // Get trending nightlife from Geoapify
     try {
       const { searchGeoapifyPlaces } = await import("@/lib/geoapify")
       const trendingNightlife = await searchGeoapifyPlaces({
         city: location,
         category: 'activity',
         query: 'nightlife',
         limit: 10
       })
       const highRatedNightlife = trendingNightlife.filter(place => place.rating && place.rating >= 4.2)
       venues.push(...highRatedNightlife.slice(0, 1))
       console.log(`Found ${highRatedNightlife.length} trending nightlife from Geoapify`)
     } catch (error) {
       console.log('Geoapify API unavailable for nightlife trending')
     }

    // Removed outdoor category

         // Only use real data - no fallback venues
     if (venues.length < 3) {
       console.log('Not enough venues from APIs, but only using real data')
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
         return []
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
    if (!checkRateLimit(`search-geoapify-${userIp}`, 30, 60000)) {
      throw new Error("Search rate limit exceeded. Please try again later.")
    }

    // Sanitize inputs
    const sanitizedCity = sanitizeInput(city)
    const sanitizedQuery = sanitizeInput(searchQuery)
    
    console.log(`Searching Geoapify for "${sanitizedQuery}" in ${sanitizedCity}${discoveryMode ? ' (discovery mode)' : ''}${categoryFilter ? ` with category filter: ${categoryFilter}` : ''}`)
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
    } catch (error) {
      console.error('Error searching Geoapify:', error)
      return []
    }
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
    
         // 1. Try Geoapify for restaurant searches
     if (sanitizedQuery.toLowerCase().includes('restaurant') || 
         sanitizedQuery.toLowerCase().includes('food') || 
         sanitizedQuery.toLowerCase().includes('cafe') ||
         sanitizedQuery.toLowerCase().includes('bar') ||
         sanitizedQuery.toLowerCase().includes('dining')) {
       try {
         const { searchGeoapifyPlaces } = await import("@/lib/geoapify")
         const geoapifyResults = await searchGeoapifyPlaces({
           city: sanitizedCity,
           category: 'restaurant',
           query: sanitizedQuery,
           limit: maxResults,
           excludeIds
         })
         
         allResults.push(...geoapifyResults)
         console.log(`Found ${geoapifyResults.length} Geoapify results for "${sanitizedQuery}"`)
       } catch (error) {
         console.log("Geoapify API not available for restaurant search")
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
         const { fetchAllEvents } = await import("@/lib/events-api")
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
    
         // 4. If no results found, return empty array (only real data)
     if (allResults.length === 0) {
       console.log(`No results found for "${sanitizedQuery}" - only using real data`)
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