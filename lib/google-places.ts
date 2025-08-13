import { sanitizeInput } from "./api-utils"

// Enhanced types for Google Places API responses
export type GooglePlace = {
  id: string
  displayName?: {
    text: string
  }
  name?: string
  formattedAddress?: string
  rating?: number
  priceLevel?: number
  types?: string[]
  photos?: Array<{
    name: string
  }>
  regularOpeningHours?: {
    openNow?: boolean
    weekdayDescriptions?: string[]
  }
  currentOpeningHours?: {
    openNow?: boolean
    weekdayDescriptions?: string[]
  }
  nationalPhoneNumber?: string
  internationalPhoneNumber?: string
  websiteUri?: string
  editorialSummary?: {
    text: string
  }
  primaryTypeDisplayName?: {
    text: string
  }
  accessibilityOptions?: {
    wheelchairAccessibleParking?: boolean
    wheelchairAccessibleEntrance?: boolean
    wheelchairAccessibleRestroom?: boolean
    wheelchairAccessibleSeating?: boolean
  }
  goodForChildren?: boolean
  allowsDogs?: boolean
  reviews?: Array<{
    name: string
    relativePublishTimeDescription: string
    rating: number
    text: {
      text: string
    }
    authorAttribution: {
      displayName: string
    }
  }>
}

export type PlacesSearchResponse = {
  places: GooglePlace[]
  error?: {
    message: string
    status: string
  }
}

export type AutocompletePrediction = {
  description: string
  place_id: string
  structured_formatting: {
    main_text: string
    secondary_text: string
  }
}

export type AutocompleteResponse = {
  predictions: AutocompletePrediction[]
  status: string
  error_message?: string
}

// Function to get a photo URL from Google Places API v1
export function getPhotoUrl(photoName: string, maxWidth = 600): string {
  if (!photoName) return "/placeholder.svg?height=400&width=600"

  // Check if photoName is a full photo reference or just a place ID
  if (photoName.includes("/")) {
    // It's already a photo reference - use server-side API
    return `/api/place-photo?photoName=${encodeURIComponent(photoName)}&maxWidth=${maxWidth}`
  } else {
    // Fallback to a placeholder image
    return `/placeholder.svg?height=400&width=${maxWidth}`
  }
}

// Enhanced field mask to get rich venue information
const ENHANCED_FIELD_MASK = [
  "places.id",
  "places.displayName", 
  "places.formattedAddress",
  "places.rating",
  "places.priceLevel",
  "places.types",
  "places.photos",
  "places.regularOpeningHours",
  "places.currentOpeningHours",
  "places.nationalPhoneNumber",
  "places.internationalPhoneNumber", 
  "places.websiteUri",
  "places.editorialSummary",
  "places.primaryTypeDisplayName",
  "places.accessibilityOptions",
  "places.goodForChildren",
  "places.allowsDogs",
  "places.reviews"
].join(",")

// Helper function to extract amenities from Google Places data
export function extractAmenities(place: GooglePlace): string[] {
  const amenities: string[] = []
  
  if (place.accessibilityOptions?.wheelchairAccessibleEntrance) {
    amenities.push("Wheelchair Accessible")
  }
  if (place.accessibilityOptions?.wheelchairAccessibleParking) {
    amenities.push("Accessible Parking")
  }
  if (place.accessibilityOptions?.wheelchairAccessibleRestroom) {
    amenities.push("Accessible Restroom")
  }
  if (place.goodForChildren) {
    amenities.push("Good for Kids")
  }
  if (place.allowsDogs) {
    amenities.push("Dog Friendly")
  }
  
  return amenities
}

// Helper function to extract opening hours
export function extractOpeningHours(place: GooglePlace): { [key: string]: string } | undefined {
  const hours = place.currentOpeningHours?.weekdayDescriptions || place.regularOpeningHours?.weekdayDescriptions
  if (!hours) return undefined
  
  const hoursObj: { [key: string]: string } = {}
  hours.forEach(dayHours => {
    const [day, ...timeParts] = dayHours.split(': ')
    if (day && timeParts.length > 0) {
      hoursObj[day] = timeParts.join(': ')
    }
  })
  
  return hoursObj
}

// Helper function to extract reviews
export function extractReviews(place: GooglePlace): Array<{
  author: string
  rating: number
  text: string
  timeAgo: string
}> {
  if (!place.reviews) return []
  
  return place.reviews.slice(0, 3).map(review => ({
    author: review.authorAttribution?.displayName || 'Anonymous',
    rating: review.rating || 0,
    text: review.text?.text || '',
    timeAgo: review.relativePublishTimeDescription || ''
  }))
}

// Function to search for places using Google Places API v1
export async function searchGooglePlaces(
  query: string,
  type: string,
  location?: string,
  radius = 5000,
  minPrice?: number,
  maxPrice?: number,
  maxResults = 20
): Promise<GooglePlace[]> {
  // This function should only be called server-side
  if (typeof window !== "undefined" && process.env.NODE_ENV !== "development") {
    console.error("searchGooglePlaces should only be called from server components or actions")
    return []
  }
  try {
    // Sanitize inputs
    const sanitizedQuery = sanitizeInput(query)

    // Google Places API v1 has a limit of 20 results per request
    const maxPerRequest = 20
    const numRequests = Math.ceil(maxResults / maxPerRequest)
    
    console.log(`Making Google Places v1 search requests: ${sanitizedQuery} (total requested: ${maxResults}, requests needed: ${numRequests})`)

    const allPlaces: GooglePlace[] = []
    const seenIds = new Set<string>()

    // This function should only be used server-side where the API key is available
    const apiKey = process.env.GOOGLE_API_KEY
    if (!apiKey) {
      throw new Error("Google API key is not configured")
    }

    // Make multiple requests with different strategies to get more results
    for (let i = 0; i < numRequests; i++) {
      // Build the request body for Places API v1
      const requestBody: any = {
        textQuery: sanitizedQuery,
        languageCode: "en",
      }

      // Add price level filters if provided
      if (minPrice !== undefined || maxPrice !== undefined) {
        requestBody.priceLevels = []

        const min = minPrice || 0
        const max = maxPrice || 4

        for (let j = min; j <= max; j++) {
          requestBody.priceLevels.push(`PRICE_LEVEL_${j}`)
        }
      }

      // For subsequent requests, try different search strategies to get more variety
      if (i > 0) {
        // Try different variations of the query to get more results
        const variations = [
          `${sanitizedQuery} near me`,
          `${sanitizedQuery} ${location || ''}`,
          `best ${sanitizedQuery}`,
          `popular ${sanitizedQuery}`,
          `${sanitizedQuery} restaurant`, // Add common terms
          `${sanitizedQuery} place`,
        ]
        
        // Use a different variation for each subsequent request
        const variationIndex = (i - 1) % variations.length
        requestBody.textQuery = variations[variationIndex]
        
        console.log(`Google Places request ${i + 1}/${numRequests}: using variation "${requestBody.textQuery}"`)
      } else {
        console.log(`Google Places request ${i + 1}/${numRequests}: using original query "${requestBody.textQuery}"`)
      }

      // Make the API request to Places API v1 with enhanced field mask
      const response = await fetch(`https://places.googleapis.com/v1/places:searchText`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": ENHANCED_FIELD_MASK, // Use enhanced field mask
        },
        body: JSON.stringify(requestBody),
        cache: "no-store",
      })

      if (!response.ok) {
        console.error(`Google Places API v1 HTTP error on request ${i + 1}: ${response.status} ${response.statusText}`)
        const errorText = await response.text()
        console.error(`Error response: ${errorText}`)
        continue // Skip this request but continue with others
      }

      const data = await response.json()

      console.log(`Google Places v1 search API response received for request ${i + 1}`)
      console.log(`Found ${data.places?.length || 0} places for query: ${requestBody.textQuery}`)

      // Log the first few results for debugging
      if (data.places && data.places.length > 0) {
        data.places.slice(0, 3).forEach((place: any, index: number) => {
          console.log(`Result ${index + 1}: ${place.displayName?.text}, ${place.formattedAddress}`)
          // Log additional rich data if available
          if (place.nationalPhoneNumber) {
            console.log(`  Phone: ${place.nationalPhoneNumber}`)
          }
          if (place.websiteUri) {
            console.log(`  Website: ${place.websiteUri}`)
          }
          if (place.editorialSummary?.text) {
            console.log(`  Description: ${place.editorialSummary.text.substring(0, 100)}...`)
          }
        })
      }

      if (data.error) {
        console.error(`Google Places API v1 error on request ${i + 1}:`, data.error)
        continue // Skip this request but continue with others
      }

      // Filter out duplicates and add new places
      const newPlaces = (data.places || []).filter((place: GooglePlace) => {
        if (!place.id || seenIds.has(place.id)) {
          return false
        }
        seenIds.add(place.id)
        return true
      })

      allPlaces.push(...newPlaces)
      
      // If we got fewer results than the per-request limit, we've likely reached the end
      if (!data.places || data.places.length < maxPerRequest) {
        console.log(`Reached end of Google Places results after ${i + 1} requests`)
        break
      }
      
      // Add a small delay between requests to be respectful to the API
      if (i < numRequests - 1) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    console.log(`Total Google Places found: ${allPlaces.length}`)
    return allPlaces
  } catch (error) {
    console.error("Error searching Google Places:", error)
    throw error
  }
}

// Function to get place details from Google Places API v1
export async function getPlaceDetails(placeId: string): Promise<any> {
  // This function should only be called server-side
  if (typeof window !== "undefined" && process.env.NODE_ENV !== "development") {
    console.error("getPlaceDetails should only be called from server components or actions")
    return null
  }
  try {
    const apiKey = process.env.GOOGLE_API_KEY
    if (!apiKey) {
      throw new Error("Google API key is not configured")
    }

    // Sanitize input
    const sanitizedPlaceId = sanitizeInput(placeId)

    // Define the fields we want to retrieve
    const fields = [
      "id",
      "displayName",
      "formattedAddress",
      "rating",
      "priceLevel",
      "types",
      "photos",
      "regularOpeningHours",
    ]

    // Build the URL for Places API v1
    const url = `https://places.googleapis.com/v1/places/${sanitizedPlaceId}`

    // Make the API request
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": fields.join(","),
      },
      cache: "no-store",
    })

    if (!response.ok) {
      throw new Error(`Google Places API v1 error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    if (data.error) {
      console.error("Google Places API v1 error:", data.error)
      throw new Error(data.error.message || "API error")
    }

    return data
  } catch (error) {
    console.error("Error getting place details:", error)
    throw error
  }
}

// Function to get autocomplete predictions for cities
export async function getPlacesAutocomplete(input: string, types = "cities"): Promise<AutocompletePrediction[]> {
  // Remove the client-side check that's causing the error
  // This function is being called from a route handler which is a server component
  try {
    const apiKey = process.env.GOOGLE_API_KEY
    if (!apiKey) {
      console.warn("Google API key is not configured, using fallback")
      return [] // Will trigger fallback in the component
    }

    if (!input.trim()) {
      return []
    }

    // Sanitize input
    const sanitizedInput = sanitizeInput(input)

    // Build the request body for Places API v1 autocomplete
    const requestBody = {
      textQuery: sanitizedInput,
      types: ["locality"],
      languageCode: "en",
    }

    console.log(`Making Google Places v1 Autocomplete request for: ${sanitizedInput}`)

    try {
      // Make the API request to Places API v1
      const response = await fetch(`https://places.googleapis.com/v1/places:autocomplete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress",
        },
        body: JSON.stringify(requestBody),
        cache: "no-store",
      })

      if (!response.ok) {
        console.warn(`Google Places v1 Autocomplete API error: ${response.status}`)
        return [] // Will trigger fallback in the component
      }

      const data = await response.json()

      if (data.error) {
        console.warn(`Google Places API v1 error:`, data.error)
        return [] // Will trigger fallback in the component
      }

      // Convert the v1 API response format to match our existing format
      const predictions =
        data.places?.map((place: any) => ({
          description: place.displayName?.text,
          place_id: place.id,
          structured_formatting: {
            main_text: place.displayName?.text,
            secondary_text: place.formattedAddress || "",
          },
        })) || []

      return predictions
    } catch (error) {
      console.warn("Error with Places API v1 autocomplete, using fallback:", error)
      return [] // Will trigger fallback in the component
    }
  } catch (error) {
    console.warn("Error getting place autocomplete, using fallback:", error)
    return [] // Will trigger fallback in the component
  }
}

// Add this function for debugging
export async function debugGooglePlacesAPI(city: string): Promise<any> {
  try {
    const apiKey = process.env.GOOGLE_API_KEY
    if (!apiKey) {
      throw new Error("Google API key is not configured")
    }

    // Test with Places API v1
    console.log("Testing with Places API v1...")

    const requestBody = {
      textQuery: `restaurants in ${city}`,
      languageCode: "en",
    }

    const response = await fetch(`https://places.googleapis.com/v1/places:searchText`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.id,places.displayName",
      },
      body: JSON.stringify(requestBody),
    })

    const responseText = await response.text()

    let data
    try {
      data = JSON.parse(responseText)
      console.log("Places API v1 response status:", response.status)

      return {
        api_version: "v1",
        status: response.status,
        data: data,
        raw_response: responseText.substring(0, 500) + "...", // First 500 chars for debugging
      }
    } catch (e) {
      console.error("Failed to parse response as JSON:", e)
      return {
        api_version: "v1",
        error: "Failed to parse response",
        raw_response: responseText.substring(0, 500) + "...",
      }
    }
  } catch (error) {
    console.error("Error in debug function:", error)
    return { error: error instanceof Error ? error.message : String(error) }
  }
}

