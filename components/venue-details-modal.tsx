"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { 
  MapPin, 
  Clock, 
  Phone, 
  Globe, 
  Star, 
  DollarSign, 
  Heart,
  ExternalLink,
  Calendar,
  Users,
  Navigation,
  Share2,
  Camera
} from "lucide-react"
import { toast } from '@/hooks/use-toast'

interface VenueDetails {
  id: string
  name: string
  rating?: number
  priceLevel?: number
  image?: string
  photos?: string[]
  description?: string
  category: 'restaurant' | 'activity' | 'outdoor' | 'event'
  address?: string
  phone?: string
  website?: string
  hours?: {
    [key: string]: string
  }
  openNow?: boolean
  reviews?: Array<{
    author: string
    rating: number
    text: string
    timeAgo: string
  }>
  amenities?: string[]
  coordinates?: {
    lat: number
    lng: number
  }
  eventDetails?: {
    date?: string
    time?: string
    ticketPrice?: string
    venue?: string
  }
  photoUrl?: string // Added for new_code
}

interface VenueDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  venue: VenueDetails | null
  onPlanDate: (venue: VenueDetails) => void
  onToggleFavorite: (venueId: string) => void
}

export function VenueDetailsModal({ 
  isOpen, 
  onClose, 
  venue, 
  onPlanDate, 
  onToggleFavorite 
}: VenueDetailsModalProps) {
  const [loading, setLoading] = useState(false)
  const [detailedVenue, setDetailedVenue] = useState<VenueDetails | null>(null)
  const [activePhotoIndex, setActivePhotoIndex] = useState(0)

  useEffect(() => {
    if (venue && isOpen) {
      fetchVenueDetails(venue)
    }
  }, [venue, isOpen])

  // Helper function to generate category-appropriate fallback images
  const generateCategoryImage = (category: string) => {
    const categoryImages = {
      restaurant: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=400&fit=crop',
      activity: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=600&h=400&fit=crop',
      outdoor: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600&h=400&fit=crop',
      event: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=600&h=400&fit=crop'
    }
    return categoryImages[category as keyof typeof categoryImages] || categoryImages.activity
  }

  // Helper function to generate category-appropriate descriptions
  const generateCategoryDescription = (category: string) => {
    const categoryDescriptions = {
      restaurant: "A dining establishment offering food and beverages.",
      activity: "An interesting place to visit and explore.",
      outdoor: "An outdoor location perfect for recreation and relaxation.",
      event: "A special event or gathering."
    }
    return categoryDescriptions[category as keyof typeof categoryDescriptions] || "Limited information available for this venue."
  }

  const fetchVenueDetails = async (basicVenue: VenueDetails) => {
    setLoading(true)
    try {
      // Determine if this venue benefits from enhanced details via API
      const shouldFetchEnhancedDetails = (
        basicVenue.id.startsWith('yelp-') ||
        basicVenue.id.startsWith('eventbrite-') ||
        basicVenue.id.startsWith('ticketmaster-')
      )

      if (shouldFetchEnhancedDetails) {
        // Only make API calls for venues that benefit from enhanced details
        const response = await fetch(`/api/venue-details/${encodeURIComponent(basicVenue.id)}`)
        
        if (response.ok) {
          const enhancedDetails = await response.json()
          setDetailedVenue(enhancedDetails)
          return
        }
      }

      // For Google Places venues or when API calls fail, use the existing good data
      setDetailedVenue({
        ...basicVenue,
        photos: basicVenue.photos || [
          basicVenue.image || generateCategoryImage(basicVenue.category)
        ],
        description: basicVenue.description || generateCategoryDescription(basicVenue.category),
        // Preserve existing real data - this is the key fix!
        address: basicVenue.address || undefined,
        phone: basicVenue.phone || undefined,
        website: basicVenue.website || undefined,
        hours: basicVenue.hours || undefined,
        reviews: basicVenue.reviews || [],
        amenities: basicVenue.amenities || []
      })

    } catch (error) {
      console.error('Error fetching venue details:', error)
      // Fallback to basic venue info, preserving real data
      setDetailedVenue({
        ...basicVenue,
        photos: basicVenue.photos || [
          basicVenue.image || generateCategoryImage(basicVenue.category)
        ],
        description: basicVenue.description || "Limited information available for this venue.",
        address: basicVenue.address || undefined,
        phone: basicVenue.phone || undefined,
        website: basicVenue.website || undefined,
        hours: basicVenue.hours || undefined,
        reviews: basicVenue.reviews || [],
        amenities: basicVenue.amenities || []
      })
    } finally {
      setLoading(false)
    }
  }

  const handleShare = async () => {
    if (navigator.share && detailedVenue) {
      try {
        await navigator.share({
          title: detailedVenue.name,
          text: detailedVenue.description || `Check out ${detailedVenue.name}!`,
          url: window.location.href
        })
      } catch (error) {
        // Fallback to copying URL
        copyToClipboard()
      }
    } else {
      copyToClipboard()
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href)
    toast({
      title: "Link copied!",
      description: "Share this venue with friends.",
    })
  }

  const openDirections = () => {
    if (detailedVenue?.address) {
      const encodedAddress = encodeURIComponent(detailedVenue.address)
      window.open(`https://maps.google.com/?q=${encodedAddress}`, '_blank')
    } else {
      // If no address, try to search by venue name
      const encodedName = encodeURIComponent(detailedVenue?.name || 'venue')
      window.open(`https://maps.google.com/?q=${encodedName}`, '_blank')
    }
  }

  if (!detailedVenue) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="text-2xl font-bold">{detailedVenue.name}</span>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" onClick={handleShare}>
                <Share2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onToggleFavorite(detailedVenue.id)}
              >
                <Heart className="h-4 w-4 fill-red-500 text-red-500" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Photo Gallery */}
            {(detailedVenue.photos && detailedVenue.photos.length > 0) || detailedVenue.image || detailedVenue.photoUrl ? (
              <div className="space-y-2">
                <div className="relative h-64 rounded-lg overflow-hidden">
                  <img
                    src={detailedVenue.photos && detailedVenue.photos.length > 0 
                      ? detailedVenue.photos[activePhotoIndex] 
                      : detailedVenue.image || detailedVenue.photoUrl}
                    alt={detailedVenue.name}
                    className="w-full h-full object-cover"
                  />
                  {/* Add disclaimer for generic event images */}
                  {detailedVenue.category === 'event' && (
                    <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs flex items-center">
                      <Camera className="w-3 h-3 mr-1" />
                      Generic Event Image
                    </div>
                  )}
                  {detailedVenue.photos && detailedVenue.photos.length > 1 && (
                    <div className="absolute bottom-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                      {activePhotoIndex + 1} / {detailedVenue.photos.length}
                    </div>
                  )}
                </div>
                {detailedVenue.photos && detailedVenue.photos.length > 1 && (
                  <div className="flex space-x-2 overflow-x-auto">
                    {detailedVenue.photos.map((photo, index) => (
                      <button
                        key={index}
                        onClick={() => setActivePhotoIndex(index)}
                        className={`flex-shrink-0 w-16 h-16 rounded overflow-hidden border-2 ${
                          index === activePhotoIndex ? 'border-blue-500' : 'border-gray-200'
                        }`}
                      >
                        <img src={photo} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
                
                {/* Additional disclaimer text for events */}
                {detailedVenue.category === 'event' && (
                  <p className="text-xs text-gray-500 italic">
                    📸 Image shown is for illustration purposes only and may not represent the actual event or venue.
                  </p>
                )}
              </div>
            ) : (
              <div className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center">
                <Camera className="h-12 w-12 text-gray-400" />
              </div>
            )}

            {/* Basic Info */}
            <div className="space-y-3">
              <div className="flex items-center space-x-4">
                <Badge variant="outline" className="capitalize">
                  {detailedVenue.category}
                </Badge>
                {detailedVenue.rating && (
                  <div className="flex items-center space-x-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span className="font-medium">{detailedVenue.rating}</span>
                  </div>
                )}
                {detailedVenue.openNow !== undefined && detailedVenue.openNow !== null && (
                  <Badge variant={detailedVenue.openNow ? "default" : "secondary"}>
                    {detailedVenue.openNow ? 'Open Now' : 'Closed'}
                  </Badge>
                )}
              </div>
              
              {/* Show information availability notice */}
              {(!detailedVenue.address && !detailedVenue.phone && !detailedVenue.website && !detailedVenue.hours) && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    <span className="font-medium">Limited Information:</span> Detailed venue information is not available. 
                    We recommend searching online or contacting the venue directly for accurate details.
                  </p>
                </div>
              )}
            </div>

            {/* Description */}
            {detailedVenue.description && (
              <p className="text-gray-600 leading-relaxed">{detailedVenue.description}</p>
            )}

            {/* Event Details */}
            {detailedVenue.category === 'event' && detailedVenue.eventDetails && (
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-2 flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    Event Details
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {detailedVenue.eventDetails.date && (
                      <div>
                        <span className="font-medium">Date:</span> {detailedVenue.eventDetails.date}
                      </div>
                    )}
                    {detailedVenue.eventDetails.time && (
                      <div>
                        <span className="font-medium">Time:</span> {detailedVenue.eventDetails.time}
                      </div>
                    )}
                    {detailedVenue.eventDetails.ticketPrice && (
                      <div>
                        <span className="font-medium">Price:</span> {detailedVenue.eventDetails.ticketPrice}
                      </div>
                    )}
                    {detailedVenue.eventDetails.venue && (
                      <div>
                        <span className="font-medium">Venue:</span> {detailedVenue.eventDetails.venue}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Contact & Location - Only show if we have actual data */}
              {(detailedVenue.address || detailedVenue.phone || detailedVenue.website) && (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-3">Contact & Location</h3>
                    <div className="space-y-2 text-sm">
                      {detailedVenue.address && (
                        <div className="flex items-start space-x-2">
                          <MapPin className="w-4 h-4 mt-0.5 text-gray-500" />
                          <span>{detailedVenue.address}</span>
                        </div>
                      )}
                      {detailedVenue.phone && (
                        <div className="flex items-center space-x-2">
                          <Phone className="w-4 h-4 text-gray-500" />
                          <a href={`tel:${detailedVenue.phone}`} className="text-blue-600 hover:underline">
                            {detailedVenue.phone}
                          </a>
                        </div>
                      )}
                      {detailedVenue.website && (
                        <div className="flex items-center space-x-2">
                          <Globe className="w-4 h-4 text-gray-500" />
                          <a 
                            href={detailedVenue.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline flex items-center"
                          >
                            Visit Website <ExternalLink className="w-3 h-3 ml-1" />
                          </a>
                        </div>
                      )}
                    </div>
                    
                    {detailedVenue.address && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-3 w-full"
                        onClick={openDirections}
                      >
                        <Navigation className="w-4 h-4 mr-2" />
                        Get Directions
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Hours - Only show if we have actual data */}
              {detailedVenue.hours && Object.keys(detailedVenue.hours).length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-3 flex items-center">
                      <Clock className="w-4 h-4 mr-2" />
                      Hours
                    </h3>
                    <div className="space-y-1 text-sm">
                      {Object.entries(detailedVenue.hours).map(([day, hours]) => (
                        <div key={day} className="flex justify-between">
                          <span className="font-medium">{day}</span>
                          <span>{hours}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Amenities - Only show if we have actual data */}
            {detailedVenue.amenities && detailedVenue.amenities.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-3">Amenities</h3>
                  <div className="flex flex-wrap gap-2">
                    {detailedVenue.amenities.map((amenity, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {amenity}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Reviews - Only show if we have actual data */}
            {detailedVenue.reviews && detailedVenue.reviews.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-3 flex items-center">
                    <Users className="w-4 h-4 mr-2" />
                    Recent Reviews
                  </h3>
                  <div className="space-y-4">
                    {detailedVenue.reviews.map((review, index) => (
                      <div key={index} className="border-b border-gray-100 last:border-0 pb-3 last:pb-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm">{review.author}</span>
                          <div className="flex items-center space-x-1">
                            <div className="flex">
                              {[...Array(5)].map((_, i) => (
                                <Star 
                                  key={i} 
                                  className={`w-3 h-3 ${i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                                />
                              ))}
                            </div>
                            <span className="text-xs text-gray-500">{review.timeAgo}</span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600">{review.text}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4 border-t">
              <Button 
                className="flex-1"
                onClick={() => onPlanDate(detailedVenue)}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Plan a Date Here
              </Button>
              <Button 
                variant="outline"
                onClick={() => onToggleFavorite(detailedVenue.id)}
              >
                <Heart className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
} 