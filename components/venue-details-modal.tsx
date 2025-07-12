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

  const fetchVenueDetails = async (basicVenue: VenueDetails) => {
    setLoading(true)
    try {
      // Try to fetch enhanced details from our API
      const response = await fetch(`/api/venue-details/${encodeURIComponent(basicVenue.id)}`)
      
      if (response.ok) {
        const enhancedDetails = await response.json()
        setDetailedVenue(enhancedDetails)
      } else {
        // Fallback to basic venue info with mock enhanced data
        setDetailedVenue({
          ...basicVenue,
          photos: basicVenue.photos || [
            basicVenue.image || 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=600&h=400&fit=crop',
            'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=400&fit=crop',
            'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=600&h=400&fit=crop'
          ],
          hours: {
            'Monday': '9:00 AM - 10:00 PM',
            'Tuesday': '9:00 AM - 10:00 PM', 
            'Wednesday': '9:00 AM - 10:00 PM',
            'Thursday': '9:00 AM - 11:00 PM',
            'Friday': '9:00 AM - 11:00 PM',
            'Saturday': '8:00 AM - 11:00 PM',
            'Sunday': '8:00 AM - 9:00 PM'
          },
          reviews: [
            {
              author: "Sarah M.",
              rating: 5,
              text: "Amazing experience! Great atmosphere and friendly staff.",
              timeAgo: "2 weeks ago"
            },
            {
              author: "Mike R.",
              rating: 4,
              text: "Really enjoyed our visit. Would definitely recommend.",
              timeAgo: "1 month ago"
            }
          ],
          amenities: getAmenitiesForCategory(basicVenue.category),
          phone: basicVenue.phone || `(${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
          website: `https://www.${basicVenue.name.toLowerCase().replace(/\s+/g, '')}.com`
        })
      }
    } catch (error) {
      console.error('Error fetching venue details:', error)
      setDetailedVenue(basicVenue)
    } finally {
      setLoading(false)
    }
  }

  const getAmenitiesForCategory = (category: string): string[] => {
    switch (category) {
      case 'restaurant':
        return ['Wi-Fi', 'Outdoor Seating', 'Accepts Credit Cards', 'Wheelchair Accessible', 'Parking Available']
      case 'activity':
        return ['Family Friendly', 'Group Discounts', 'Gift Shop', 'Guided Tours', 'Photography Allowed']
      case 'outdoor':
        return ['Pet Friendly', 'Picnic Area', 'Restrooms', 'Parking', 'Walking Trails']
      case 'event':
        return ['Advance Booking', 'Age Restrictions', 'Refreshments', 'Seating Available', 'Photography']
      default:
        return ['Wi-Fi', 'Parking', 'Wheelchair Accessible']
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
            {detailedVenue.photos && detailedVenue.photos.length > 0 && (
              <div className="space-y-2">
                <div className="relative h-64 rounded-lg overflow-hidden">
                  <img
                    src={detailedVenue.photos[activePhotoIndex]}
                    alt={detailedVenue.name}
                    className="w-full h-full object-cover"
                  />
                  {detailedVenue.photos.length > 1 && (
                    <div className="absolute bottom-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                      {activePhotoIndex + 1} / {detailedVenue.photos.length}
                    </div>
                  )}
                </div>
                {detailedVenue.photos.length > 1 && (
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
              </div>
            )}

            {/* Basic Info */}
            <div className="flex items-center justify-between">
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
                {detailedVenue.priceLevel && (
                  <div className="flex items-center">
                    {[...Array(detailedVenue.priceLevel)].map((_, i) => (
                      <DollarSign key={i} className="w-4 h-4 text-green-600" />
                    ))}
                  </div>
                )}
                {detailedVenue.openNow !== undefined && (
                  <Badge variant={detailedVenue.openNow ? "default" : "secondary"}>
                    {detailedVenue.openNow ? 'Open Now' : 'Closed'}
                  </Badge>
                )}
              </div>
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
              {/* Contact & Location */}
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
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-3 w-full"
                    onClick={openDirections}
                  >
                    <Navigation className="w-4 h-4 mr-2" />
                    Get Directions
                  </Button>
                </CardContent>
              </Card>

              {/* Hours */}
              {detailedVenue.hours && (
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

            {/* Amenities */}
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

            {/* Reviews */}
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