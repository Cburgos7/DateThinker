import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, Save, MapPin, Star, X } from 'lucide-react'
import { toast } from '@/components/ui/use-toast'
import { useAuth } from '@/contexts/auth-context'

interface CreateDateSetModalProps {
  selectedPlaces: any[]
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function CreateDateSetModal({ selectedPlaces, isOpen, onClose, onSuccess }: CreateDateSetModalProps) {
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [notes, setNotes] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Generate a unique share ID
  const generateShareId = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  }

  const handleSave = async () => {
    if (!user) return
    
    // Validation
    if (!title.trim()) {
      toast({
        title: "Missing title",
        description: "Please enter a title for your date set.",
        variant: "destructive"
      })
      return
    }
    
    if (!date) {
      toast({
        title: "Missing date",
        description: "Please select a date for your date set.",
        variant: "destructive"
      })
      return
    }
    
    if (!startTime) {
      toast({
        title: "Missing start time",
        description: "Please enter a start time.",
        variant: "destructive"
      })
      return
    }

    setIsSaving(true)
    try {
      // Prepare places data for JSONB storage
      const placesData = selectedPlaces.map(place => ({
        id: place.place_id || place.id,
        name: place.name,
        address: place.address,
        rating: place.rating,
        price: place.price,
        photo_url: place.photo_url,
        types: place.types,
        google_place_id: place.google_place_id,
        user_rating: place.user_rating,
        user_notes: place.user_notes
      }))

      const response = await fetch('/api/date-sets/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          title: title.trim(),
          date: date,
          start_time: startTime,
          end_time: endTime || '23:59',
          places: placesData,
          notes: notes.trim(),
          share_id: generateShareId()
        })
      })

      if (response.ok) {
        toast({
          title: "Date set created!",
          description: `"${title}" has been saved with ${selectedPlaces.length} places.`,
        })
        
        // Reset form
        setTitle('')
        setDate('')
        setStartTime('')
        setEndTime('')
        setNotes('')
        
        onClose()
        if (onSuccess) onSuccess()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create date set')
      }
    } catch (error) {
      console.error('Error creating date set:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      toast({
        title: "Error creating date set",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }

  const removePlace = (placeToRemove: any) => {
    // This would need to be passed up to parent to modify selectedPlaces
    // For now, we'll just show a toast suggesting the user go back
    toast({
      title: "To remove places",
      description: "Close this dialog and unselect places from the favorites list.",
    })
  }

  // Set default times if not set
  React.useEffect(() => {
    if (isOpen && !startTime) {
      const now = new Date()
      const defaultStart = new Date(now)
      defaultStart.setHours(19, 0, 0, 0) // 7:00 PM
      setStartTime(defaultStart.toTimeString().slice(0, 5))
      
      const defaultEnd = new Date(defaultStart)
      defaultEnd.setHours(22, 0, 0, 0) // 10:00 PM
      setEndTime(defaultEnd.toTimeString().slice(0, 5))
    }
  }, [isOpen])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Create Date Set
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Date Set Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Perfect Saturday Night Out"
                className="w-full"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]} // Today or later
                className="w-full"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="start-time">Start Time *</Label>
              <Input
                id="start-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="end-time">End Time</Label>
              <Input
                id="end-time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any special notes or instructions for your date..."
              className="min-h-[80px]"
            />
          </div>

          {/* Selected Places Preview */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">
              Selected Places ({selectedPlaces.length})
            </h3>
            <div className="grid gap-3 max-h-60 overflow-y-auto">
              {selectedPlaces.map((place, index) => (
                <Card key={place.id} className="p-3">
                  <CardContent className="p-0">
                    <div className="flex items-center space-x-3">
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                        {place.photo_url ? (
                          <img
                            src={place.photo_url}
                            alt={place.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <MapPin className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{place.name}</h4>
                        <p className="text-xs text-gray-600 truncate">{place.address}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          {place.rating && (
                            <div className="flex items-center">
                              <Star className="h-3 w-3 text-yellow-400 fill-current" />
                              <span className="text-xs ml-1">{place.rating}</span>
                            </div>
                          )}
                          {place.user_rating && (
                            <Badge variant="secondary" className="text-xs">
                              Your rating: {place.user_rating}★
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-xs text-gray-500 font-medium">
                        #{index + 1}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={isSaving}
              className="bg-gradient-to-r from-rose-500 to-purple-500 hover:opacity-90"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Creating...' : 'Create Date Set'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 