import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getCurrentUser } from "@/lib/supabase"
import { getSharedDateSetAction } from "@/app/actions/date-sets"
import { notFound } from "next/navigation"
import { format, parseISO } from "date-fns"
import Link from "next/link"
import { CalendarIcon, Clock, MapPin, Star, Download, ArrowLeft } from "lucide-react"

export default async function SharedDatePlanPage({
  params,
}: {
  params: { shareId: string }
}) {
  const user = await getCurrentUser()

  // Get the shared date set
  const { success, dateSet, error } = await getSharedDateSetAction(params.shareId)

  if (!success || !dateSet) {
    notFound()
  }

  return (
    <>
      <Header isLoggedIn={!!user} userName={user?.full_name || undefined} avatarUrl={user?.avatar_url || undefined} />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-1">
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Button>
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h1 className="text-2xl font-bold mb-2">{dateSet.title}</h1>

            <div className="flex flex-wrap gap-4 mb-4">
              <div className="flex items-center">
                <CalendarIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                <span>{format(parseISO(dateSet.date), "EEEE, MMMM d, yyyy")}</span>
              </div>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                <span>
                  {dateSet.start_time} - {dateSet.end_time}
                </span>
              </div>
            </div>

            {dateSet.notes && (
              <div className="bg-gray-50 p-4 rounded-md mb-4">
                <h3 className="font-medium mb-2">Notes</h3>
                <p className="text-sm whitespace-pre-wrap">{dateSet.notes}</p>
              </div>
            )}

            <div className="flex flex-wrap gap-2 mb-4">
              <Button asChild variant="outline" size="sm" className="gap-1">
                <Link href={`/api/calendar/${dateSet.id}`} target="_blank">
                  <Download className="h-4 w-4" />
                  Download Calendar (.ics)
                </Link>
              </Button>

              <Button asChild variant="outline" size="sm" className="gap-1">
                <Link
                  href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(dateSet.title)}&dates=${dateSet.date.replace(/-/g, "")}T${dateSet.start_time.replace(/:/g, "")}00/${dateSet.date.replace(/-/g, "")}T${dateSet.end_time.replace(/:/g, "")}00`}
                  target="_blank"
                >
                  <CalendarIcon className="h-4 w-4" />
                  Add to Google Calendar
                </Link>
              </Button>
            </div>
          </div>

          <h2 className="text-xl font-bold mb-4">Date Locations</h2>

          <div className="space-y-4">
            {dateSet.places.map((place: any, index: number) => (
              <Card key={place.id} className="overflow-hidden">
                {place.photoUrl && (
                  <div className="h-40 w-full overflow-hidden">
                    <img
                      src={place.photoUrl || "/placeholder.svg"}
                      alt={place.name}
                      className="w-full h-full object-cover"
                      crossOrigin="anonymous"
                    />
                  </div>
                )}
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">
                    {index + 1}. {place.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="flex items-center">
                        <Star className="h-4 w-4 text-yellow-500 mr-1" />
                        <span className="text-sm">{place.rating.toFixed(1)}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {Array.from({ length: place.price }).map((_, i) => (
                          <span key={i} className="text-green-500">
                            $
                          </span>
                        ))}
                      </div>
                      {place.openNow !== undefined && (
                        <div className="text-sm">
                          {place.openNow ? (
                            <span className="text-green-600">Open now</span>
                          ) : (
                            <span className="text-red-500">Closed</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                      <p className="truncate">{place.address}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}

