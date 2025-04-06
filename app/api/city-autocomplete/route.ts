import { NextResponse } from "next/server"
import { sanitizeInput } from "@/lib/api-utils"
import { getPlacesAutocomplete } from "@/lib/google-places"

export async function GET(request: Request) {
  try {
    // Get the query parameter
    const url = new URL(request.url)
    const query = url.searchParams.get("query")

    if (!query) {
      return NextResponse.json({ predictions: [] }, { status: 400 })
    }

    // Sanitize the input
    const sanitizedQuery = sanitizeInput(query)

    // Get API key
    const apiKey = process.env.GOOGLE_API_KEY

    if (!apiKey) {
      console.error("Google API key is not configured")
      return NextResponse.json({ predictions: [], error: "API key not configured" }, { status: 500 })
    }

    // Log that we're making a request (for debugging)
    console.log(`Making Google Places Autocomplete request for: ${sanitizedQuery}`)

    try {
      // Use our updated function to get autocomplete predictions
      const predictions = await getPlacesAutocomplete(sanitizedQuery)

      return NextResponse.json({ predictions })
    } catch (error) {
      console.error("Error in Places API v1 autocomplete:", error)
      return NextResponse.json(
        { predictions: [], error: "Failed to fetch city suggestions from Places API v1" },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Error in city autocomplete API:", error)
    return NextResponse.json({ predictions: [], error: "Failed to fetch city suggestions" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const query = body.query

    if (!query) {
      return NextResponse.json({ predictions: [] }, { status: 400 })
    }

    // Sanitize the input
    const sanitizedQuery = sanitizeInput(query)

    // Get API key
    const apiKey = process.env.GOOGLE_API_KEY

    if (!apiKey) {
      console.error("Google API key is not configured")
      return NextResponse.json({ predictions: [], error: "API key not configured" }, { status: 500 })
    }

    // Log that we're making a request (for debugging)
    console.log(`Making Google Places Autocomplete request for: ${sanitizedQuery}`)

    try {
      // Use our updated function to get autocomplete predictions
      const predictions = await getPlacesAutocomplete(sanitizedQuery)

      return NextResponse.json({ predictions })
    } catch (error) {
      console.error("Error in Places API v1 autocomplete:", error)
      return NextResponse.json(
        { predictions: [], error: "Failed to fetch city suggestions from Places API v1" },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Error in city autocomplete API:", error)
    return NextResponse.json({ predictions: [], error: "Failed to fetch city suggestions" }, { status: 500 })
  }
}

