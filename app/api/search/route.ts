import { NextResponse } from "next/server"
import { searchPlaces } from "@/lib/search-utils"

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  console.log("[Search API] GET request received")
  console.log("[Search API] URL:", request.url)
  
  try {
    const url = new URL(request.url)
    const city = url.searchParams.get('city')
    const filters = url.searchParams.get('filters')
    const priceRange = url.searchParams.get('priceRange')

    if (!city) {
      console.log("[Search API] Missing city parameter")
      return NextResponse.json(
        { error: "City is required" },
        { status: 400 }
      )
    }

    const results = await searchPlaces({
      city,
      filters: filters ? JSON.parse(filters) : undefined,
      priceRange: priceRange ? JSON.parse(priceRange) : undefined
    })
    console.log("[Search API] Search results:", results)

    return NextResponse.json(results)
  } catch (error) {
    console.error("[Search API] Error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  console.log("[Search API] Called with method:", request.method)
  console.log("[Search API] Headers:", Object.fromEntries(request.headers))

  try {
    const body = await request.json()
    console.log("[Search API] Request body:", body)

    if (!body.city) {
      console.log("[Search API] Missing city parameter")
      return NextResponse.json(
        { error: "City is required" },
        { status: 400 }
      )
    }

    const results = await searchPlaces({
      city: body.city,
      filters: body.filters,
      priceRange: body.priceRange,
      excludeIds: body.excludeIds
    })
    console.log("[Search API] Search results:", results)

    return NextResponse.json(results)
  } catch (error) {
    console.error("[Search API] Error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function OPTIONS(request: Request) {
  console.log("[Search API] OPTIONS request received")
  return new NextResponse(null, { status: 200 })
}