export interface Activity {
  name: string
  description: string
  duration: string
}

export interface DatePlan {
  id: string
  title: string
  description: string
  activities: Activity[]
  created_at: string
  updated_at: string
  user_id: string
}

export interface DateSet {
  id: string
  title: string
  description: string
  date: string
  start_time: string
  end_time: string
  places: any[] // Replace with proper Place type if available
  share_id: string
  created_at: string
  updated_at: string
  user_id: string
}

// Sequential Date Planning Types

export interface DateStep {
  id: string
  stepNumber: number
  title: string
  description?: string
  venue?: {
    id: string
    name: string
    address: string
    category: string
    tags: string[]
    rating?: number
    price?: number
    photoUrl?: string
    openNow?: boolean
  }
  preferences: {
    tags: string[] // e.g., ["restaurant", "fine-dining"] or ["activity", "sports"]
    location?: string // Specific location if different from main city
    priceRange?: number
    timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night'
  }
  timing?: {
    estimatedDuration?: number // in minutes
    startTime?: string // HH:MM format
    endTime?: string // calculated from startTime + duration
    isFlexible?: boolean
    timeBuffer?: number // buffer time after this step in minutes
    flexibility?: 'strict' | 'flexible' | 'very-flexible' // how flexible the timing is
    timePreference?: 'morning' | 'afternoon' | 'evening' | 'night' | 'anytime'
  }
  status: 'empty' | 'searching' | 'filled' | 'confirmed'
  notes?: string
}

export interface SequentialDatePlan {
  id: string
  title: string
  description?: string
  city: string
  placeId?: string
  steps: DateStep[]
  createdAt: string
  updatedAt: string
  isTemplate: boolean
  isPublic: boolean
  userId?: string
  tags: string[] // Overall plan tags like ["romantic", "budget-friendly", "outdoor"]
  estimatedTotalTime?: number // Total duration in minutes
  estimatedCost?: 'budget' | 'moderate' | 'expensive'
}

export interface CategoryTag {
  id: string
  name: string
  category: 'venue-type' | 'cuisine' | 'activity-type' | 'atmosphere' | 'price' | 'time'
  parent?: string // For hierarchical tags like "food" -> "italian"
  color?: string
  icon?: string
  description?: string
}

// Simplified venue types for the hierarchical system
export const VENUE_TYPES = {
  RESTAURANT: 'restaurant',
  ACTIVITY: 'activity', 
  OUTDOOR: 'outdoor',
  EVENT: 'event'
} as const

export const VENUE_TYPE_OPTIONS = [
  { value: 'restaurant', label: 'Restaurant', icon: '🍽️', description: 'Dining, cafes, bars' },
  { value: 'activity', label: 'Activity', icon: '🎯', description: 'Sports, entertainment, shopping' },
  { value: 'outdoor', label: 'Outdoor', icon: '🌳', description: 'Parks, nature, outdoor activities' },
  { value: 'event', label: 'Event', icon: '🎭', description: 'Theater, concerts, shows' }
] as const

// Sub-tags for each venue type (hierarchical system)
export const VENUE_SUB_TAGS = {
  restaurant: ['dinner', 'lunch', 'brunch', 'cafe', 'bar', 'fast-food', 'fine-dining', 'takeout'],
  activity: ['sports', 'arcade', 'mini-golf', 'bowling', 'museum', 'shopping', 'gym', 'spa'],
  outdoor: ['park', 'hike', 'scenic', 'national-park', 'beach', 'lake', 'trail', 'garden'],
  event: ['live-music', 'shows', 'movie', 'theater', 'concert', 'comedy', 'festival', 'sports-event']
} as const

export type VenueType = typeof VENUE_TYPES[keyof typeof VENUE_TYPES]
export type VenueSubTag = typeof VENUE_SUB_TAGS[VenueType][number]

// Search interface for the new system
export interface DateStepSearchParams {
  city: string
  placeId?: string
  tags: string[]
  location?: string
  priceRange?: number
  timeOfDay?: string
  excludeIds?: string[]
  maxResults?: number
}

// Tag search result interface
export interface TagSearchResult {
  id: string
  name: string
  address: string
  category: 'restaurant' | 'activity' | 'outdoor' | 'event'
  rating?: number
  priceLevel?: number
  photoUrl?: string
  openNow?: boolean
  tags: string[]
} 