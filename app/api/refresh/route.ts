import { NextResponse } from "next/server"
import { refreshPlace } from "@/lib/search-utils"

export const runtime = 'nodejs'

export async function POST(request: Request) {
  console.log("Refresh API called")
  
  try {
    const body = await request.json()
    console.log("Refresh request body:", body)
    const { type, city, placeId, priceRange } = body

    if (!type || !city) {
      console.log("Missing required parameters")
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      )
    }

    console.log("Calling refreshPlace with:", { type, city, placeId, priceRange })
    const result = await refreshPlace(type, city, placeId, priceRange)
    console.log("Refresh result:", result)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error in refresh API:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to refresh place" },
      { status: 500 }
    )
  }
}

export async function OPTIONS(request: Request) {
  console.log("OPTIONS request received")
  return NextResponse.json({}, { status: 200 })
} 