'use client'

import * as dateFns from "date-fns"
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, MapPin, Share2 } from 'lucide-react'
import Link from 'next/link'

interface DatePlanCardProps {
  dateSet: any; // Using any to match existing component usage
  showActions?: boolean;
}

export function DatePlanCard({ dateSet, showActions = true }: DatePlanCardProps) {
  // Calculate total time in minutes if both times are present
  const totalTimeDisplay = dateSet.start_time && dateSet.end_time ? 
    calculateDuration(dateSet.start_time, dateSet.end_time) : null;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{dateSet.title}</CardTitle>
            <CardDescription>
              {dateSet.date ? dateFns.format(new Date(dateSet.date), 'MMMM d, yyyy') : 'No date specified'}
            </CardDescription>
          </div>
          {showActions && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/date-plans/${dateSet.id}`}>
                <Share2 className="h-4 w-4 mr-1" />
                View
              </Link>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {dateSet.start_time && dateSet.end_time && (
            <div className="flex items-center text-sm text-gray-600">
              <Clock className="h-4 w-4 mr-1" />
              <span>{dateSet.start_time} - {dateSet.end_time}</span>
              {totalTimeDisplay && (
                <span className="ml-2 font-medium">({totalTimeDisplay})</span>
              )}
            </div>
          )}
          
          {dateSet.places && dateSet.places.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium">Locations</h3>
              <div className="space-y-2">
                {dateSet.places.slice(0, 3).map((place: any) => (
                  <div key={place.id} className="flex items-start">
                    <MapPin className="h-4 w-4 mr-1 mt-0.5 text-gray-500" />
                    <div>
                      <p className="font-medium">{place.name}</p>
                      <p className="text-sm text-gray-600">{place.address}</p>
                    </div>
                  </div>
                ))}
                {dateSet.places.length > 3 && (
                  <p className="text-sm text-gray-500">And {dateSet.places.length - 3} more locations...</p>
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
        </div>
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full">
          <Link href={`/date-plans/${dateSet.id}`}>View Details</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}

// Helper function to calculate duration
function calculateDuration(startTime: string, endTime: string): string {
  try {
    const totalMinutes = dateFns.differenceInMinutes(
      dateFns.parseISO(`2000-01-01T${endTime}`),
      dateFns.parseISO(`2000-01-01T${startTime}`)
    )
    
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    return `${hours}h ${minutes}m`
  } catch (error) {
    return "Duration N/A"
  }
} 