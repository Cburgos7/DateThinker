"use server"

import { z } from "zod"
import { sanitizeInput, checkRateLimit } from "@/lib/api-utils"
import { searchGooglePlaces, getPhotoUrl, type GooglePlace } from "@/lib/google-places"

// Define the schema for search parameters with more strict validation
const searchParamsSchema = z.object({
  city: z.string().min(1, "City is required").max(100, "City name too long").trim(),
  placeId: z.string().optional(),
  filters: z.object({
    restaurants: z.boolean().default(true),
    activities: z.boolean().default(false),
    drinks: z.boolean().default(false),
    outdoors: z.boolean().default(false),
  }),
  priceRange: z.number().int().min(0).max(4).default(0),
})

// Define the result types
export type PlaceResult = {
  id: string
  name: string
  rating: number
  address: string
  price: number
  isOutdoor?: boolean
  photoUrl?: string
  openNow?: boolean
  category: "restaurant" | "activity" | "drink" | "outdoor"
  placeId?: string
}

export type SearchResults = {
  restaurant?: PlaceResult
  activity?: PlaceResult
  drink?: PlaceResult
  outdoor?: PlaceResult
}

// Image collections for fallback only as a last resort
const restaurantImages = [
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1552566626-52f8b828add9?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=600&auto=format&fit=crop",
]

const indoorActivityImages = [
  "https://images.unsplash.com/photo-1558458878-36802fc5f7f5?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1545063328-c8e3faffa16f?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1533107862482-0e6974b06ec4?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1547637589-f54c34f5d7a4?q=80&w=600&auto=format&fit=crop",
]

const outdoorActivityImages = [
  "https://images.unsplash.com/photo-1501555088652-021faa106b9b?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1473448912268-2022ce9509d8?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1501555088652-021faa106b9b?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1534787238916-9ba6764efd4f?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1445307806294-bff7f67ff225?q=80&w=600&auto=format&fit=crop",
]

const drinkImages = [
  "https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1470337458703-46ad1756a187?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1543007630-9710e4a00a20?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1572116469696-31de0f17cc34?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?q=80&w=600&auto=format&fit=crop",
]

/**
 * Search for places based on filters
 */
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
      drink: undefined,
      outdoor: undefined
    }

    // Get the price range for Google Places API (0-4)
    const priceLevel = validParams.priceRange || undefined

    // Verify API key is available
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error("Google API key is not configured")
    }

    // Try to get data from Google Places API
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
          const randomIndex = Math.floor(Math.random() * Math.min(restaurants.length, 5))
          const restaurant = restaurants[randomIndex]
          console.log(
            `Selected restaurant: ${restaurant.displayName?.text || restaurant.name}, ${restaurant.formattedAddress}`,
          )
          results.restaurant = convertGooglePlaceToResult(restaurant, "restaurant")
        } else {
          console.warn(`No restaurants found in ${sanitizedCity}, using fallback`)
          results.restaurant = createFallbackPlace(sanitizedCity, "restaurant", validParams.priceRange)
        }
      } catch (error) {
        console.error("Error fetching restaurants:", error)
        results.restaurant = createFallbackPlace(sanitizedCity, "restaurant", validParams.priceRange)
      }
    }

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

        console.log(`Found ${activities.length} attractions in ${sanitizedCity}`)

        if (activities.length > 0) {
          const randomIndex = Math.floor(Math.random() * Math.min(activities.length, 5))
          const activity = activities[randomIndex]
          console.log(`Selected activity: ${activity.displayName?.text || activity.name}, ${activity.formattedAddress}`)
          results.activity = convertGooglePlaceToResult(activity, "activity")
        } else {
          // Try a more generic search if specific type fails
          const genericActivities = await searchGooglePlaces(
            `entertainment in ${sanitizedCity}`,
            "tourist_attraction",
            undefined,
            5000,
            priceLevel,
            priceLevel,
          )

          console.log(`Found ${genericActivities.length} entertainment places in ${sanitizedCity}`)

          if (genericActivities.length > 0) {
            const randomIndex = Math.floor(Math.random() * Math.min(genericActivities.length, 5))
            const activity = genericActivities[randomIndex]
            console.log(
              `Selected generic activity: ${activity.displayName?.text || activity.name}, ${activity.formattedAddress}`,
            )
            results.activity = convertGooglePlaceToResult(activity, "activity")
          } else {
            console.warn(`No activities found in ${sanitizedCity}, using fallback`)
            results.activity = createFallbackPlace(sanitizedCity, "activity", validParams.priceRange)
          }
        }
      } catch (error) {
        console.error("Error fetching activities:", error)
        results.activity = createFallbackPlace(sanitizedCity, "activity", validParams.priceRange)
      }
    }

    if (validParams.filters.drinks) {
      try {
        // Use the updated Places API v1 format
        const drinkPlaces = await searchGooglePlaces(
          `bars in ${sanitizedCity}`,
          "bar",
          undefined,
          5000,
          priceLevel,
          priceLevel,
        )

        console.log(`Found ${drinkPlaces.length} bars in ${sanitizedCity}`)

        if (drinkPlaces.length > 0) {
          const randomIndex = Math.floor(Math.random() * Math.min(drinkPlaces.length, 5))
          const drinkPlace = drinkPlaces[randomIndex]
          console.log(
            `Selected drink place: ${drinkPlace.displayName?.text || drinkPlace.name}, ${drinkPlace.formattedAddress}`,
          )
          results.drink = convertGooglePlaceToResult(drinkPlace, "drink")
        } else {
          console.warn(`No drink places found in ${sanitizedCity}, using fallback`)
          results.drink = createFallbackPlace(sanitizedCity, "drink", validParams.priceRange)
        }
      } catch (error) {
        console.error("Error fetching drink places:", error)
        results.drink = createFallbackPlace(sanitizedCity, "drink", validParams.priceRange)
      }
    }

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
          const randomIndex = Math.floor(Math.random() * Math.min(outdoorActivities.length, 5))
          const outdoorActivity = outdoorActivities[randomIndex]
          console.log(
            `Selected outdoor activity: ${outdoorActivity.displayName?.text || outdoorActivity.name}, ${outdoorActivity.formattedAddress}`,
          )
          results.outdoor = convertGooglePlaceToResult(outdoorActivity, "outdoor")
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

/**
 * Refresh a specific place
 */
export async function refreshPlace(
  type: "restaurant" | "activity" | "drink" | "outdoor",
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
      case "drink":
        searchTerm = `bars in ${sanitizedCity}`
        placeType = "bar"
        break
      case "outdoor":
        searchTerm = `parks in ${sanitizedCity}`
        placeType = "park"
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

// Function to convert Google Place to our PlaceResult format
function convertGooglePlaceToResult(
  place: GooglePlace,
  category: "restaurant" | "activity" | "drink" | "outdoor",
): PlaceResult {
  // Get the first photo reference if available
  const photoName = place.photos && place.photos.length > 0 ? place.photos[0].name : null

  // Get the photo URL
  const photoUrl = photoName ? getPhotoUrl(photoName) : getRandomImageForCategory(category)

  // Determine if it's an outdoor place based on types
  const isOutdoor =
    place.types?.some((type) => ["park", "natural_feature", "campground", "beach", "hiking_area"].includes(type)) ||
    category === "outdoor"

  return {
    id: place.id,
    name: place.displayName?.text || place.name || "",
    rating: place.rating || 4.0,
    address: place.formattedAddress || "",
    price: place.priceLevel || 1,
    isOutdoor: isOutdoor,
    photoUrl,
    openNow: place.regularOpeningHours?.openNow,
    category,
    placeId: place.id,
  }
}

// Get a random image from an array
function getRandomImage(images: string[]): string {
  return images[Math.floor(Math.random() * images.length)]
}

// Get a random image for a specific category
function getRandomImageForCategory(category: "restaurant" | "activity" | "drink" | "outdoor"): string {
  switch (category) {
    case "restaurant":
      return getRandomImage(restaurantImages)
    case "activity":
      return getRandomImage(indoorActivityImages)
    case "drink":
      return getRandomImage(drinkImages)
    case "outdoor":
      return getRandomImage(outdoorActivityImages)
  }
}

// Generic fallback data creation function - only used as a last resort
function createFallbackPlace(
  city: string,
  type: "restaurant" | "activity" | "drink" | "outdoor",
  priceRange: number,
): PlaceResult {
  // Extract city and state from the input
  const cityParts = city.split(",")
  const cityName = cityParts[0].trim()
  const state = cityParts.length > 1 ? cityParts[1].trim() : ""

  // Generate a unique ID
  const id = `${type}-${Math.random().toString(36).substring(2, 9)}-${Date.now()}`

  // Generate a name based on the type
  let name: string
  let photoUrl: string
  let isOutdoor = false

  switch (type) {
    case "restaurant":
      const restaurantTypes = [
        "Italian",
        "Mexican",
        "American",
        "Chinese",
        "Japanese",
        "Thai",
        "Indian",
        "French",
        "Mediterranean",
        "BBQ",
      ]
      const restaurantType = restaurantTypes[Math.floor(Math.random() * restaurantTypes.length)]
      name = `${restaurantType} Restaurant`
      photoUrl = getRandomImage(restaurantImages)
      break
    case "activity":
      const activityTypes = [
        "Bowling Alley",
        "Movie Theater",
        "Arcade",
        "Escape Room",
        "Mini Golf",
        "Axe Throwing",
        "Laser Tag",
        "Art Gallery",
        "Museum",
      ]
      const activityType = activityTypes[Math.floor(Math.random() * activityTypes.length)]
      name = `${cityName} ${activityType}`
      photoUrl = getRandomImage(indoorActivityImages)
      break
    case "drink":
      const drinkTypes = ["Bar & Grill", "Brewery", "Wine Bar", "Cocktail Lounge", "Pub", "Sports Bar", "Coffee Shop"]
      const drinkType = drinkTypes[Math.floor(Math.random() * drinkTypes.length)]
      name = `${cityName} ${drinkType}`
      photoUrl = getRandomImage(drinkImages)
      break
    case "outdoor":
      const outdoorTypes = [
        "Park",
        "Nature Reserve",
        "Hiking Trail",
        "Botanical Garden",
        "Lake",
        "Beach",
        "Golf Course",
      ]
      const outdoorType = outdoorTypes[Math.floor(Math.random() * outdoorTypes.length)]
      name = `${cityName} ${outdoorType}`
      photoUrl = getRandomImage(outdoorActivityImages)
      isOutdoor = true
      break
  }

  // Generate a random street
  const streets = [
    "Main St",
    "Oak Ave",
    "Park Blvd",
    "Market St",
    "Broadway",
    "Center St",
    "Washington Ave",
    "1st Ave",
    "Highland Dr",
    "Maple St",
  ]
  const street = streets[Math.floor(Math.random() * streets.length)]

  // Generate a random street number
  const streetNumber = 100 + Math.floor(Math.random() * 900)

  // Generate a rating between 3.5 and 5.0
  const rating = 3.5 + Math.random() * 1.5

  // Generate a price level based on the requested price range or random if not specified
  const price = priceRange || Math.floor(Math.random() * 3) + 1

  // 80% chance of being open
  const openNow = Math.random() > 0.2

  return {
    id,
    name,
    rating,
    address: `${streetNumber} ${street}, ${cityName}${state ? `, ${state}` : ""}`,
    price,
    isOutdoor,
    photoUrl,
    openNow,
    category: type,
  }
}

