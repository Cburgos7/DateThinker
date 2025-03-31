import { NextResponse } from "next/server"

export async function GET() {
  // Return a minimal response with just the success status
  // We no longer expose the API key directly
  return NextResponse.json({ success: true })
}

