import { NextResponse } from "next/server"

export const runtime = 'nodejs'

export async function GET(request: Request) {
  console.log("[Test API] GET request received")
  console.log("[Test API] Headers:", Object.fromEntries(request.headers))
  return NextResponse.json({ message: "Test API is working" })
}

export async function POST(request: Request) {
  console.log("[Test API] POST request received")
  console.log("[Test API] Headers:", Object.fromEntries(request.headers))
  
  try {
    const body = await request.json()
    console.log("[Test API] Request body:", body)
    return NextResponse.json({ message: "Test API received your data", data: body })
  } catch (error) {
    console.error("[Test API] Error:", error)
    return NextResponse.json(
      { error: "Failed to parse request body" },
      { status: 400 }
    )
  }
}

export async function OPTIONS(request: Request) {
  console.log("[Test API] OPTIONS request received")
  return new NextResponse(null, { status: 200 })
} 