'use client'

import { useState } from 'react'
import { DateSet } from '@/lib/date-sets'
import { format, parseISO, differenceInMinutes } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Share2, Clock, MapPin, Edit, Check, X } from 'lucide-react'
import { toast } from 'sonner'
import { updateDateSetAction } from '@/app/actions/date-sets'

interface DateSetCardProps {
  dateSet: DateSet
  onUpdate?: (updatedDateSet: DateSet) => void
}

export function DateSetCard({ dateSet, onUpdate }: DateSetCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [startTime, setStartTime] = useState(dateSet.start_time)
  const [endTime, setEndTime] = useState(dateSet.end_time)
  const [isSaving, setIsSaving] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false)

  // Calculate total time in minutes
  const totalMinutes = differenceInMinutes(
    parseISO(`2000-01-01T${endTime}`),
    parseISO(`2000-01-01T${startTime}`)
  )
  
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  const totalTimeDisplay = `${hours}h ${minutes}m`

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const result = await updateDateSetAction(
        dateSet.id,
        dateSet.title,
        dateSet.date,
        startTime,
        endTime,
        dateSet.places,
        dateSet.notes || undefined
      )
      
      if (result.success) {
        toast.success('Date set updated successfully')
        setIsEditing(false)
        if (onUpdate && result.dateSet) {
          onUpdate(result.dateSet)
        }
      } else {
        toast.error(result.error || 'Failed to update date set')
      }
    } catch (error) {
      console.error('Error updating date set:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsSaving(false)
    }
  }

  const handleShare = () => {
    const url = `${window.location.origin}/date-plans/${dateSet.id}`
    setShareUrl(url)
    setIsShareDialogOpen(true)
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl)
    toast.success('Link copied to clipboard')
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{dateSet.title}</CardTitle>
            <CardDescription>
              {format(new Date(dateSet.date), 'MMMM d, yyyy')}
            </CardDescription>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-1" />
              Share
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? <X className="h-4 w-4 mr-1" /> : <Edit className="h-4 w-4 mr-1" />}
              {isEditing ? 'Cancel' : 'Edit'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
            <Button 
              className="w-full" 
              onClick={handleSave} 
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center text-sm text-gray-600">
              <Clock className="h-4 w-4 mr-1" />
              <span>{startTime} - {endTime}</span>
              <span className="ml-2 font-medium">({totalTimeDisplay})</span>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-medium">Locations</h3>
              <div className="space-y-2">
                {dateSet.places.map((place) => (
                  <div key={place.id} className="flex items-start">
                    <MapPin className="h-4 w-4 mr-1 mt-0.5 text-gray-500" />
                    <div>
                      <p className="font-medium">{place.name}</p>
                      <p className="text-sm text-gray-600">{place.address}</p>
                      {place.rating && (
                        <p className="text-sm text-gray-500">Rating: {place.rating}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {dateSet.notes && (
              <div className="space-y-1">
                <h3 className="font-medium">Notes</h3>
                <p className="text-sm text-gray-600">{dateSet.notes}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full">
          <a href={`/date-plans/${dateSet.id}`}>View Details</a>
        </Button>
      </CardFooter>

      <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Date Set</DialogTitle>
            <DialogDescription>
              Share this date set with friends or family
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center space-x-2">
              <Input value={shareUrl} readOnly />
              <Button onClick={copyToClipboard}>Copy</Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsShareDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
} 