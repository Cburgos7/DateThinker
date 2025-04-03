"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getCurrentUser } from "@/lib/supabase"
import { getDateSetByIdAction } from "@/app/actions/date-sets"
import { deleteAndRedirectAction } from "@/app/actions/delete-date-plan"
import { notFound } from "next/navigation"
import { format, parseISO } from "date-fns"
import Link from "next/link"
import { CalendarIcon, Clock, MapPin, Star, Download, Trash2, ArrowLeft, Copy } from "lucide-react"
import { ShareDatePlan } from "@/components/share-date-plan"

export default async function DatePlanDetailPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const user = await getCurrentUser()
  const showShare = searchParams.share === "true"

  // Get the date set
  const { success, dateSet, error } = await getDateSetByIdAction(params.id)

  if (!success || !dateSet) {
    notFound()
  }

  // Check if user is the owner (only for certain operations)
  const isOwner = user?.id === dateSet.user_id

  return (
    <>
      <Header isLoggedIn={!!user} userName={user?.full_name} avatarUrl={user?.avatar_url} />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <Link href="/date-plans">
              <Button variant="ghost" size="sm" className="gap-1">
                <ArrowLeft className="h-4 w-4" />
                Back to Plans
              </Button>
            </Link>

            {isOwner && (
              <form action={deleteAndRedirectAction.bind(null, params.id)}>
                <Button variant="outline" size="sm" className="text-red-500 border-red-200 hover:bg-red-50 gap-1">
                  <Trash2 className="h-4 w-4" />
                  Delete Plan
                </Button>
              </form>
            )}
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

              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() => {
                  const shareUrl = `${window.location.origin}/shared/${dateSet.share_id}`
                  navigator.clipboard.writeText(shareUrl)
                  alert("Share link copied to clipboard!")
                }}
              >
                <Copy className="h-4 w-4" />
                Copy Share Link
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

          {showShare && <ShareDatePlan dateSet={dateSet} />}
        </div>
      </main>
      <Footer />
    </>
  )
}

