'use client'

import { useState } from 'react'
import { DateSet } from '@/lib/date-sets'
import * as dateFns from "date-fns"
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Share2, Clock, MapPin, Edit, Check, X } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { createClient } from "@/utils/supabase/client"

interface DateSetCardProps {
  dateSet: any; // Using any for maximum compatibility with different formats
  onUpdate?: (updatedDateSet: any) => void;
}

export function DateSetCard({ dateSet, onUpdate }: DateSetCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [startTime, setStartTime] = useState(dateSet?.start_time || '')
  const [endTime, setEndTime] = useState(dateSet?.end_time || '')
  const [isSaving, setIsSaving] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false)

  // Advanced debug output to help diagnose issues
  console.log("========== DATE SET CARD RENDERING ==========");
  console.log("DateSet object:", dateSet);
  console.log("DateSet keys:", Object.keys(dateSet || {}));
  console.log("Missing required fields:", [
    'id', 'title', 'date', 'start_time', 'end_time', 'places'
  ].filter(prop => dateSet?.[prop] === undefined));
  console.log("Places type:", typeof dateSet?.places);
  console.log("==============================================");
  
  // Safety check for null/undefined dateSet
  if (!dateSet) {
    console.error("DateSetCard received null or undefined dateSet");
    return (
      <Card className="w-full h-full flex flex-col bg-red-50">
        <CardHeader>
          <CardTitle>Error: Invalid Date Set Data</CardTitle>
        </CardHeader>
        <CardContent>
          <p>This date set cannot be displayed due to invalid data.</p>
        </CardContent>
      </Card>
    );
  }
  
  // Parse places if it's a JSON string
  let places;
  try {
    // Log the raw places data for debugging
    console.log("Raw places data:", {
      value: dateSet.places,
      type: typeof dateSet.places,
      isArray: Array.isArray(dateSet.places),
      isEmpty: !dateSet.places || dateSet.places.length === 0
    });
    
    if (typeof dateSet.places === 'string') {
      try {
        places = JSON.parse(dateSet.places);
      } catch (e) {
        console.error("Failed to parse places JSON:", e);
        places = [];
      }
    } else if (Array.isArray(dateSet.places)) {
      places = dateSet.places;
    } else {
      console.log("Places is neither string nor array, defaulting to empty array");
      places = [];
    }
  } catch (error) {
    console.error("Error parsing places data:", error);
    places = [];
  }
  
  // Format date safely
  let formattedDate;
  try {
    formattedDate = dateSet.date 
      ? dateFns.format(new Date(dateSet.date), 'MMMM d, yyyy')
      : 'No date specified';
  } catch (error) {
    console.error("Error formatting date:", error);
    formattedDate = 'Invalid date';
  }

  // Calculate total time in minutes safely
  let totalTimeDisplay = '';
  try {
    if (startTime && endTime) {
      const totalMinutes = dateFns.differenceInMinutes(
        dateFns.parseISO(`2000-01-01T${endTime}`),
        dateFns.parseISO(`2000-01-01T${startTime}`)
      );
      
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      totalTimeDisplay = `${hours}h ${minutes}m`;
    }
  } catch (error) {
    console.error("Error calculating time difference:", error);
    totalTimeDisplay = 'Duration unavailable';
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const supabase = createClient();
      
      // Update the date set directly
      const { data, error } = await supabase
        .from('date_sets')
        .update({
          start_time: startTime,
          end_time: endTime,
        })
        .eq('id', dateSet.id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating date set:', error);
        toast.error(error.message || 'Failed to update date set');
        return;
      }
      
      toast.success('Date set updated successfully')
      setIsEditing(false)
      if (onUpdate && data) {
        onUpdate(data)
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
    <Card className="w-full h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{dateSet.title || 'Untitled Date Set'}</CardTitle>
            <p className="text-sm text-gray-500">{formattedDate}</p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/date-plans/${dateSet.id}`}>
              <Share2 className="h-4 w-4 mr-1" />
              View
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="space-y-4">
          {dateSet.start_time && dateSet.end_time && (
            <div className="flex items-center text-sm text-gray-600">
              <Clock className="h-4 w-4 mr-1" />
              <span>{dateSet.start_time} - {dateSet.end_time}</span>
            </div>
          )}
          
          {places && places.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium">Locations</h3>
              <div className="space-y-2">
                {places.slice(0, 1).map((place: any, index: number) => (
                  <div key={place.id || place.name || index} className="flex items-start">
                    <MapPin className="h-4 w-4 mr-1 mt-0.5 text-gray-500" />
                    <div>
                      <p className="font-medium">{place.name || 'Unnamed Location'}</p>
                      <p className="text-sm text-gray-600">{place.address || 'No address'}</p>
                    </div>
                  </div>
                ))}
                {places.length > 1 && (
                  <p className="text-sm text-gray-500">And {places.length - 1} more locations...</p>
                )}
              </div>
            </div>
          )}
          
          {dateSet.notes && (
            <div className="space-y-1">
              <h3 className="font-medium">Notes</h3>
              <p className="text-sm text-gray-600">
                {dateSet.notes.length > 100 ? 
                  `${dateSet.notes.substring(0, 100)}...` : 
                  dateSet.notes
                }
              </p>
            </div>
          )}
          
          {(!dateSet.start_time || !dateSet.end_time) && (!places || places.length === 0) && !dateSet.notes && (
            <div className="text-center py-2">
              <p className="text-sm text-gray-500">No additional details available</p>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full">
          <Link href={`/date-plans/${dateSet.id}`}>View Details</Link>
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