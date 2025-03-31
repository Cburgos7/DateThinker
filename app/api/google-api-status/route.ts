import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Check if the Google API key is configured
    const isConfigured = !!process.env.GOOGLE_API_KEY

    // Return status without exposing the key
    return NextResponse.json({
      status: isConfigured ? "configured" : "not_configured",
    })
  } catch (error) {
    console.error("Error checking Google API status:", error)
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to check Google API status",
      },
      { status: 500 },
    )
  }
}

