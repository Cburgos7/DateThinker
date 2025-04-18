import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { getCurrentUser } from "@/lib/supabase"
import { getUserDateSets } from "@/app/actions/date-sets"
import { CalendarDays, Clock, Share2, Download } from "lucide-react"
import Link from "next/link"
import * as dateFns from "date-fns"
import { redirect } from "next/navigation"

export default async function DatePlansPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login?redirect=/date-plans")
  }

  // Get user's date sets
  const result = await getUserDateSets(user.id)
  const dateSets = result.success ? result.data || [] : []

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-rose-500 to-purple-500">
            Your Date Plans
          </h1>

          {dateSets.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <h2 className="text-xl font-semibold mb-2">No Date Plans Yet</h2>
              <p className="text-muted-foreground mb-6">
                You haven't saved any date plans yet. Start by finding date ideas and save them here!
              </p>
              <Link href="/">
                <Button className="bg-gradient-to-r from-rose-500 to-purple-500 hover:opacity-90">
                  Find Date Ideas
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {dateSets.map((dateSet) => (
                <Card key={dateSet.id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex justify-between items-start">
                      <span>{dateSet.title}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center text-sm">
                        <CalendarDays className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>{dateFns.format(dateFns.parseISO(dateSet.date), "EEEE, MMMM d, yyyy")}</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>
                          {dateSet.start_time} - {dateSet.end_time}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Includes:</p>
                        <ul className="text-sm list-disc pl-5 space-y-1">
                          {dateSet.places.map((place: any) => (
                            <li key={place.id}>{place.name}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between border-t pt-4">
                    <Link href={`/date-plans/${dateSet.id}`}>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </Link>
                    <div className="flex space-x-2">
                      <Link href={`/date-plans/${dateSet.id}?share=true`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Share2 className="h-4 w-4" />
                          <span className="sr-only">Share</span>
                        </Button>
                      </Link>
                      <Link href={`/api/calendar/${dateSet.id}`} target="_blank">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Download className="h-4 w-4" />
                          <span className="sr-only">Download</span>
                        </Button>
                      </Link>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}

