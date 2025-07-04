import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { StarRating } from '@/components/ui/star-rating'
import { MapPin, ExternalLink, Clock, DollarSign, Save } from 'lucide-react'
import { toast } from '@/components/ui/use-toast'

interface PlaceDetailsModalProps {
  place: any
  isOpen: boolean
  onClose: () => void
  onUpdate?: (updatedPlace: any) => void
}

export function PlaceDetailsModal({ place, isOpen, onClose, onUpdate }: PlaceDetailsModalProps) {
  const [userRating, setUserRating] = useState(place?.user_rating || 0)
  const [userNotes, setUserNotes] = useState(place?.user_notes || '')
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  const handleSave = async () => {
    if (!place?.id) return
    
    setIsSaving(true)
    try {
      const response = await fetch('/api/favorites/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          favoriteId: place.id,
          user_rating: userRating,
          user_notes: userNotes
        })
      })

      if (response.ok) {
        toast({
          title: "Updated successfully",
          description: "Your rating and notes have been saved.",
        })
        
        // Update the parent component
        if (onUpdate) {
          onUpdate({
            ...place,
            user_rating: userRating,
            user_notes: userNotes
          })
        }
        
        setHasChanges(false)
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save')
      }
    } catch (error) {
      console.error('Error saving rating:', error)
      
      // Check if it's a migration error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      if (errorMessage.includes('Database needs to be updated')) {
        toast({
          title: "Database Migration Required",
          description: "The rating feature requires a database update. Please run the migration first.",
          variant: "destructive"
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to save your rating. Please try again.",
          variant: "destructive"
        })
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleRatingChange = (rating: number) => {
    setUserRating(rating)
    setHasChanges(true)
  }

  const handleNotesChange = (notes: string) => {
    setUserNotes(notes)
    setHasChanges(true)
  }

  // Reset state when place changes or modal opens
  React.useEffect(() => {
    if (place) {
      setUserRating(place.user_rating || 0)
      setUserNotes(place.user_notes || '')
      setHasChanges(false)
    }
  }, [place, isOpen])

  if (!place) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{place.name}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Photo */}
          {place.photo_url && (
            <div className="w-full h-64 rounded-lg overflow-hidden">
              <img
                src={place.photo_url}
                alt={place.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              {place.google_place_id ? (
                <button
                  onClick={() => window.open(`https://www.google.com/maps/place/?q=place_id:${place.google_place_id}`, '_blank')}
                  className="flex items-center text-gray-600 hover:text-blue-600 transition-colors text-left w-full group cursor-pointer"
                >
                  <MapPin className="h-4 w-4 mr-2 group-hover:text-blue-600" />
                  <span className="text-sm group-hover:underline">
                    {place.address}
                  </span>
                  <ExternalLink className="h-3 w-3 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ) : (
                <div className="flex items-center text-gray-600">
                  <MapPin className="h-4 w-4 mr-2" />
                  <span className="text-sm">{place.address}</span>
                </div>
              )}
              {place.google_place_id && (
                <p className="text-xs text-gray-500 ml-6">Click address to view on Google Maps</p>
              )}
              
              {place.rating && (
                <div className="flex items-center">
                  <span className="text-sm text-gray-600 mr-2">Google Rating:</span>
                  <StarRating rating={Math.round(place.rating)} readonly size="sm" />
                  <span className="text-sm text-gray-600 ml-2">({place.rating})</span>
                </div>
              )}
              
              {place.price && (
                <div className="flex items-center text-gray-600">
                  <DollarSign className="h-4 w-4 mr-2" />
                  <span className="text-sm">
                    {Array.from({ length: place.price }).map((_, i) => '$').join('')}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-3">
              {place.types && place.types.length > 0 && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Categories:</p>
                  <div className="flex flex-wrap gap-1">
                    {place.types.slice(0, 5).map((type: string) => (
                      <Badge key={type} variant="secondary" className="text-xs">
                        {type.replace(/_/g, ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="text-sm text-gray-600">
                <Clock className="h-4 w-4 inline mr-1" />
                Added {new Date(place.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* User Rating Section */}
          <div className="border-t pt-4">
            <div className="mb-3">
              <h3 className="text-lg font-semibold">Your Experience</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Rate your experience (1-5 stars):
                </label>
                <StarRating
                  rating={userRating}
                  onRatingChange={handleRatingChange}
                  readonly={false}
                  size="lg"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Personal notes:
                </label>
                <Textarea
                  value={userNotes}
                  onChange={(e) => handleNotesChange(e.target.value)}
                  placeholder="Add your thoughts about this place..."
                  className="min-h-[100px]"
                />
              </div>

              <Button
                onClick={handleSave}
                disabled={isSaving || !hasChanges}
                className="w-full"
                variant={hasChanges ? "default" : "outline"}
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : hasChanges ? 'Save Changes' : 'No Changes'}
              </Button>
            </div>
          </div>


        </div>
      </DialogContent>
    </Dialog>
  )
} 