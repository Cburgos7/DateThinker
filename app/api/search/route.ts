import { NextResponse } from "next/server"
import { searchPlaces } from "@/lib/search-utils"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const results = await searchPlaces(body)
    return NextResponse.json(results)
  } catch (error) {
    console.error("Error in search API:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to search places" },
      { status: 500 }
    )
  }
} 