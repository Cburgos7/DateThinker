import { sanitizeInput } from "./api-utils"

// Types for Google Places API responses
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
  }
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

// Function to search for places using Google Places API v1
export async function searchGooglePlaces(
  query: string,
  type: string,
  location?: string,
  radius = 5000,
  minPrice?: number,
  maxPrice?: number,
): Promise<GooglePlace[]> {
  // This function should only be called server-side
  if (typeof window !== "undefined" && process.env.NODE_ENV !== "development") {
    console.error("searchGooglePlaces should only be called from server components or actions")
    return []
  }
  try {
    // Sanitize inputs
    const sanitizedQuery = sanitizeInput(query)

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

      for (let i = min; i <= max; i++) {
        requestBody.priceLevels.push(`PRICE_LEVEL_${i}`)
      }
    }

    console.log(`Making Google Places v1 search request: ${sanitizedQuery}`)

    // This function should only be used server-side where the API key is available
    const apiKey = process.env.GOOGLE_API_KEY
    if (!apiKey) {
      throw new Error("Google API key is not configured")
    }

    // Make the API request to Places API v1
    const response = await fetch(`https://places.googleapis.com/v1/places:searchText`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.rating,places.priceLevel,places.types,places.photos,places.regularOpeningHours",
      },
      body: JSON.stringify(requestBody),
      cache: "no-store",
    })

    if (!response.ok) {
      console.error(`Google Places API v1 HTTP error: ${response.status} ${response.statusText}`)
      const errorText = await response.text()
      console.error(`Error response: ${errorText}`)
      throw new Error(`Google Places API v1 HTTP error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    console.log(`Google Places v1 search API response received`)
    console.log(`Found ${data.places?.length || 0} places for query: ${sanitizedQuery}`)

    // Log the first few results for debugging
    if (data.places && data.places.length > 0) {
      data.places.slice(0, 3).forEach((place: any, index: number) => {
        console.log(`Result ${index + 1}: ${place.displayName?.text}, ${place.formattedAddress}`)
      })
    }

    if (data.error) {
      console.error(`Google Places API v1 error:`, data.error)
      throw new Error(data.error.message || "API request error")
    }

    return data.places || []
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
    return { error: error.message }
  }
}

