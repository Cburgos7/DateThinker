import { NextResponse } from "next/server"
import { sanitizeInput } from "@/lib/api-utils"

// Mark this route as dynamic since it uses request.url
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    // Get the query parameters
    const url = new URL(request.url)
    const city = url.searchParams.get("city")
    const type = url.searchParams.get("type") || "restaurants"
    const query = url.searchParams.get("query")
    const location = url.searchParams.get("location")

    // Get API key
    const apiKey = process.env.GOOGLE_API_KEY

    if (!apiKey) {
      console.error("Google API key is not configured")
      return NextResponse.json({ error: "API key not configured" }, { status: 500 })
    }

    // If we have a specific query, use the new Places API v1 for text search
    if (query) {
      const sanitizedQuery = sanitizeInput(query)
      
      // Build the request body for Places API v1
      const requestBody = {
        textQuery: sanitizedQuery,
        languageCode: "en",
      }

      console.log(`Making Google Places v1 text search for: ${sanitizedQuery}`)

      // Make the API request to Places API v1
      const response = await fetch(`https://places.googleapis.com/v1/places:searchText`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.rating,places.priceLevel,places.types,places.photos,places.regularOpeningHours,places.internationalPhoneNumber,places.websiteUri",
        },
        body: JSON.stringify(requestBody),
        cache: "no-store",
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Google Places v1 API HTTP error: ${response.status} ${response.statusText}`)
        console.error(`Error response: ${errorText}`)
        return NextResponse.json(
          {
            error: `API error: ${response.status}`,
            details: errorText,
          },
          { status: 500 },
        )
      }

      const data = await response.json()
      console.log(`Google Places v1 API response status: ${response.status}`)

      if (data.error) {
        console.error("Google Places v1 API error:", data.error)
        return NextResponse.json(
          {
            results: [],
            status: "ERROR",
            error_message: data.error.message || "API error",
          },
          { status: 200 },
        )
      }

      // Convert v1 API response to match the legacy format
      const results = data.places?.map((place: any) => ({
        place_id: place.id,
        name: place.displayName?.text || place.displayName,
        formatted_address: place.formattedAddress,
        rating: place.rating,
        price_level: place.priceLevel,
        types: place.types,
        photos: place.photos,
        opening_hours: place.regularOpeningHours,
        formatted_phone_number: place.internationalPhoneNumber,
        website: place.websiteUri,
      })) || []

      console.log(`Found ${results.length} places for query: ${sanitizedQuery}`)

      return NextResponse.json({
        status: "OK",
        results: results
      })

    } else {
      // Fallback to the original city/type search using v1 API
      if (!city) {
        return NextResponse.json({ error: "City parameter is required when no query is provided" }, { status: 400 })
      }

      // Sanitize the input
      const sanitizedCity = sanitizeInput(city)
      const sanitizedType = sanitizeInput(type)

      // Build the request body for Places API v1
      const requestBody = {
        textQuery: `${sanitizedType} in ${sanitizedCity}`,
        languageCode: "en",
      }

      console.log(`Making Google Places v1 city search: ${sanitizedType} in ${sanitizedCity}`)

      // Make the API request to Places API v1
      const response = await fetch(`https://places.googleapis.com/v1/places:searchText`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.rating,places.priceLevel,places.types,places.photos,places.regularOpeningHours,places.internationalPhoneNumber,places.websiteUri",
        },
        body: JSON.stringify(requestBody),
        cache: "no-store",
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Google Places v1 API HTTP error: ${response.status} ${response.statusText}`)
        console.error(`Error response: ${errorText}`)
        return NextResponse.json(
          {
            error: `API error: ${response.status}`,
            details: errorText,
          },
          { status: 500 },
        )
      }

      const data = await response.json()
      console.log(`Google Places v1 API response status: ${response.status}`)

      if (data.error) {
        console.error("Google Places v1 API error:", data.error)
        return NextResponse.json(
          {
            results: [],
            status: "ERROR",
            error_message: data.error.message || "API error",
          },
          { status: 200 },
        )
      }

      // Convert v1 API response to match the legacy format
      const results = data.places?.map((place: any) => ({
        place_id: place.id,
        name: place.displayName?.text || place.displayName,
        formatted_address: place.formattedAddress,
        rating: place.rating,
        price_level: place.priceLevel,
        types: place.types,
        photos: place.photos,
        opening_hours: place.regularOpeningHours,
        formatted_phone_number: place.internationalPhoneNumber,
        website: place.websiteUri,
      })) || []

      console.log(`Found ${results.length} places for ${sanitizedType} in ${sanitizedCity}`)

      return NextResponse.json({
        status: "OK",
        results: results
      })
    }
  } catch (error) {
    console.error("Error in places API:", error)
    return NextResponse.json({ error: "Failed to fetch places" }, { status: 500 })
  }
}

