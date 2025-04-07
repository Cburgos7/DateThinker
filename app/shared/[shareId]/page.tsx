"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { getDateSetById } from "@/lib/date-sets"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Calendar, Clock, Utensils, Coffee, Wine, Star } from "lucide-react"
import { getCurrentUser } from "@/lib/supabase"
import Image from "next/image"

export default function SharedDatePage() {
  const params = useParams()
  const shareId = params?.shareId as string || ""
  const [dateSet, setDateSet] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    async function loadData() {
      try {
        const [currentUser, dateSetData] = await Promise.all([
          getCurrentUser(),
          getDateSetById(shareId),
        ])

        setUser(currentUser)
        setDateSet(dateSetData)
      } catch (error) {
        console.error("Error loading shared date:", error)
      } finally {
        setIsLoading(false)
      }
    }

    if (shareId) {
      loadData()
    } else {
      setIsLoading(false)
    }
  }, [shareId])

  if (isLoading) {
    return (
      <>
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="space-y-4">
              <div className="h-48 bg-gray-200 rounded"></div>
              <div className="h-48 bg-gray-200 rounded"></div>
              <div className="h-48 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  if (!dateSet) {
    return (
      <>
        <Header />
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold mb-4">Date not found</h1>
          <p>The shared date you're looking for doesn't exist or has been deleted.</p>
        </div>
        <Footer />
      </>
    )
  }

  const { title, description, date, time, places } = dateSet

  return (
    <>
      <Header isLoggedIn={!!user} userName={user?.full_name} avatarUrl={user?.avatar_url} />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold">{title}</h1>
            <Badge variant="outline" className="text-rose-500 border-rose-200">
              Shared Date
            </Badge>
          </div>

          {description && <p className="text-gray-600 mb-8">{description}</p>}

          <div className="flex flex-wrap gap-4 mb-8">
            {date && (
              <div className="flex items-center text-gray-600">
                <Calendar className="w-4 h-4 mr-2" />
                <span>{new Date(date).toLocaleDateString()}</span>
              </div>
            )}
            {time && (
              <div className="flex items-center text-gray-600">
                <Clock className="w-4 h-4 mr-2" />
                <span>{time}</span>
              </div>
            )}
          </div>

          <div className="grid gap-6">
            {places.map((place: any, index: number) => (
              <Card key={place.id || index}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{place.name}</CardTitle>
                      <CardDescription>{place.address}</CardDescription>
                    </div>
                    <Badge
                      className={
                        place.type === "restaurant"
                          ? "bg-rose-500"
                          : place.type === "drinks"
                            ? "bg-purple-500"
                            : "bg-blue-500"
                      }
                    >
                      {place.type === "restaurant" ? (
                        <Utensils className="w-4 h-4" />
                      ) : place.type === "drinks" ? (
                        <Wine className="w-4 h-4" />
                      ) : (
                        <Coffee className="w-4 h-4" />
                      )}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {place.image && (
                      <Image
                        src={place.image}
                        alt={place.name}
                        width={500}
                        height={300}
                        className="w-full h-48 object-cover rounded-lg"
                      />
                    )}
                    <div className="flex items-center text-gray-600">
                      <MapPin className="w-4 h-4 mr-2" />
                      <span>{place.address}</span>
                    </div>
                    {place.rating && (
                      <div className="flex items-center text-gray-600">
                        <Star className="w-4 h-4 mr-2 text-yellow-400" />
                        <span>{place.rating} / 5</span>
                      </div>
                    )}
                    {place.description && <p className="text-gray-600">{place.description}</p>}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    variant="outline"
                    onClick={() => window.open(place.url || `https://maps.google.com/?q=${place.address}`)}
                  >
                    View Details
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}

