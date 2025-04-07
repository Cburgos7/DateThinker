import { NextResponse } from "next/server"
import { refreshPlace } from "@/lib/search-utils"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { type, city, placeId, priceRange } = body

    if (!type || !city) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      )
    }

    const result = await refreshPlace(type, city, placeId, priceRange)
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
  return NextResponse.json({}, { status: 200 })
} 