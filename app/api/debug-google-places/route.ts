import { NextResponse } from "next/server"

// Mark this route as dynamic
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    // Get the query parameter
    const url = new URL(request.url)
    const apiKey = process.env.GOOGLE_API_KEY
    const query = url.searchParams.get("query") || "restaurants in San Francisco" 

    if (!apiKey) {
      return NextResponse.json({ error: "Google API key is not configured" }, { status: 500 })
    }

    // Test the text search API
    const textSearchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`
    
    console.log(`Testing Google Places API with URL: ${textSearchUrl}`)
    
    const textSearchResponse = await fetch(textSearchUrl, {
      cache: "no-store",
      headers: {
        "Accept": "application/json"
      }
    })

    if (!textSearchResponse.ok) {
      const errorText = await textSearchResponse.text()
      console.error(`Google API HTTP error: ${textSearchResponse.status} ${textSearchResponse.statusText}`)
      console.error(`Error response: ${errorText}`)
      return NextResponse.json({
        error: `API error: ${textSearchResponse.status}`,
        details: errorText
      }, { status: 500 })
    }

    const textSearchData = await textSearchResponse.json()
    
    // Return debug information
    return NextResponse.json({
      apiKeyProvided: !!apiKey,
      apiKeyFirstChars: apiKey ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : null,
      testQuery: query,
      textSearchResults: {
        status: textSearchData.status,
        errorMessage: textSearchData.error_message || null,
        resultsCount: textSearchData.results?.length || 0,
        firstResult: textSearchData.results?.[0] ? {
          name: textSearchData.results[0].name,
          address: textSearchData.results[0].formatted_address,
          placeId: textSearchData.results[0].place_id
        } : null
      },
      fullResponse: textSearchData
    })
  } catch (error) {
    console.error("Error in debug API:", error)
    return NextResponse.json({ 
      error: "Failed to test Google Places API", 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

