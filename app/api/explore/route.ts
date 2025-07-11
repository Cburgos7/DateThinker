import { NextResponse } from "next/server"
import { searchPlacesForExplore } from "@/lib/search-utils"

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  console.log("[Explore API] POST request received")
  
  try {
    const body = await request.json()
    console.log("[Explore API] Request body:", body)

    if (!body.city) {
      console.log("[Explore API] Missing city parameter")
      return NextResponse.json(
        { error: "City is required" },
        { status: 400 }
      )
    }

    const venues = await searchPlacesForExplore({
      city: body.city,
      placeId: body.placeId,
      maxResults: body.maxResults || 20,
      excludeIds: body.excludeIds || []
    })

    console.log(`[Explore API] Found ${venues.length} venues for ${body.city}`)

    return NextResponse.json({
      venues,
      total: venues.length,
      city: body.city
    })
  } catch (error) {
    console.error("[Explore API] Error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  console.log("[Explore API] GET request received")
  
  try {
    const url = new URL(request.url)
    const city = url.searchParams.get('city')
    const maxResults = parseInt(url.searchParams.get('maxResults') || '20')
    const excludeIds = url.searchParams.get('excludeIds')?.split(',') || []

    if (!city) {
      console.log("[Explore API] Missing city parameter")
      return NextResponse.json(
        { error: "City is required" },
        { status: 400 }
      )
    }

    const venues = await searchPlacesForExplore({
      city,
      maxResults,
      excludeIds
    })

    console.log(`[Explore API] Found ${venues.length} venues for ${city}`)

    return NextResponse.json({
      venues,
      total: venues.length,
      city
    })
  } catch (error) {
    console.error("[Explore API] Error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 