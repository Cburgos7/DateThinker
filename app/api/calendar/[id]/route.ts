import { NextRequest, NextResponse } from "next/server"
import { getDateSetById, generateICalEvent } from "@/lib/date-sets"

export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.pathname.split("/").pop()
    if (!id) {
      return NextResponse.json({ error: "Missing date set ID" }, { status: 400 })
    }

    const dateSet = await getDateSetById(id)

    if (!dateSet) {
      return NextResponse.json({ error: "Date set not found" }, { status: 404 })
    }

    const icalContent = generateICalEvent(dateSet)

    return new NextResponse(icalContent, {
      headers: {
        "Content-Type": "text/calendar",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(dateSet.title)}.ics"`,
      },
    })
  } catch (error) {
    console.error("Error generating calendar file:", error)
    return NextResponse.json({ error: "Failed to generate calendar file" }, { status: 500 })
  }
} 