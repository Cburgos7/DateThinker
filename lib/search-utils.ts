import { z } from "zod"
import { sanitizeInput, checkRateLimit } from "@/lib/api-utils"
import { searchGooglePlaces, getPhotoUrl, type GooglePlace } from "@/lib/google-places"

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

// Define the result types
export type PlaceResult = {
  id: string
  name: string
  rating?: number // Made optional to support manual venues without ratings
  address: string
  price: number
  isOutdoor?: boolean
  photoUrl?: string
  openNow?: boolean
  category: "restaurant" | "activity" | "outdoor" | "event"
  placeId?: string
  preferenceScore?: number // Added for recommendation scoring
  isEmpty?: boolean // Added for empty slots that users can fill manually
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

// Helper function to convert Google Place to our result format
function convertGooglePlaceToResult(
  place: GooglePlace,
  category: "restaurant" | "activity" | "outdoor" | "event",
): PlaceResult {
  return {
    id: place.id || `fallback-${category}-${Date.now()}`,
    name: place.displayName?.text || place.name || "Unknown Place",
    rating: place.rating || 4.0,
    address: place.formattedAddress || "Address not available",
    price: place.priceLevel || 2,
    isOutdoor: category === "outdoor",
    photoUrl: place.photos && place.photos.length > 0 ? getPhotoUrl(place.photos[0].name) : undefined,
    openNow: place.regularOpeningHours?.openNow || undefined,
    category,
    placeId: place.id,
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
    id: `fallback-${type}-${Date.now()}`,
    name,
    rating,
    address,
    price,
    isOutdoor: type === "outdoor",
    photoUrl: getRandomImageForCategory(type),
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
  "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=600&auto=format&fit=crop",
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