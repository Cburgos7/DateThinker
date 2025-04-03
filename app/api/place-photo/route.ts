import { NextResponse } from "next/server"
import { sanitizeInput } from "@/lib/api-utils"

export async function GET(request: Request) {
  try {
    // Get the query parameters from the request URL
    const { searchParams } = new URL(request.url)
    const photoName = searchParams.get("photoName")
    const maxWidth = searchParams.get("maxWidth") || "600"

    if (!photoName) {
      return NextResponse.json({ error: "Photo name is required" }, { status: 400 })
    }

    // Sanitize inputs
    const sanitizedPhotoName = sanitizeInput(photoName)
    const sanitizedMaxWidth = sanitizeInput(maxWidth)

    // Get API key
    const apiKey = process.env.GOOGLE_API_KEY

    if (!apiKey) {
      console.error("Google API key is not configured")
      return NextResponse.json({ error: "API key not configured" }, { status: 500 })
    }

    // Build the URL for the photo
    const photoUrl = `https://places.googleapis.com/v1/${sanitizedPhotoName}/media?maxWidthPx=${sanitizedMaxWidth}&key=${apiKey}`

    // Fetch the photo
    const response = await fetch(photoUrl, {
      headers: {
        Accept: "image/*",
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch photo: ${response.status} ${response.statusText}` },
        { status: response.status },
      )
    }

    // Get the image data
    const imageData = await response.arrayBuffer()
    const contentType = response.headers.get("content-type") || "image/jpeg"

    // Return the image
    return new NextResponse(imageData, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400", // Cache for 24 hours
      },
    })
  } catch (error) {
    console.error("Error fetching place photo:", error)
    return NextResponse.json({ error: "Failed to fetch photo" }, { status: 500 })
  }
}

