import { NextResponse } from "next/server"
import { searchPlaces } from "@/lib/search-utils"

export async function POST(request: Request) {
  console.log("Search API called")
  
  try {
    const body = await request.json()
    console.log("Search request body:", body)

    if (!body.city) {
      return NextResponse.json(
        { error: "City is required" },
        { status: 400 }
      )
    }

    const results = await searchPlaces(body)
    console.log("Search results:", results)
    
    return NextResponse.json(results)
  } catch (error) {
    console.error("Error in search API:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to search places" },
      { status: 500 }
    )
  }
}

export async function OPTIONS(request: Request) {
  return NextResponse.json({}, { status: 200 })
} 