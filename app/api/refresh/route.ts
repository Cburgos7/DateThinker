import { NextResponse } from "next/server"
import { refreshPlace } from "@/lib/search-utils"

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  console.log("[Refresh API] Called with method:", request.method)
  console.log("[Refresh API] Headers:", Object.fromEntries(request.headers))

  try {
    const body = await request.json()
    console.log("[Refresh API] Request body:", body)

    if (!body.type || !body.city) {
      console.log("[Refresh API] Missing required parameters")
      return NextResponse.json(
        { error: "Type and city are required" },
        { status: 400 }
      )
    }

    const result = await refreshPlace(
      body.type,
      body.city,
      body.placeId,
      body.priceRange
    )
    console.log("[Refresh API] Refresh result:", result)

    return NextResponse.json(result)
  } catch (error) {
    console.error("[Refresh API] Error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function OPTIONS(request: Request) {
  console.log("[Refresh API] OPTIONS request received")
  return new NextResponse(null, { status: 200 })
}