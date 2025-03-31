import { NextResponse } from "next/server"
import { getDateSetById, generateICalEvent } from "@/lib/date-sets"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const dateSet = await getDateSetById(params.id)

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

