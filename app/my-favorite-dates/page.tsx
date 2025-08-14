"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MapPin, Star, Trash2, Heart, ExternalLink, Filter, Plus, Check, Calendar } from "lucide-react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { toast } from "@/components/ui/use-toast"
import { StarRating } from "@/components/ui/star-rating"
import { PlaceDetailsModal } from "@/components/place-details-modal"
import { CreateDateSetModal } from "@/components/create-date-set-modal"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"

export default function MyFavoriteDatesPage() {
  const { user, isLoading: isLoadingUser } = useAuth()
  const [favorites, setFavorites] = useState<any[]>([])
  const [filteredFavorites, setFilteredFavorites] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [userSubscriptionStatus, setUserSubscriptionStatus] = useState<string>("free")
  const [selectedPlace, setSelectedPlace] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [ratingFilter, setRatingFilter] = useState<string>("all")
  const [selectedPlaces, setSelectedPlaces] = useState<any[]>([])
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [isCreateDateSetModalOpen, setIsCreateDateSetModalOpen] = useState(false)

  useEffect(() => {
    async function fetchData() {
      if (!user) {
        setIsLoading(false)
        return
      }

      try {
        console.log("🔄 Starting data fetch for my-favorite-dates...")
        
        // Get subscription status
        const statusResponse = await fetch('/api/auth/subscription-status', {
          method: 'GET',
          credentials: 'include'
        })
        
        if (statusResponse.ok) {
          const statusData = await statusResponse.json()
          console.log("🌐 Subscription status:", statusData)
          setUserSubscriptionStatus(statusData.subscription_status || "free")
        }
        
        // Fetch all favorites for this user using the server-side API
        console.log("🔄 Fetching favorites...")
        const favoritesResponse = await fetch('/api/favorites/check', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ getAllFavorites: true })
        })
        
        if (favoritesResponse.ok) {
          const favoritesData = await favoritesResponse.json()
          console.log("✅ Favorites loaded:", favoritesData.favorites?.length || 0)
          setFavorites(favoritesData.favorites || [])
          setFilteredFavorites(favoritesData.favorites || [])
        } else {
          console.error("❌ Failed to fetch favorites:", favoritesResponse.status)
          toast({
            title: "Error",
            description: "Failed to load your favorite places",
            variant: "destructive"
          })
        }
      } catch (error) {
        console.error("❌ Error fetching data:", error)
        toast({
          title: "Error",
          description: "Failed to load your favorite places",
          variant: "destructive"
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (!isLoadingUser) {
      fetchData()
    }
  }, [user, isLoadingUser])

  // Filter favorites based on rating
  useEffect(() => {
    if (ratingFilter === "all") {
      setFilteredFavorites(favorites)
    } else if (ratingFilter === "unrated") {
      setFilteredFavorites(favorites.filter(fav => !fav.user_rating))
    } else {
      const minRating = parseInt(ratingFilter)
      setFilteredFavorites(favorites.filter(fav => fav.user_rating >= minRating))
    }
  }, [favorites, ratingFilter])

  const handleRemoveFavorite = async (favoriteId: string) => {
    try {
      const response = await fetch('/api/favorites/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          favoriteId: favoriteId,
          action: 'remove'
        })
      })

      if (response.ok) {
        setFavorites(prev => prev.filter(fav => fav.id !== favoriteId))
        toast({
          title: "Removed from favorites",
          description: "The place has been removed from your favorites",
        })
      } else {
        throw new Error('Failed to remove favorite')
      }
    } catch (error) {
      console.error("Error removing favorite:", error)
      toast({
        title: "Error",
        description: "Failed to remove from favorites",
        variant: "destructive"
      })
    }
  }

  const handlePlaceClick = (place: any) => {
    setSelectedPlace(place)
    setIsModalOpen(true)
  }

  const handlePlaceUpdate = (updatedPlace: any) => {
    setFavorites(prev => 
      prev.map(fav => 
        fav.id === updatedPlace.id ? updatedPlace : fav
      )
    )
  }

  const toggleSelection = (place: any) => {
    setSelectedPlaces(prev => {
      const isSelected = prev.some(p => p.id === place.id)
      if (isSelected) {
        return prev.filter(p => p.id !== place.id)
      } else {
        return [...prev, place]
      }
    })
  }

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode)
    setSelectedPlaces([])
  }

  const handleCreateDateSet = () => {
    if (selectedPlaces.length > 0) {
      setIsCreateDateSetModalOpen(true)
    }
  }

  if (isLoadingUser || isLoading) {
    return (
      <>
        <Header />
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold mb-8">My Favorite Dates</h1>
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500 mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading your favorite places...</p>
            </div>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  if (!user) {
    return (
      <>
        <Header />
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold mb-8">My Favorite Dates</h1>
            <div className="text-center py-12">
              <Heart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Sign in to view favorites</h2>
              <p className="text-muted-foreground mb-6">
                You need to be signed in to save and view your favorite date spots.
              </p>
              <Button asChild>
                <Link href="/login">Sign In</Link>
              </Button>
            </div>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Header />
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center space-x-4">
              <h1 className="text-3xl font-bold flex items-center">
                <Heart className="h-8 w-8 text-rose-500 mr-3" />
                My Favorite Dates
              </h1>
              {userSubscriptionStatus && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Status:</span>
                  <span 
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      userSubscriptionStatus === 'premium' 
                        ? 'bg-purple-100 text-purple-700' 
                        : userSubscriptionStatus === 'lifetime'
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {userSubscriptionStatus === 'premium' ? 'Premium' : 
                     userSubscriptionStatus === 'lifetime' ? 'Lifetime' : 'Free'}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-3">
              {favorites.length > 0 && (
                <Button
                  variant={isSelectionMode ? "default" : "outline"}
                  onClick={toggleSelectionMode}
                  className={isSelectionMode ? "bg-blue-600 hover:bg-blue-700" : ""}
                >
                  {isSelectionMode ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Selection Mode
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Date Set
                    </>
                  )}
                </Button>
              )}
              <Button asChild>
                <Link href="/make-date" className="bg-gradient-to-r from-rose-500 to-purple-500 hover:opacity-90">
                  Find More Places
                </Link>
              </Button>
            </div>
          </div>

          {/* Filters */}
          {favorites.length > 0 && (
            <div className="mb-6 flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-600" />
                <span className="text-sm text-gray-600">Filter by rating:</span>
                <Select value={ratingFilter} onValueChange={setRatingFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Places</SelectItem>
                    <SelectItem value="unrated">Not Rated</SelectItem>
                    <SelectItem value="5">5 Stars</SelectItem>
                    <SelectItem value="4">4+ Stars</SelectItem>
                    <SelectItem value="3">3+ Stars</SelectItem>
                    <SelectItem value="2">2+ Stars</SelectItem>
                    <SelectItem value="1">1+ Stars</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="text-sm text-gray-600">
                Showing {filteredFavorites.length} of {favorites.length} places
              </div>
            </div>
          )}

          {filteredFavorites.length === 0 ? (
            <div className="text-center py-16">
              <div className="max-w-md mx-auto">
                <Heart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">
                  {favorites.length === 0 ? "No favorites yet" : "No places match your filter"}
                </h2>
                <p className="text-muted-foreground mb-6">
                  {favorites.length === 0 
                    ? "Start building your collection of favorite date spots! When you find places you love while planning dates, you can save them here."
                    : "Try adjusting your filter to see more places, or add ratings to your existing favorites."
                  }
                </p>
                <Button
                  asChild
                  className="bg-gradient-to-r from-rose-500 to-purple-500 hover:opacity-90"
                >
                  <Link href="/make-date">Find Date Ideas</Link>
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <p className="text-muted-foreground">
                  You have {favorites.length} favorite {favorites.length === 1 ? 'place' : 'places'} saved
                </p>
              </div>
              
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredFavorites.map((place) => {
                  const isSelected = selectedPlaces.some(p => p.id === place.id)
                  return (
                  <Card 
                    key={place.id} 
                    className={`overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer hover:scale-105 ${
                      isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                    }`}
                    onClick={() => isSelectionMode ? toggleSelection(place) : handlePlaceClick(place)}
                  >
                    {place.photo_url ? (
                      <div className="h-48 bg-cover bg-center relative" style={{ backgroundImage: `url(${place.photo_url})` }}>
                        <div className="h-full bg-black bg-opacity-20 flex items-end">
                          <div className="p-4 text-white">
                            <div className="flex items-center space-x-2">
                              <Star className="h-4 w-4 text-yellow-400 fill-current" />
                              <span className="text-sm font-medium">
                                {place.rating ? place.rating.toFixed(1) : 'N/A'}
                              </span>
                            </div>
                          </div>
                        </div>
                        {isSelectionMode && (
                          <div className="absolute top-2 right-2">
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                              isSelected 
                                ? 'bg-blue-500 border-blue-500' 
                                : 'bg-white bg-opacity-80 border-gray-300'
                            }`}>
                              {isSelected && <Check className="h-4 w-4 text-white" />}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="h-48 relative overflow-hidden">
                        {/* Gradient background */}
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-100 via-purple-50 to-pink-100"></div>
                        
                        {/* Content overlay */}
                        <div className="relative h-full flex flex-col items-center justify-center p-4 text-center">
                          {/* Category emoji */}
                          <div className="text-5xl mb-3 drop-shadow-sm">
                            {place.category === 'restaurant' ? '🍽️' : 
                             place.category === 'activity' ? '🎯' : 
                             place.category === 'event' ? '🎪' : 
                             place.category === 'drink' ? '🍺' : 
                             place.category === 'outdoor' ? '🌳' : '🏛️'}
                          </div>
                          
                          {/* Venue name */}
                          <h3 className="font-bold text-gray-800 text-sm mb-2 line-clamp-2 leading-tight">
                            {place.name}
                          </h3>
                          
                          {/* Category badge and rating */}
                          <div className="flex items-center space-x-2 text-xs">
                            <Badge variant="outline" className="text-xs capitalize bg-white/80 border-gray-300">
                              {place.category}
                            </Badge>
                            {place.rating && (
                              <div className="flex items-center bg-white/80 px-2 py-1 rounded-full">
                                <Star className="w-3 h-3 text-yellow-400 fill-current mr-1" />
                                <span className="text-gray-700 font-medium">{place.rating.toFixed(1)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Selection indicator */}
                        {isSelectionMode && (
                          <div className="absolute top-2 right-2">
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                              isSelected 
                                ? 'bg-blue-500 border-blue-500' 
                                : 'bg-white bg-opacity-90 border-gray-300'
                            }`}>
                              {isSelected && <Check className="h-4 w-4 text-white" />}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-lg line-clamp-2">{place.name}</CardTitle>
                          <CardDescription className="flex items-center mt-1">
                            <MapPin className="h-4 w-4 mr-1" />
                            {place.address}
                          </CardDescription>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemoveFavorite(place.id)
                          }}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0 ml-2"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {/* User Rating */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-600">Your Rating:</span>
                          <StarRating rating={place.user_rating || 0} readonly size="sm" />
                        </div>
                        {place.user_notes && (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            "{place.user_notes}"
                          </p>
                        )}
                      </div>

                      {place.types && Array.isArray(place.types) && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {place.types.slice(0, 3).map((type: string) => (
                            <Badge key={type} variant="secondary" className="text-xs">
                              {type.replace(/_/g, ' ')}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                          Saved {place.created_at ? new Date(place.created_at).toLocaleDateString() : 'Recently'}
                        </div>
                        <div className="text-sm text-blue-600 hover:text-blue-800">
                          Click to view details
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Floating Action Bar for Selection */}
      {isSelectionMode && selectedPlaces.length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-white rounded-full shadow-lg border px-6 py-3 flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-700">
              {selectedPlaces.length} place{selectedPlaces.length > 1 ? 's' : ''} selected
            </span>
            <Button
              onClick={handleCreateDateSet}
              className="bg-gradient-to-r from-rose-500 to-purple-500 hover:opacity-90 rounded-full"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Create Date Set
            </Button>
            <Button
              variant="outline"
              onClick={() => setSelectedPlaces([])}
              className="rounded-full"
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Place Details Modal */}
      <PlaceDetailsModal
        place={selectedPlace}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUpdate={handlePlaceUpdate}
      />

      {/* Create Date Set Modal */}
      <CreateDateSetModal
        selectedPlaces={selectedPlaces}
        isOpen={isCreateDateSetModalOpen}
        onClose={() => setIsCreateDateSetModalOpen(false)}
        onSuccess={() => {
          setIsSelectionMode(false)
          setSelectedPlaces([])
          toast({
            title: "Success!",
            description: "Your date set has been created. Check 'My Date Sets' to view it.",
          })
        }}
      />
      
      <Footer />
    </>
  )
} 