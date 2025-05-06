import { NextResponse } from "next/server"
import { sanitizeInput } from "@/lib/api-utils"

// Mark this route as dynamic since it uses request.url
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    // Get the query parameter
    const url = new URL(request.url)
    const city = url.searchParams.get("city")
    const type = url.searchParams.get("type") || "restaurants"

    if (!city) {
      return NextResponse.json({ error: "City parameter is required" }, { status: 400 })
    }

    // Sanitize the input
    const sanitizedCity = sanitizeInput(city)
    const sanitizedType = sanitizeInput(type)

    // Get API key
    const apiKey = process.env.GOOGLE_API_KEY

    if (!apiKey) {
      console.error("Google API key is not configured")
      return NextResponse.json({ error: "API key not configured" }, { status: 500 })
    }

    // Build the URL exactly like your Express server
    const googleApiUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${sanitizedType}+in+${encodeURIComponent(sanitizedCity)}&key=${apiKey}`

    console.log(`Making direct Google Places API request: ${googleApiUrl}`)

    // Make the API request
    const response = await fetch(googleApiUrl, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    })

    // Update the error handling to include more details
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Google API HTTP error: ${response.status} ${response.statusText}`)
      console.error(`Error response: ${errorText}`)
      return NextResponse.json(
        {
          error: `API error: ${response.status}`,
          details: errorText,
        },
        { status: 500 },
      )
    }

    // After getting the data, log more details
    const data = await response.json()
    console.log(`Google Places API response status: ${data.status}`)
    console.log(`Google Places API error message: ${data.error_message || "None"}`)

    // If there's an error in the API response, include it in the returned data
    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      console.error("Google Places API error:", data.error_message || data.status)
      return NextResponse.json(
        {
          results: [],
          status: data.status,
          error_message: data.error_message,
        },
        { status: 200 },
      ) // Still return 200 to see the error details in the UI
    }

    // Log the response status and first result for debugging
    if (data.results && data.results.length > 0) {
      console.log(`First result: ${data.results[0].name}, ${data.results[0].formatted_address}`)
    }

    // Return the raw response just like your Express server
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in places API:", error)
    return NextResponse.json({ error: "Failed to fetch places" }, { status: 500 })
  }
}

