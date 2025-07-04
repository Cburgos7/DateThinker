import React, { useState } from 'react'
import { Plus, X, Sparkles, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { type PlaceResult } from '@/lib/search-utils'
import Image from 'next/image'

interface MultipleVenuesSectionProps {
  title: string
  category: 'restaurants' | 'activities' | 'outdoors'
  venues: PlaceResult[]
  onAddMore: () => void
  onRemove: (venueId: string) => void
  onRandomize?: () => void
  onFillEmptySlot?: (venueId: string, venueName: string) => void
  onRandomizeEmptySlot?: (venueId: string) => void
  isLoading?: boolean
  isLoggedIn: boolean
  isPremium?: boolean
  categoryIcon: React.ReactNode
  categoryColor: string
}

export function MultipleVenuesSection({
  title,
  category,
  venues,
  onAddMore,
  onRemove,
  onRandomize,
  onFillEmptySlot,
  onRandomizeEmptySlot,
  isLoading,
  isLoggedIn,
  isPremium,
  categoryIcon,
  categoryColor,
}: MultipleVenuesSectionProps) {
  if (venues.length === 0) {
    return null
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-xl font-semibold">{title}</CardTitle>
            {categoryIcon}
            <Badge variant="secondary" className="ml-2">
              {venues.length} {venues.length === 1 ? 'venue' : 'venues'}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {onRandomize && (
              <Button
                size="sm"
                variant="outline"
                onClick={onRandomize}
                disabled={isLoading}
                className="h-8"
              >
                <Sparkles className="h-4 w-4 mr-1" />
                Surprise Me
              </Button>
            )}
            <Button
              size="sm"
              onClick={onAddMore}
              disabled={isLoading}
              className={cn(
                "h-8",
                categoryColor
              )}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add More
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {venues.map((venue, index) => (
          <VenueCard
            key={venue.id}
            venue={venue}
            onRemove={() => onRemove(venue.id)}
            onFillEmptySlot={(venueName) => onFillEmptySlot?.(venue.id, venueName)}
            onRandomizeEmptySlot={() => onRandomizeEmptySlot?.(venue.id)}
            canRemove={venues.length > 1}
            isLoggedIn={isLoggedIn}
            isPremium={isPremium}
            index={index}
          />
        ))}
      </CardContent>
    </Card>
  )
}

interface VenueCardProps {
  venue: PlaceResult
  onRemove: () => void
  onFillEmptySlot?: (venueName: string) => void
  onRandomizeEmptySlot?: () => void
  canRemove: boolean
  isLoggedIn: boolean
  isPremium?: boolean
  index: number
}

function VenueCard({ venue, onRemove, onFillEmptySlot, onRandomizeEmptySlot, canRemove, isLoggedIn, isPremium, index }: VenueCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [inputValue, setInputValue] = useState('')

  const getPriceDisplay = (price: number) => {
    return '$'.repeat(Math.min(price, 4))
  }

  const handleManualInput = () => {
    if (inputValue.trim() && onFillEmptySlot) {
      onFillEmptySlot(inputValue.trim())
      setInputValue('')
      setIsEditing(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleManualInput()
    }
  }

  // If this is an empty slot, show the input interface
  if (venue.isEmpty) {
    return (
      <div className="flex gap-4 p-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {isEditing ? (
                <div className="space-y-2">
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Enter a specific venue name..."
                    className="w-full"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleManualInput}
                      disabled={!inputValue.trim()}
                      className="flex-1"
                    >
                      <Search className="h-4 w-4 mr-1" />
                      Add Venue
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setIsEditing(false)
                        setInputValue('')
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <h3 className="font-medium text-lg leading-tight text-gray-500">Empty Slot</h3>
                  <p className="text-sm text-gray-400">Add a specific venue or get a random suggestion</p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsEditing(true)}
                      className="flex-1"
                    >
                      <Search className="h-4 w-4 mr-1" />
                      Add Specific Venue
                    </Button>
                    <Button
                      size="sm"
                      onClick={onRandomizeEmptySlot}
                      className="flex-1"
                    >
                      <Sparkles className="h-4 w-4 mr-1" />
                      Surprise Me
                    </Button>
                  </div>
                </div>
              )}
            </div>
            {canRemove && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onRemove}
                className="h-8 w-8 p-0 text-gray-400 hover:text-red-500"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Regular venue card
  return (
    <div className="flex gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
      {venue.photoUrl && (
        <div className="flex-shrink-0 w-20 h-20 overflow-hidden rounded-lg">
          <Image
            src={venue.photoUrl}
            alt={venue.name}
            width={80}
            height={80}
            className="w-full h-full object-cover"
            crossOrigin="anonymous"
          />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-medium text-lg leading-tight">{venue.name}</h3>
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{venue.address}</p>
            <div className="flex items-center gap-3 mt-2">
              {venue.rating && (
                <div className="flex items-center gap-1">
                  <span className="text-yellow-500">★</span>
                  <span className="text-sm font-medium">{venue.rating.toFixed(1)}</span>
                </div>
              )}
              {venue.price && (
                <div className="flex items-center gap-1">
                  <span className="text-sm font-medium text-green-600">
                    {getPriceDisplay(venue.price)}
                  </span>
                </div>
              )}
              {venue.openNow !== undefined && (
                <div className={cn(
                  "text-xs px-2 py-1 rounded-full",
                  venue.openNow 
                    ? "bg-green-100 text-green-700" 
                    : "bg-red-100 text-red-700"
                )}>
                  {venue.openNow ? 'Open' : 'Closed'}
                </div>
              )}
            </div>
          </div>
          {canRemove && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onRemove}
              className="h-8 w-8 p-0 text-gray-400 hover:text-red-500"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
} 