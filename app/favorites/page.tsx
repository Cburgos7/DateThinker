"use client"

import { redirect } from "next/navigation"
import { getCurrentUser, getUserWithSubscription } from "@/lib/supabase"
import { getUserFavorites } from "@/lib/favorites"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MapPin, Star, Trash2 } from "lucide-react"
import { removeFromFavoritesAction } from "@/app/actions/favorites"
import { useEffect, useState } from "react"

export default function FavoritesPage() {
  const [user, setUser] = useState<any>(null)
  const [userWithSubscription, setUserWithSubscription] = useState<any>(null)
  const [favorites, setFavorites] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const currentUser = await getCurrentUser()
        if (!currentUser) {
          redirect("/login?redirect=/favorites")
        }
        setUser(currentUser)
        
        const currentUserWithSubscription = await getUserWithSubscription()
        if (!currentUserWithSubscription) {
          redirect("/login?redirect=/favorites")
        }
        setUserWithSubscription(currentUserWithSubscription)
        
        if (currentUserWithSubscription.subscription_status === "premium" || 
            currentUserWithSubscription.subscription_status === "lifetime") {
          const userFavorites = await getUserFavorites(currentUser.id)
          setFavorites(userFavorites)
        }
      } catch (error) {
        console.error("Error fetching data:", error)
        redirect("/login?redirect=/favorites")
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (!user || !userWithSubscription) {
    return null
  }

  // Check if user has premium access
  if (userWithSubscription.subscription_status !== "premium" && 
      userWithSubscription.subscription_status !== "lifetime") {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Premium Feature</CardTitle>
              <CardDescription>
                Favorites are only available for premium subscribers.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                Upgrade your account to save your favorite places and access them anytime.
              </p>
              <Button asChild>
                <a href="/account">Upgrade Now</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Your Favorite Places</h1>

        {favorites.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">You haven't saved any favorites yet.</p>
            <Button
              onClick={() => redirect("/")}
              className="bg-gradient-to-r from-rose-500 to-purple-500 hover:opacity-90"
            >
              Find Date Ideas
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {favorites.map((place) => (
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
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{place.name}</CardTitle>
                    <form action={async () => {
                      const { success } = await removeFromFavoritesAction(user.id, place.id)
                      if (success) {
                        window.location.reload()
                      }
                    }}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" type="submit">
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Remove from favorites</span>
                      </Button>
                    </form>
                  </div>
                  <CardDescription>{place.category.charAt(0).toUpperCase() + place.category.slice(1)}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 flex-wrap mb-2">
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
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                    <p className="truncate">{place.address}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

