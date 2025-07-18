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
  category: "restaurant" | "activity" | "outdoor" | "event"
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

export type SearchResults = {
  restaurant?: PlaceResult
  activity?: PlaceResult
  outdoor?: PlaceResult
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
      outdoor: undefined,
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



    // Search for outdoor activities if the filter is enabled
    if (validParams.filters.outdoors) {
      try {
        // Use the updated Places API v1 format
        const outdoorActivities = await searchGooglePlaces(
          `parks in ${sanitizedCity}`,
          "park",
          undefined,
          5000,
          priceLevel,
          priceLevel,
        )

        console.log(`Found ${outdoorActivities.length} parks in ${sanitizedCity}`)

        if (outdoorActivities.length > 0) {
          // Filter out excluded IDs
          const filteredOutdoorActivities = outdoorActivities.filter(outdoorActivity => {
            const placeId = outdoorActivity.id || outdoorActivity.name || ''
            return !validParams.excludeIds?.includes(placeId)
          })
          
          if (filteredOutdoorActivities.length > 0) {
            const randomIndex = Math.floor(Math.random() * Math.min(filteredOutdoorActivities.length, 5))
            const outdoorActivity = filteredOutdoorActivities[randomIndex]
            console.log(
              `Selected outdoor activity: ${outdoorActivity.displayName?.text || outdoorActivity.name}, ${outdoorActivity.formattedAddress}`,
            )
            results.outdoor = convertGooglePlaceToResult(outdoorActivity, "outdoor")
          } else {
            console.warn(`No new outdoor activities found (all excluded) in ${sanitizedCity}, using fallback`)
            results.outdoor = createFallbackPlace(sanitizedCity, "outdoor", validParams.priceRange)
          }
        } else {
          console.warn(`No outdoor activities found in ${sanitizedCity}, using fallback`)
          results.outdoor = createFallbackPlace(sanitizedCity, "outdoor", validParams.priceRange)
        }
      } catch (error) {
        console.error("Error fetching outdoor activities:", error)
        results.outdoor = createFallbackPlace(sanitizedCity, "outdoor", validParams.priceRange)
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
  category: "restaurant" | "activity" | "outdoor" | "event",
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
    isOutdoor: category === "outdoor",
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
function getRandomImageForCategory(category: "restaurant" | "activity" | "outdoor" | "event"): string {
  switch (category) {
    case "restaurant":
      return getRandomImage(restaurantImages)
    case "activity":
      return getRandomImage(activityImages)
    case "outdoor":
      return getRandomImage(outdoorImages)
    case "event":
      return getRandomImage(eventImages)
    default:
      return getRandomImage(restaurantImages)
  }
}

// Helper function to create a fallback place
function createFallbackPlace(
  city: string,
  type: "restaurant" | "activity" | "outdoor" | "event",
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
    case "outdoor":
      name = `${getRandomParkName()} in ${city}`
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
    isOutdoor: type === "outdoor",
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

const outdoorImages = [
  "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=600&auto=format&fit=crop",
]

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

function getRandomParkName(): string {
  const prefixes = ["The", "A", ""]
  const types = ["City", "Central", "Riverside", "Mountain", "Valley", "Forest", "Community", "Memorial"]
  const suffixes = ["Park", "Gardens", "Recreation Area", "Preserve", "Sanctuary", "Reserve", "Trail", "Path"]

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

export async function refreshPlace(
  type: "restaurant" | "activity" | "outdoor" | "event",
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
      case "outdoor":
        searchTerm = `parks in ${sanitizedCity}`
        placeType = "park"
        break
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
          return convertGooglePlaceToResult(filteredPlaces[randomIndex], type)
        }
      }

      // Fall back to generated data if no places were found
      console.warn(`No ${type} places found for ${sanitizedCity}, using fallback`)
      return createFallbackPlace(sanitizedCity, type, priceRange)
    } catch (error) {
      console.error(`Error with Google Places API, using fallback data for ${type}:`, error)
      return createFallbackPlace(sanitizedCity, type, priceRange)
    }
  } catch (error) {
    console.error(`Error refreshing ${type}:`, error)

    // Return fallback data on error
    const sanitizedCity = sanitizeInput(city)
    return createFallbackPlace(sanitizedCity, type, priceRange)
  }
} 

// New function specifically for explore feature - gets BALANCED venues per category
export async function searchPlacesForExplore(params: {
  city: string
  placeId?: string
  maxResults?: number
  excludeIds?: string[]
}): Promise<PlaceResult[]> {
  try {
    const { city, placeId, maxResults = 20, excludeIds = [] } = params
    
    // Apply rate limiting - increased limits for explore since it makes multiple calls
    const userIp = "user-ip"
    if (!checkRateLimit(`explore-${userIp}`, 100, 60000)) {
      throw new Error("Rate limit exceeded. Please try again later.")
    }

    // Sanitize city input
    const sanitizedCity = sanitizeInput(city)
    
    console.log(`Searching for BALANCED explore venues in ${sanitizedCity}, max: ${maxResults}`)
    
    // **BALANCED APPROACH**: Divide maxResults evenly across all venue types
    const categoriesPerType = Math.floor(maxResults / 4) // 4 categories: restaurant, activity, outdoor, event
    const remainder = maxResults % 4
    
    // Distribute any remainder across categories
    const targetCounts = {
      restaurants: categoriesPerType + (remainder > 0 ? 1 : 0),
      activities: categoriesPerType + (remainder > 1 ? 1 : 0), 
      outdoor: categoriesPerType + (remainder > 2 ? 1 : 0),
      events: categoriesPerType
    }
    
    console.log(`Target balance: ${targetCounts.restaurants} restaurants, ${targetCounts.activities} activities, ${targetCounts.outdoor} outdoor, ${targetCounts.events} events`)
    
    const allVenues: PlaceResult[] = []
    
    // Helper function to extract raw Google Place ID from prefixed IDs
    const extractRawGooglePlaceId = (id: string): string => {
      if (id.startsWith('google-')) {
        return id.split('-').slice(2).join('-') // Remove 'google-category-' prefix
      }
      return id
    }

    // Get raw Google Place IDs from excludeIds for proper filtering
    const excludedRawIds = excludeIds.map(extractRawGooglePlaceId)
    
    // Keep track of all raw Google Place IDs we've seen to prevent cross-category duplicates
    const seenRawIds = new Set<string>(excludedRawIds)
    
    // Also track venue names to prevent Yelp/Google duplicates like "Meritage"
    const seenVenueNames = new Set<string>()

    // 1. RESTAURANTS (balanced amount)
    try {
      const restaurantVenues: PlaceResult[] = []
      
      // Get Yelp restaurants first (they usually have better photos)
      try {
        const { fetchYelpRestaurants } = await import("@/lib/yelp-api")
        const yelpRestaurants = await fetchYelpRestaurants(
          sanitizedCity, 
          Math.ceil(targetCounts.restaurants * 1.5), // Get 50% more to account for filtering
          0,
          excludeIds
        )
        
        // Track Yelp restaurant names to prevent duplicates
        yelpRestaurants.forEach(restaurant => {
          seenVenueNames.add(normalizeVenueName(restaurant.name))
        })
        
        restaurantVenues.push(...yelpRestaurants.slice(0, targetCounts.restaurants))
      } catch (error) {
        console.log("Yelp API not available, using Google Places only")
      }

      // Fill remaining slots with Google Places restaurants
      const remainingRestaurantSlots = targetCounts.restaurants - restaurantVenues.length
      if (remainingRestaurantSlots > 0) {
        try {
          const googleRestaurants = await searchGooglePlaces(
            `restaurants in ${sanitizedCity}`,
            "restaurant",
            undefined,
            15000,
            undefined,
            undefined,
          )
          
          const filteredGoogleRestaurants = googleRestaurants
            .filter(r => {
              if (seenRawIds.has(r.id)) return false
              
              const restaurantName = r.displayName?.text || r.name || ''
              for (const seenName of seenVenueNames) {
                if (areVenueNamesSimilar(restaurantName, seenName)) {
                  return false
                }
              }
              return true
            })
            .slice(0, remainingRestaurantSlots)
            .map(r => {
              seenRawIds.add(r.id)
              seenVenueNames.add(normalizeVenueName(r.displayName?.text || r.name || ''))
              return convertGooglePlaceToResult(r, "restaurant")
            })
          
          restaurantVenues.push(...filteredGoogleRestaurants)
        } catch (error) {
          console.log("Google Places API unavailable for restaurants")
        }
      }
      
      allVenues.push(...restaurantVenues)
      console.log(`Added ${restaurantVenues.length} restaurants (target: ${targetCounts.restaurants})`)
    } catch (error) {
      console.error("Error fetching restaurants for explore:", error)
    }

    // 2. ACTIVITIES (balanced amount)
    try {
      const activityVenues: PlaceResult[] = []
      
      const activityQueries = [
        `things to do in ${sanitizedCity}`,
        `attractions in ${sanitizedCity}`,
        `museums in ${sanitizedCity}`,
        `entertainment in ${sanitizedCity}`,
        `art galleries in ${sanitizedCity}`,
      ]
      
      for (const query of activityQueries) {
        if (activityVenues.length >= targetCounts.activities) break
        
        try {
          const batch = await searchGooglePlaces(
            query,
            "tourist_attraction",
            undefined,
            15000,
            undefined,
            undefined,
          )
          
          const filteredBatch = batch
            .filter(a => {
              if (seenRawIds.has(a.id)) return false
              
              const activityName = a.displayName?.text || a.name || ''
              for (const seenName of seenVenueNames) {
                if (areVenueNamesSimilar(activityName, seenName)) {
                  return false
                }
              }
              return true
            })
            .slice(0, targetCounts.activities - activityVenues.length)
            .map(a => {
              seenRawIds.add(a.id)
              seenVenueNames.add(normalizeVenueName(a.displayName?.text || a.name || ''))
              return convertGooglePlaceToResult(a, "activity")
            })
          
          activityVenues.push(...filteredBatch)
        } catch (error) {
          console.log(`Error fetching activities for query: ${query}`)
        }
      }
      
      allVenues.push(...activityVenues)
      console.log(`Added ${activityVenues.length} activities (target: ${targetCounts.activities})`)
    } catch (error) {
      console.error("Error fetching activities for explore:", error)
    }

    // 3. OUTDOOR VENUES (balanced amount)
    try {
      const outdoorVenues: PlaceResult[] = []
      
      const outdoorQueries = [
        `parks in ${sanitizedCity}`,
        `hiking trails in ${sanitizedCity}`,
        `gardens in ${sanitizedCity}`,
        `outdoor recreation in ${sanitizedCity}`,
        `nature areas in ${sanitizedCity}`,
      ]
      
      for (const query of outdoorQueries) {
        if (outdoorVenues.length >= targetCounts.outdoor) break
        
        try {
          const batch = await searchGooglePlaces(
            query,
            "park",
            undefined,
            20000,
            undefined,
            undefined,
          )
          
          const filteredBatch = batch
            .filter(o => {
              if (seenRawIds.has(o.id)) return false
              
              const outdoorName = o.displayName?.text || o.name || ''
              for (const seenName of seenVenueNames) {
                if (areVenueNamesSimilar(outdoorName, seenName)) {
                  return false
                }
              }
              return true
            })
            .slice(0, targetCounts.outdoor - outdoorVenues.length)
            .map(o => {
              seenRawIds.add(o.id)
              seenVenueNames.add(normalizeVenueName(o.displayName?.text || o.name || ''))
              return convertGooglePlaceToResult(o, "outdoor")
            })
          
          outdoorVenues.push(...filteredBatch)
        } catch (error) {
          console.log(`Error fetching outdoor venues for query: ${query}`)
        }
      }
      
      allVenues.push(...outdoorVenues)
      console.log(`Added ${outdoorVenues.length} outdoor venues (target: ${targetCounts.outdoor})`)
    } catch (error) {
      console.error("Error fetching outdoor venues for explore:", error)
    }

    // 4. EVENTS (balanced amount)
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

    // Shuffle the results to mix categories instead of grouping by type
    const shuffledVenues = allVenues.sort(() => Math.random() - 0.5)
    
    console.log(`Returning ${shuffledVenues.length} BALANCED venues for explore:`)
    console.log(`- Restaurants: ${shuffledVenues.filter(v => v.category === 'restaurant').length}`)
    console.log(`- Activities: ${shuffledVenues.filter(v => v.category === 'activity').length}`)
    console.log(`- Outdoor: ${shuffledVenues.filter(v => v.category === 'outdoor').length}`)
    console.log(`- Events: ${shuffledVenues.filter(v => v.category === 'event').length}`)
    
    return shuffledVenues.slice(0, maxResults)

  } catch (error) {
    console.error("Error in searchPlacesForExplore:", error)
    throw error
  }
} 

export async function searchTrendingVenues(location: string, limit: number = 10) {
  const venues = []
  
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
      const trendingActivities = await searchGooglePlaces(`attractions in ${location}`, 'tourist_attraction')
      const highRatedActivities = trendingActivities.filter(place => place.rating && place.rating >= 4.3)
      venues.push(...highRatedActivities.slice(0, 2).map(place => convertGooglePlaceToResult(place, 'activity')))
    } catch (error) {
      console.log('Google Places API unavailable for trending (billing may be disabled), using fallback')
    }

    // Get trending nightlife (only if Google Places is available)
    try {
      const trendingNightlife = await searchGooglePlaces(`nightlife in ${location}`, 'night_club')
      const highRatedNightlife = trendingNightlife.filter(place => place.rating && place.rating >= 4.2)
      venues.push(...highRatedNightlife.slice(0, 1).map(place => convertGooglePlaceToResult(place, 'activity')))
    } catch (error) {
      console.log('Google Places API unavailable for nightlife trending')
    }

    // Get trending outdoor spots (only if Google Places is available)
    try {
      const trendingOutdoor = await searchGooglePlaces(`parks in ${location}`, 'park')
      const highRatedOutdoor = trendingOutdoor.filter(place => place.rating && place.rating >= 4.4)
      venues.push(...highRatedOutdoor.slice(0, 1).map(place => convertGooglePlaceToResult(place, 'outdoor')))
    } catch (error) {
      console.log('Google Places API unavailable for outdoor trending')
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
    {
      id: 'trending-5',
      name: 'Riverside Walking Trail',
      category: 'outdoor',
      rating: 4.4,
      priceLevel: 0,
      image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=300&fit=crop',
      description: 'Scenic trail perfect for evening walks',
      location: location,
      trending: true,
      trending_reason: 'Trending now'
    }
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

// New function to search for specific venues by name
export async function searchSpecificVenues(params: {
  city: string
  searchQuery: string
  maxResults?: number
  excludeIds?: string[]
}): Promise<PlaceResult[]> {
  try {
    const { city, searchQuery, maxResults = 50, excludeIds = [] } = params
    
    // Apply rate limiting
    const userIp = "user-ip"
    if (!checkRateLimit(`search-${userIp}`, 30, 60000)) {
      throw new Error("Search rate limit exceeded. Please try again later.")
    }

    // Sanitize inputs
    const sanitizedCity = sanitizeInput(city)
    const sanitizedQuery = sanitizeInput(searchQuery)
    
    console.log(`Searching for "${sanitizedQuery}" in ${sanitizedCity}`)
    
    const allResults: PlaceResult[] = []
    
    // Search Google Places for the specific query
    try {
      const places = await searchGooglePlaces(
        `${sanitizedQuery} in ${sanitizedCity}`,
        "establishment", // General establishment type
        undefined,
        5000,
        undefined,
        undefined,
      )
      
      // Convert and categorize results
      const searchResults = places
        .filter(place => !excludeIds.includes(place.id))
        .slice(0, Math.min(maxResults, 30)) // Limit to prevent API overuse
        .map(place => {
          // Determine category based on place types or name
          let category: "restaurant" | "activity" | "outdoor" | "event" = "activity"
          
          const name = (place.displayName?.text || place.name || '').toLowerCase()
          const types = place.types || []
          
          if (types.includes('restaurant') || types.includes('food') || types.includes('meal_takeaway') || 
              name.includes('restaurant') || name.includes('cafe') || name.includes('bar') || name.includes('diner')) {
            category = "restaurant"
          } else if (types.includes('park') || types.includes('campground') || 
                     name.includes('park') || name.includes('trail') || name.includes('garden') || name.includes('beach')) {
            category = "outdoor"
          } else if (name.includes('concert') || name.includes('theater') || name.includes('show') || 
                     name.includes('festival') || name.includes('event')) {
            category = "event"
          }
          
          return convertGooglePlaceToResult(place, category)
        })
      
      allResults.push(...searchResults)
      console.log(`Found ${searchResults.length} places for search "${sanitizedQuery}"`)
    } catch (error) {
      console.error('Error searching Google Places:', error)
    }
    
    // Also search Yelp for restaurant queries
    if (sanitizedQuery.toLowerCase().includes('restaurant') || 
        sanitizedQuery.toLowerCase().includes('food') || 
        sanitizedQuery.toLowerCase().includes('cafe') ||
        sanitizedQuery.toLowerCase().includes('bar')) {
      try {
        const { fetchYelpRestaurants } = await import("@/lib/yelp-api")
        const yelpResults = await fetchYelpRestaurants(
          `${sanitizedQuery} ${sanitizedCity}`, 
          Math.min(maxResults, 20),
          0,
          excludeIds
        )
        
        // Filter Yelp results by search query
        const filteredYelpResults = yelpResults.filter(restaurant => 
          restaurant.name.toLowerCase().includes(sanitizedQuery.toLowerCase())
        )
        
        allResults.push(...filteredYelpResults)
        console.log(`Found ${filteredYelpResults.length} Yelp restaurants for search "${sanitizedQuery}"`)
      } catch (error) {
        console.log("Yelp API not available for search")
      }
    }
    
    // Also search events APIs for event-related queries  
    if (sanitizedQuery.toLowerCase().includes('event') || 
        sanitizedQuery.toLowerCase().includes('concert') || 
        sanitizedQuery.toLowerCase().includes('show') ||
        sanitizedQuery.toLowerCase().includes('theater') ||
        sanitizedQuery.toLowerCase().includes('festival')) {
      try {
        const { fetchAllEvents } = await import("@/lib/events-api")
        const eventResults = await fetchAllEvents(
          sanitizedCity,
          Math.min(maxResults, 15),
          excludeIds
        )
        
        // Filter events by search query
        const filteredEventResults = eventResults.filter(event => 
          event.name.toLowerCase().includes(sanitizedQuery.toLowerCase())
        )
        
        allResults.push(...filteredEventResults)
        console.log(`Found ${filteredEventResults.length} events for search "${sanitizedQuery}"`)
      } catch (error) {
        console.log("Events API not available for search")
      }
    }
    
    // Remove duplicates based on name similarity
    const uniqueResults = allResults.filter((result, index, self) => 
      index === self.findIndex(other => 
        other.name.toLowerCase() === result.name.toLowerCase() &&
        other.address === result.address
      )
    )
    
    // Sort by relevance (exact name matches first, then by rating)
    const sortedResults = uniqueResults.sort((a, b) => {
      const aExactMatch = a.name.toLowerCase().includes(sanitizedQuery.toLowerCase())
      const bExactMatch = b.name.toLowerCase().includes(sanitizedQuery.toLowerCase())
      
      if (aExactMatch && !bExactMatch) return -1
      if (!aExactMatch && bExactMatch) return 1
      
      return (b.rating || 0) - (a.rating || 0)
    })
    
    console.log(`Returning ${sortedResults.length} unique search results for "${sanitizedQuery}"`)
    return sortedResults.slice(0, maxResults)
    
  } catch (error) {
    console.error("Error in searchSpecificVenues:", error)
    throw error
  }
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