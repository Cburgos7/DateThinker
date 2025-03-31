import { NextResponse } from "next/server"
import { sanitizeInput } from "@/lib/api-utils"
import { debugGooglePlacesAPI } from "@/lib/google-places"

export async function GET(request: Request) {
  try {
    // Get the query parameter
    const url = new URL(request.url)
    const city = url.searchParams.get("city")

    if (!city) {
      return NextResponse.json({ error: "City parameter is required" }, { status: 400 })
    }

    // Sanitize the input
    const sanitizedCity = sanitizeInput(city)

    // Call the debug function
    const result = await debugGooglePlacesAPI(sanitizedCity)

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error in debug API:", error)
    return NextResponse.json({ error: "Failed to debug Google Places API" }, { status: 500 })
  }
}

