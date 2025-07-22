"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Plus,
  Heart,
  Clock,
  MapPin,
  Star,
  Trash2,
  Save,
  Calendar,
  Search,
  ArrowUp,
  ArrowDown,
  Edit3,
  X,
  Check,
  Users,
  DollarSign,
  Compass,
  Bookmark
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "@/hooks/use-toast"
import { 
  getPlanningStack, 
  removeFromPlanningStack, 
  updatePlanningStackItem, 
  clearPlanningStack,
  addToPlanningStack,
  type PlanningStackItem 
} from "@/app/actions/planning-stack"
import { getFavorites } from "@/app/actions/favorites"
import type { PlaceResult } from "@/lib/search-utils"
import { VenueDetailsModal } from "@/components/venue-details-modal"
import { SaveDateSetModal } from "@/components/save-date-set-modal"

export default function MakeDatePage() {
  const router = useRouter()
  const { user } = useAuth()
  const [planningStack, setPlanningStack] = useState<PlanningStackItem[]>([])
  const [favorites, setFavorites] = useState<PlaceResult[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [showFavorites, setShowFavorites] = useState(false)
  const [selectedVenue, setSelectedVenue] = useState<PlaceResult | null>(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [showAddOptions, setShowAddOptions] = useState(false)
  const [venueSearchQuery, setVenueSearchQuery] = useState("")
  const [venueSearchResults, setVenueSearchResults] = useState<PlaceResult[]>([])
  const [searchingVenues, setSearchingVenues] = useState(false)
  const [manualEntry, setManualEntry] = useState("")
  const [showManualEntry, setShowManualEntry] = useState(false)

  // Filter favorites based on search query
  const filteredFavorites = favorites.filter(favorite =>
    favorite.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    favorite.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
    favorite.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Check if Google API is configured on component mount
  useEffect(() => {
    const checkGoogleAPI = async () => {
      try {
        const response = await fetch('/api/google-api-status')
        const data = await response.json()
        console.log("🔧 Google API status:", data.status)
        if (data.status !== "configured") {
          console.warn("⚠️ Google API key not configured - search will fall back to custom venues")
        }
      } catch (error) {
        console.error("🔧 Error checking Google API status:", error)
      }
    }
    checkGoogleAPI()
  }, [])

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  const loadData = async () => {
    try {
      setLoading(true)
      const [stackData, favoritesData] = await Promise.all([
        getPlanningStack(),
        getFavorites()
      ])
      setPlanningStack(stackData)
      setFavorites(favoritesData)
    } catch (error) {
      console.error("Error loading data:", error)
      toast({
        title: "Error",
        description: "Failed to load your planning data.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveFromStack = async (itemId: string) => {
    try {
      await removeFromPlanningStack(itemId)
      setPlanningStack(prev => prev.filter(item => item.id !== itemId))
      toast({
        title: "Removed from stack",
        description: "Venue removed from your planning stack.",
      })
    } catch (error) {
      console.error("Error removing from stack:", error)
      toast({
        title: "Error",
        description: "Failed to remove venue from stack.",
        variant: "destructive",
      })
    }
  }

  const handleUpdateItem = async (itemId: string, updates: Partial<PlanningStackItem>) => {
    try {
      await updatePlanningStackItem(itemId, updates)
      setPlanningStack(prev => prev.map(item => 
        item.id === itemId ? { ...item, ...updates } : item
      ))
      setEditingItem(null)
      toast({
        title: "Updated",
        description: "Venue details updated successfully.",
      })
    } catch (error) {
      console.error("Error updating item:", error)
      toast({
        title: "Error",
        description: "Failed to update venue details.",
        variant: "destructive",
      })
    }
  }

  const handleMoveItem = async (itemId: string, direction: 'up' | 'down') => {
    try {
      const currentIndex = planningStack.findIndex(item => item.id === itemId)
      if (currentIndex === -1) return

      const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
      if (newIndex < 0 || newIndex >= planningStack.length) return

      const newStack = [...planningStack]
      const [movedItem] = newStack.splice(currentIndex, 1)
      newStack.splice(newIndex, 0, movedItem)

      // Update positions
      const updatedStack = newStack.map((item, index) => ({
        ...item,
        position: index
      }))

      // Update all items in the database
      await Promise.all(updatedStack.map(item => 
        updatePlanningStackItem(item.id, { position: item.position })
      ))

      setPlanningStack(updatedStack)
    } catch (error) {
      console.error("Error moving item:", error)
      toast({
        title: "Error",
        description: "Failed to reorder venues.",
        variant: "destructive",
      })
    }
  }

  const handleToggleFavorite = async (venue: PlaceResult) => {
    try {
      // For now, just refresh favorites since we don't have the exact function signature
      const updatedFavorites = await getFavorites()
      setFavorites(updatedFavorites)
      toast({
        title: "Favorites updated",
        description: "Your favorites have been updated.",
      })
    } catch (error) {
      console.error("Error updating favorites:", error)
      toast({
        title: "Error",
        description: "Failed to update favorites.",
        variant: "destructive",
      })
    }
  }

  const handleAddToStack = async (venue: PlaceResult) => {
    try {
      const result = await addToPlanningStack(venue)
      if (result.success) {
        // Refresh planning stack
        const updatedStack = await getPlanningStack()
        setPlanningStack(updatedStack)
        toast({
          title: "Added to planning stack",
          description: `${venue.name} has been added to your planning stack.`,
        })
      } else {
        toast({
          title: "Already in stack",
          description: result.error || "This venue is already in your planning stack.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error adding to planning stack:", error)
      toast({
        title: "Error",
        description: "Failed to add venue to planning stack.",
        variant: "destructive",
      })
    }
  }

  const handleClearStack = async () => {
    try {
      await clearPlanningStack()
      setPlanningStack([])
      toast({
        title: "Stack cleared",
        description: "All venues have been removed from your planning stack.",
      })
    } catch (error) {
      console.error("Error clearing stack:", error)
      toast({
        title: "Error",
        description: "Failed to clear planning stack.",
        variant: "destructive",
      })
    }
  }

  const openVenueDetails = (venue: PlaceResult) => {
    setSelectedVenue(venue)
    setIsDetailsModalOpen(true)
  }

  const closeVenueDetails = () => {
    setSelectedVenue(null)
    setIsDetailsModalOpen(false)
  }

  const handleSaveDateSet = async (dateSet: {
    title: string
    date: string
    startTime: string
    endTime: string
    notes: string
  }) => {
    try {
      // Convert planning stack items to the format expected by the API
      const placesData = planningStack.map(item => ({
        id: item.venue_id || item.id,
        name: item.venue_name,
        address: item.venue_address || '',
        rating: item.venue_rating,
        price: item.venue_price_level || 2,
        photo_url: item.venue_photo_url,
        types: [item.venue_category],
        google_place_id: item.venue_id
      }))

      // Generate a unique share ID
      const shareId = `share-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      const response = await fetch('/api/date-sets/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          title: dateSet.title,
          date: dateSet.date || new Date().toISOString().split('T')[0], // Use today if no date provided
          start_time: dateSet.startTime || '12:00', // Use noon if no time provided
          end_time: dateSet.endTime || '23:59', // Use end of day if no time provided
          places: placesData,
          notes: dateSet.notes || null,
          share_id: shareId
        })
      })

      if (response.ok) {
        const result = await response.json()
        toast({
          title: "Date set saved!",
          description: `"${dateSet.title}" has been saved with ${planningStack.length} places.`,
        })
        setShowSaveModal(false)
        
        // Clear the planning stack after successful save
        await handleClearStack()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save date set')
      }
    } catch (error) {
      console.error("Error saving date set:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to save date set."
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const searchVenues = async (query: string) => {
    if (!query.trim()) {
      setVenueSearchResults([])
      return
    }

    setSearchingVenues(true)
    console.log("🔍 Starting search for:", query)
    
    try {
      // Use Google Places API for specific venue searches
      const searchUrl = `/api/places?query=${encodeURIComponent(query)}&location=${encodeURIComponent('Saint Paul, MN')}`
      console.log("🔍 Making request to:", searchUrl)
      
      const response = await fetch(searchUrl)
      console.log("🔍 Response status:", response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log("🔍 API response:", data)
        
        if (data.status === "OK" && data.results) {
          // Convert Google Places results to PlaceResult format
          const convertedResults = data.results.map((place: any) => ({
            id: place.place_id,
            name: place.name,
            category: getCategoryFromTypes(place.types),
            address: place.formatted_address || '',
            rating: place.rating,
            price: place.price_level || 2,
            photoUrl: place.photos?.[0]?.name ? 
              `/api/place-photo?photoName=${place.photos[0].name}` : undefined,
            openNow: place.opening_hours?.open_now,
            placeId: place.place_id,
            phone: place.formatted_phone_number,
            website: place.website,
            description: place.types?.join(', ') || ''
          }))
          console.log("🔍 Converted results:", convertedResults)
          setVenueSearchResults(convertedResults)
        } else if (data.status === "ZERO_RESULTS") {
          console.log("🔍 No results found")
          setVenueSearchResults([])
        } else {
          console.error("🔍 Google Places API error:", data.error_message || data.status)
          // Fallback: create a custom venue suggestion
          const customSuggestion: PlaceResult = {
            id: `custom-${Date.now()}`,
            name: query.trim(),
            category: 'activity' as const,
            address: '',
            rating: undefined,
            price: 0,
            photoUrl: undefined,
            openNow: undefined,
            placeId: `custom-${Date.now()}`,
            phone: undefined,
            website: undefined,
            description: `Custom venue: ${query.trim()}`
          }
          setVenueSearchResults([customSuggestion])
        }
      } else {
        const errorText = await response.text()
        console.error("🔍 HTTP error:", response.status, errorText)
        // Fallback: create a custom venue suggestion
        const customSuggestion: PlaceResult = {
          id: `custom-${Date.now()}`,
          name: query.trim(),
          category: 'activity' as const,
          address: '',
          rating: undefined,
          price: 0,
          photoUrl: undefined,
          openNow: undefined,
          placeId: `custom-${Date.now()}`,
          phone: undefined,
          website: undefined,
          description: `Custom venue: ${query.trim()}`
        }
        setVenueSearchResults([customSuggestion])
      }
    } catch (error) {
      console.error("🔍 Error searching venues:", error)
      // Fallback: create a custom venue suggestion
      const customSuggestion: PlaceResult = {
        id: `custom-${Date.now()}`,
        name: query.trim(),
        category: 'activity' as const,
        address: '',
        rating: undefined,
        price: 0,
        photoUrl: undefined,
        openNow: undefined,
        placeId: `custom-${Date.now()}`,
        phone: undefined,
        website: undefined,
        description: `Custom venue: ${query.trim()}`
      }
      setVenueSearchResults([customSuggestion])
    } finally {
      setSearchingVenues(false)
    }
  }

  // Helper function to convert Google Places types to our categories
  const getCategoryFromTypes = (types: string[]): 'restaurant' | 'activity' | 'outdoor' | 'event' => {
    if (!types || types.length === 0) return 'activity'
    
    const typeString = types.join(' ').toLowerCase()
    
    if (typeString.includes('restaurant') || typeString.includes('food') || typeString.includes('meal')) {
      return 'restaurant'
    }
    if (typeString.includes('park') || typeString.includes('natural_feature') || typeString.includes('campground')) {
      return 'outdoor'
    }
    if (typeString.includes('movie_theater') || typeString.includes('amusement_park') || typeString.includes('museum') || typeString.includes('art_gallery')) {
      return 'activity'
    }
    if (typeString.includes('event') || typeString.includes('stadium') || typeString.includes('concert_hall')) {
      return 'event'
    }
    
    return 'activity'
  }

  const handleAddManualEntry = async () => {
    if (!manualEntry.trim()) {
      toast({
        title: "Empty entry",
        description: "Please enter a name for your activity.",
        variant: "destructive",
      })
      return
    }

    try {
      // Create a custom PlaceResult for the manual entry
      const customVenue: PlaceResult = {
        id: `manual-${Date.now()}`,
        name: manualEntry.trim(),
        category: 'activity' as const,
        address: '',
        rating: undefined,
        price: 0,
        photoUrl: undefined,
        openNow: undefined,
        placeId: `manual-${Date.now()}`,
        phone: undefined,
        website: undefined,
        description: `Custom activity: ${manualEntry.trim()}`
      }

      const result = await addToPlanningStack(customVenue)
      if (result.success) {
        // Refresh planning stack
        const updatedStack = await getPlanningStack()
        setPlanningStack(updatedStack)
        setManualEntry("")
        setShowManualEntry(false)
        toast({
          title: "Added to planning stack",
          description: `${manualEntry.trim()} has been added to your planning stack.`,
        })
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to add custom activity.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error adding manual entry:", error)
      toast({
        title: "Error",
        description: "Failed to add custom activity.",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
          <div className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading your planning stack...</p>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Plan Your Date</h1>
            <p className="text-lg text-gray-600">Organize your venues and create the perfect date experience.</p>
          </div>

          {/* Planning Stack Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Calendar className="h-6 w-6 text-blue-600" />
              <h2 className="text-2xl font-semibold text-gray-900">
                Planning Stack ({planningStack.length} items)
              </h2>
            </div>
            {planningStack.length > 0 && (
              <Button
                variant="outline"
                onClick={handleClearStack}
                className="flex items-center space-x-2"
              >
                <Trash2 className="h-4 w-4" />
                <span>Clear All</span>
              </Button>
            )}
          </div>

          {/* Planning Stack */}
          {planningStack.length === 0 ? (
            <Card className="p-8 text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Your planning stack is empty</h3>
              <p className="text-gray-600 mb-4">
                Add venues from the explore page or your favorites to start planning your date.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={() => router.push('/explore')}>
                  <Compass className="h-4 w-4 mr-2" />
                  Explore Venues
                </Button>
                <Button variant="outline" onClick={() => setShowFavorites(true)}>
                  <Heart className="h-4 w-4 mr-2" />
                  Add from Favorites
                </Button>
              </div>
            </Card>
          ) : (
            <div className="space-y-4 mb-8">
              {planningStack.map((item, index) => (
                <PlanningStackItem
                  key={item.id}
                  item={item}
                  index={index}
                  totalItems={planningStack.length}
                  onRemove={handleRemoveFromStack}
                  onUpdate={handleUpdateItem}
                  onMove={handleMoveItem}
                  editingItem={editingItem}
                  setEditingItem={setEditingItem}
                  onViewDetails={openVenueDetails}
                />
              ))}
            </div>
          )}

          {/* Add Item Section */}
          <div className="mb-8">
            <div className="text-center mb-6">
              <div className="flex items-center justify-center space-x-3 mb-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Plus className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Add More Items</h3>
                  <p className="text-sm text-gray-600">Discover venues and activities for your date</p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowAddOptions(!showAddOptions)}
                className="flex items-center space-x-2 mx-auto"
                size="lg"
              >
                {showAddOptions ? (
                  <>
                    <X className="h-4 w-4" />
                    <span>Hide Options</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    <span>Show Options</span>
                  </>
                )}
              </Button>
            </div>

            {showAddOptions && (
              <div className="space-y-6">
                {/* Quick Actions Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-2 border-transparent hover:border-blue-200">
                    <CardContent className="p-6 text-center">
                      <div className="p-3 bg-blue-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                        <Compass className="h-8 w-8 text-blue-600" />
                      </div>
                      <h4 className="font-semibold text-lg mb-2 text-gray-900">Explore New Venues</h4>
                      <p className="text-sm text-gray-600 mb-4">
                        Discover amazing places in your area
                      </p>
                      <Button onClick={() => router.push('/explore')} className="w-full bg-blue-600 hover:bg-blue-700">
                        <Compass className="h-4 w-4 mr-2" />
                        Start Exploring
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-2 border-transparent hover:border-red-200">
                    <CardContent className="p-6 text-center">
                      <div className="p-3 bg-red-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center group-hover:bg-red-200 transition-colors">
                        <Heart className="h-8 w-8 text-red-600" />
                      </div>
                      <h4 className="font-semibold text-lg mb-2 text-gray-900">Add from Favorites</h4>
                      <p className="text-sm text-gray-600 mb-4">
                        Use your saved favorite places
                      </p>
                      <Button 
                        variant="outline" 
                        onClick={() => setShowFavorites(!showFavorites)}
                        className="w-full border-red-200 text-red-600 hover:bg-red-50"
                      >
                        <Heart className="h-4 w-4 mr-2" />
                        {showFavorites ? 'Hide Favorites' : 'Browse Favorites'}
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-2 border-transparent hover:border-green-200">
                    <CardContent className="p-6 text-center">
                      <div className="p-3 bg-green-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center group-hover:bg-green-200 transition-colors">
                        <Edit3 className="h-8 w-8 text-green-600" />
                      </div>
                      <h4 className="font-semibold text-lg mb-2 text-gray-900">Custom Activities</h4>
                      <p className="text-sm text-gray-600 mb-4">
                        Add your own personal touches
                      </p>
                      <Button 
                        variant="outline" 
                        onClick={() => setShowManualEntry(!showManualEntry)}
                        className="w-full border-green-200 text-green-600 hover:bg-green-50"
                      >
                        <Edit3 className="h-4 w-4 mr-2" />
                        {showManualEntry ? 'Hide Custom' : 'Add Custom'}
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                {/* Favorites List - Now appears here when toggled */}
                {showFavorites && (
                  <Card className="border-2 border-red-100">
                    <CardHeader className="pb-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-red-100 rounded-lg">
                          <Heart className="h-5 w-5 text-red-600" />
                        </div>
                        <div>
                          <CardTitle className="text-lg text-gray-900">Your Favorites</CardTitle>
                          <p className="text-sm text-gray-600">Add your saved places to the planning stack</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                          <Input
                            placeholder="Search favorites..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 h-12 text-base"
                          />
                        </div>

                        {filteredFavorites.length === 0 ? (
                          <div className="text-center py-8">
                            <Heart className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-600 mb-2">No favorites found</p>
                            <p className="text-sm text-gray-500">Try adjusting your search or add some favorites from the explore page</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                            {filteredFavorites.map((favorite) => (
                              <FavoriteCard
                                key={favorite.id}
                                favorite={favorite}
                                onToggleFavorite={handleToggleFavorite}
                                onAddToStack={handleAddToStack}
                                isInStack={planningStack.some(item => item.venue_id === favorite.id)}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Search for Specific Venue */}
                <Card className="border-2 border-gray-100 hover:border-gray-200 transition-colors">
                  <CardHeader className="pb-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Search className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg text-gray-900">Search for a Specific Venue</CardTitle>
                        <p className="text-sm text-gray-600">Find specific restaurants, theaters, or venues using Google Places</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          placeholder="Search for a venue (e.g., 'AMC Theater', 'Olive Garden', 'Mall of America')"
                          value={venueSearchQuery}
                          onChange={(e) => {
                            setVenueSearchQuery(e.target.value)
                            if (e.target.value.trim()) {
                              searchVenues(e.target.value)
                            } else {
                              setVenueSearchResults([])
                            }
                          }}
                          className="pl-10 h-12 text-base"
                        />
                      </div>
                      
                      {searchingVenues && (
                        <div className="text-center py-6">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                          <p className="text-sm text-gray-600 mt-3">Searching Google Places...</p>
                        </div>
                      )}

                      {venueSearchResults.length > 0 && (
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                          <h4 className="font-medium text-gray-900">Search Results</h4>
                          {venueSearchResults.map((venue) => (
                            <Card key={venue.id} className="cursor-pointer hover:shadow-md transition-shadow border border-gray-100">
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-sm text-gray-900">{venue.name}</h4>
                                    <div className="flex items-center space-x-2 text-xs text-gray-600 mt-1">
                                      <Badge variant="outline" className="text-xs">{venue.category}</Badge>
                                      {venue.rating && (
                                        <div className="flex items-center">
                                          <Star className="w-3 h-3 text-yellow-400 fill-current mr-1" />
                                          {venue.rating}
                                        </div>
                                      )}
                                    </div>
                                    {venue.address && (
                                      <div className="flex items-center text-xs text-gray-500 mt-1">
                                        <MapPin className="w-3 h-3 mr-1" />
                                        {venue.address}
                                      </div>
                                    )}
                                    {venue.id.startsWith('custom-') && (
                                      <div className="text-xs text-green-600 mt-1">
                                        💡 Custom venue - you can add this to your planning stack
                                      </div>
                                    )}
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleAddToStack(venue)}
                                    className="ml-3"
                                  >
                                    <Plus className="w-4 h-4 mr-1" />
                                    Add
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}

                      {/* Manual Entry Section - Now controlled by the card button */}
                      {showManualEntry && (
                        <div className="border-t pt-4">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-2">
                              <Edit3 className="h-4 w-4 text-green-600" />
                              <h4 className="font-semibold text-sm text-gray-900">Add Custom Activity</h4>
                            </div>
                          </div>
                          
                          <div className="space-y-3 p-4 bg-green-50 rounded-lg border border-green-200">
                            <div className="flex space-x-2">
                              <Input
                                placeholder="e.g., Board games after dinner, Movie night, etc."
                                value={manualEntry}
                                onChange={(e) => setManualEntry(e.target.value)}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    handleAddManualEntry()
                                  }
                                }}
                                className="flex-1"
                              />
                              <Button 
                                onClick={handleAddManualEntry}
                                disabled={!manualEntry.trim()}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
                            </div>
                            <p className="text-xs text-green-700">
                              💡 Add any custom activity or event that's not in our database
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* Save Date Set Button */}
          {planningStack.length > 0 && (
            <div className="text-center mb-8">
              <Button
                size="lg"
                onClick={() => setShowSaveModal(true)}
                className="bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600"
              >
                <Save className="h-5 w-5 mr-2" />
                Save as Date Set
              </Button>
            </div>
          )}

          {/* Add from Favorites Section */}
          {/* This section is now handled by the button click */}

        </div>
      </main>

      {/* Venue Details Modal */}
      <VenueDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={closeVenueDetails}
        venue={selectedVenue}
        onPlanDate={() => {}} // Not needed on this page
        onToggleFavorite={(venueId: string) => {
          // Find the venue by ID and call the handler
          const venue = favorites.find(f => f.id === venueId) || selectedVenue
          if (venue) {
            handleToggleFavorite(venue)
          }
        }}
      />

      {/* Save Date Set Modal */}
      <SaveDateSetModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={handleSaveDateSet}
        planningStack={planningStack}
      />

      <Footer />
    </>
  )
}

function PlanningStackItem({
  item,
  index,
  totalItems,
  onRemove,
  onUpdate,
  onMove,
  editingItem,
  setEditingItem,
  onViewDetails
}: {
  item: PlanningStackItem
  index: number
  totalItems: number
  onRemove: (id: string) => void
  onUpdate: (id: string, updates: Partial<PlanningStackItem>) => void
  onMove: (id: string, direction: 'up' | 'down') => void
  editingItem: string | null
  setEditingItem: (id: string | null) => void
  onViewDetails: (venue: PlaceResult) => void
}) {
  const [editData, setEditData] = useState({
    scheduled_time: item.scheduled_time || '',
    duration_minutes: item.duration_minutes || 60,
    notes: item.notes || ''
  })

  const isEditing = editingItem === item.id

  const handleSave = () => {
    onUpdate(item.id, editData)
  }

  const handleCancel = () => {
    setEditData({
      scheduled_time: item.scheduled_time || '',
      duration_minutes: item.duration_minutes || 60,
      notes: item.notes || ''
    })
    setEditingItem(null)
  }

  const handleCardClick = () => {
    // Convert PlanningStackItem to PlaceResult format
    const venue: PlaceResult = {
      id: item.venue_id,
      name: item.venue_name,
      category: item.venue_category,
      address: item.venue_address || '',
      rating: item.venue_rating,
      price: item.venue_price_level || 0,
      photoUrl: item.venue_photo_url,
      openNow: undefined,
      placeId: item.venue_id,
      phone: undefined,
      website: undefined,
      description: undefined
    }
    onViewDetails(venue)
  }

  return (
    <Card className="border-l-4 border-l-blue-500 cursor-pointer hover:shadow-md transition-shadow" onClick={handleCardClick}>
      <CardContent className="p-4">
        <div className="flex items-start space-x-4">
          {/* Position and Move Controls */}
          <div className="flex flex-col items-center space-y-1">
            <Badge variant="secondary" className="w-8 h-8 flex items-center justify-center">
              {index + 1}
            </Badge>
            <div className="flex flex-col space-y-1">
              {index > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    onMove(item.id, 'up')
                  }}
                  className="h-6 w-6 p-0"
                >
                  <ArrowUp className="w-3 h-3" />
                </Button>
              )}
              {index < totalItems - 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    onMove(item.id, 'down')
                  }}
                  className="h-6 w-6 p-0"
                >
                  <ArrowDown className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>

          {/* Venue Info */}
          <div className="flex-1">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-semibold text-lg">{item.venue_name}</h3>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Badge variant="outline">{item.venue_category}</Badge>
                  {item.venue_rating && (
                    <div className="flex items-center">
                      <Star className="w-3 h-3 text-yellow-400 fill-current mr-1" />
                      {item.venue_rating}
                    </div>
                  )}
                  {item.venue_price_level && (
                    <div className="flex items-center">
                      {[...Array(item.venue_price_level)].map((_, i) => (
                        <DollarSign key={i} className="w-3 h-3 text-green-600" />
                      ))}
                    </div>
                  )}
                </div>
                {item.venue_address && (
                  <div className="flex items-center text-sm text-gray-500 mt-1">
                    <MapPin className="w-3 h-3 mr-1" />
                    {item.venue_address}
                  </div>
                )}
              </div>
              <div className="flex space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditingItem(isEditing ? null : item.id)
                  }}
                >
                  <Edit3 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    onRemove(item.id)
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Edit Form */}
            {isEditing && (
              <div className="mt-4 space-y-3" onClick={(e) => e.stopPropagation()}>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="scheduled_time">Scheduled Time</Label>
                    <Input
                      id="scheduled_time"
                      type="time"
                      value={editData.scheduled_time}
                      onChange={(e) => setEditData(prev => ({ ...prev, scheduled_time: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="duration_minutes">Duration (minutes)</Label>
                    <Input
                      id="duration_minutes"
                      type="number"
                      min="15"
                      max="480"
                      value={editData.duration_minutes}
                      onChange={(e) => setEditData(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) || 60 }))}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={editData.notes}
                    onChange={(e) => setEditData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Add any notes about this venue..."
                  />
                </div>
                <div className="flex space-x-2">
                  <Button size="sm" onClick={handleSave}>
                    <Check className="w-4 h-4 mr-1" />
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCancel}>
                    <X className="w-4 h-4 mr-1" />
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Display Current Settings */}
            {!isEditing && (item.scheduled_time || item.notes) && (
              <div className="mt-2 space-y-1">
                {item.scheduled_time && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="w-3 h-3 mr-1" />
                    {item.scheduled_time} ({item.duration_minutes} min)
                  </div>
                )}
                {item.notes && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Notes:</span> {item.notes}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function FavoriteCard({
  favorite,
  onToggleFavorite,
  onAddToStack,
  isInStack
}: {
  favorite: PlaceResult
  onToggleFavorite: (venue: PlaceResult) => void
  onAddToStack: (venue: PlaceResult) => void
  isInStack: boolean
}) {
  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h4 className="font-semibold text-sm">{favorite.name}</h4>
            <div className="flex items-center space-x-2 text-xs text-gray-600 mt-1">
              <Badge variant="outline" className="text-xs">{favorite.category}</Badge>
              {favorite.rating && (
                <div className="flex items-center">
                  <Star className="w-3 h-3 text-yellow-400 fill-current mr-1" />
                  {favorite.rating}
                </div>
              )}
            </div>
            {favorite.address && (
              <div className="flex items-center text-xs text-gray-500 mt-1">
                <MapPin className="w-3 h-3 mr-1" />
                {favorite.address}
              </div>
            )}
          </div>
          <div className="flex space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onToggleFavorite(favorite)
              }}
            >
              <Heart className={`w-4 h-4 ${isInStack ? 'fill-red-500 text-red-500' : ''}`} />
            </Button>
            <Button
              variant={isInStack ? "default" : "outline"}
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onAddToStack(favorite)
              }}
              disabled={isInStack}
            >
              <Bookmark className="w-4 h-4 mr-1" />
              {isInStack ? 'In Stack' : 'Add to Stack'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

