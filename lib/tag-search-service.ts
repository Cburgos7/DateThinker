import { mapTagsToSearchParams, buildSearchQuery, getSearchFilters, prioritizeSearchResults, TagSearchParams } from './tag-search-mapping'
import { DateStepSearchParams } from './types'
import { TagSearchResult } from './types'
import { tagsToSearchParams } from './tag-search-mapping'



export class TagSearchService {
  private baseUrl: string
  private apiKey: string

  constructor(baseUrl: string = '/api', apiKey: string = '') {
    this.baseUrl = baseUrl
    this.apiKey = apiKey
  }

  async searchByTags(params: {
    city: string
    placeId?: string
    tags: string[]
    location?: string
    maxResults?: number
    excludeIds?: string[]
  }): Promise<TagSearchResult[]> {
    try {
      // Convert tags to search parameters
      const searchParams = mapTagsToSearchParams(params.tags)
      const query = buildSearchQuery(searchParams)
      const filters = getSearchFilters(searchParams)

      // Build the API request
      const searchUrl = new URL(`${this.baseUrl}/search`, window.location.origin)
      searchUrl.searchParams.set('query', query)
      searchUrl.searchParams.set('city', params.city)
      
      if (params.placeId) {
        searchUrl.searchParams.set('placeId', params.placeId)
      }
      
      if (params.location) {
        searchUrl.searchParams.set('location', params.location)
      }
      
      if (params.maxResults) {
        searchUrl.searchParams.set('maxResults', params.maxResults.toString())
      }
      
      if (params.excludeIds?.length) {
        searchUrl.searchParams.set('excludeIds', params.excludeIds.join(','))
      }

      // Add filter parameters
      if (filters.types?.length) {
        searchUrl.searchParams.set('types', filters.types.join(','))
      }
      
      if (filters.priceLevel) {
        searchUrl.searchParams.set('priceLevel', filters.priceLevel.toString())
      }
      
      if (filters.openNow) {
        searchUrl.searchParams.set('openNow', 'true')
      }

      const response = await fetch(searchUrl.toString())
      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`)
      }

      const data = await response.json()
      const results = this.transformResults(data.results || [], params.tags)
      
      // Prioritize results based on tag relevance
      const prioritizedResults = prioritizeSearchResults(results, params.tags)
      
      return prioritizedResults.slice(0, params.maxResults || 10)
    } catch (error) {
      console.error('Tag search failed:', error)
      throw error
    }
  }

  async getRandomVenue(params: {
    city: string
    placeId?: string
    tags: string[]
    location?: string
    excludeIds?: string[]
  }): Promise<TagSearchResult | null> {
    try {
      const results = await this.searchByTags({
        ...params,
        maxResults: 20, // Get more results to choose from
      })
      
      if (results.length === 0) {
        return null
      }

      // Pick a random result from the top results
      const randomIndex = Math.floor(Math.random() * Math.min(results.length, 5))
      return results[randomIndex]
    } catch (error) {
      console.error('Random venue search failed:', error)
      return null
    }
  }

  private transformResults(rawResults: any[], tags: string[]): TagSearchResult[] {
    return rawResults.map(result => ({
      id: result.place_id || result.id,
      name: result.name,
      address: result.vicinity || result.formatted_address,
      placeId: result.place_id || result.id,
      rating: result.rating,
      priceLevel: result.price_level,
      photos: result.photos?.map((photo: any) => photo.photo_reference),
      phoneNumber: result.formatted_phone_number,
      website: result.website,
      openNow: result.opening_hours?.open_now,
      category: this.determineCategoryFromTags(tags),
      tags: tags,
    }))
  }

  private determineCategoryFromTags(tags: string[]): 'restaurant' | 'activity' | 'outdoor' | 'event' {
    // Simple category determination based on tags
    if (tags.includes('restaurant') || tags.some(tag => ['cafe', 'bar', 'fine-dining', 'fast-food', 'brunch', 'takeout'].includes(tag))) {
      return 'restaurant'
    }
    if (tags.includes('outdoor') || tags.some(tag => ['park', 'hike', 'scenic', 'beach', 'lake', 'garden'].includes(tag))) {
      return 'outdoor'
    }
    if (tags.includes('event') || tags.some(tag => ['live-music', 'shows', 'movie', 'theater', 'concert', 'comedy', 'festival'].includes(tag))) {
      return 'event'
    }
    if (tags.includes('activity') || tags.some(tag => ['sports', 'arcade', 'mini-golf', 'bowling', 'museum', 'shopping', 'gym', 'spa'].includes(tag))) {
      return 'activity'
    }
    return 'restaurant' // Default fallback
  }

  // Helper method to get suggested tags based on context
  getSuggestedTags(context: {
    timeOfDay?: string
    previousSteps?: Array<{ tags: string[] }>
    stepNumber?: number
  }): string[] {
    const suggestions: string[] = []
    
    // Time-based suggestions
    if (context.timeOfDay) {
      switch (context.timeOfDay) {
        case 'morning':
          suggestions.push('cafe', 'breakfast', 'casual')
          break
        case 'lunch':
          suggestions.push('restaurant', 'casual', 'moderate')
          break
        case 'afternoon':
          suggestions.push('cafe', 'cultural', 'shopping')
          break
        case 'evening':
          suggestions.push('restaurant', 'romantic', 'bar')
          break
        case 'night':
          suggestions.push('bar', 'club', 'lively')
          break
      }
    }

    // Step-based suggestions
    if (context.stepNumber) {
      if (context.stepNumber === 1) {
        suggestions.push('casual', 'coffee', 'lunch')
      } else if (context.stepNumber === 2) {
        suggestions.push('activity', 'cultural', 'entertainment')
      } else if (context.stepNumber >= 3) {
        suggestions.push('romantic', 'dinner', 'bar')
      }
    }

    // Avoid repeating similar venues
    const previousTags = context.previousSteps?.flatMap(step => step.tags) || []
    if (previousTags.includes('restaurant')) {
      suggestions.push('activity', 'entertainment', 'cultural')
    }
    if (previousTags.includes('cafe')) {
      suggestions.push('park', 'museum', 'shopping')
    }

    return [...new Set(suggestions)]
  }
}

// Export a singleton instance
export const tagSearchService = new TagSearchService()

// Legacy compatibility function
export async function searchVenuesByTags(params: DateStepSearchParams): Promise<TagSearchResult[]> {
  return tagSearchService.searchByTags(params)
}

export async function getRandomVenueByTags(params: DateStepSearchParams): Promise<TagSearchResult | null> {
  return tagSearchService.getRandomVenue(params)
}

// Mock venue generation function
export function generateMockVenues(tags: string[], city: string): TagSearchResult[] {
  if (tags.length === 0) return []

  // Determine the main venue type
  const venueType = tags.find(tag => 
    ['restaurant', 'activity', 'outdoor', 'event'].includes(tag)
  ) || 'restaurant'

  // Generate 6-8 venues
  const venueCount = Math.floor(Math.random() * 3) + 6
  const venues: TagSearchResult[] = []

  for (let i = 0; i < venueCount; i++) {
    const venue = generateSingleMockVenue(venueType as any, tags, city)
    venues.push(venue)
  }

  return venues
}

function generateSingleMockVenue(
  venueType: 'restaurant' | 'activity' | 'outdoor' | 'event',
  tags: string[],
  city: string
): TagSearchResult {
  const id = `mock-${venueType}-${Date.now()}-${Math.random()}`
  
  // Generate name based on venue type and tags
  const name = generateVenueName(venueType, tags)
  
  // Generate address
  const address = generateAddress(city)
  
  // Generate rating (3.8 to 5.2)
  const rating = Math.round((3.8 + Math.random() * 1.4) * 10) / 10
  
  // Generate price level based on tags
  const priceLevel = generatePriceLevel(tags)
  
  // Generate photo URL
  const photoUrl = generatePhotoUrl(venueType)
  
  return {
    id,
    name,
    address,
    category: venueType,
    rating,
    priceLevel,
    photoUrl,
    openNow: Math.random() > 0.2, // 80% chance of being open
    tags: tags.filter(tag => tag !== venueType) // Remove main venue type from tags
  }
}

function generateVenueName(venueType: string, tags: string[]): string {
  const atmosphereWords = ['cozy', 'upscale', 'casual', 'trendy', 'classic', 'modern', 'rustic', 'elegant']
  const locationWords = ['downtown', 'main street', 'plaza', 'corner', 'central', 'garden', 'square', 'avenue']
  
  switch (venueType) {
    case 'restaurant':
      return generateRestaurantName(tags)
    case 'activity':
      return generateActivityName(tags)
    case 'outdoor':
      return generateOutdoorName(tags)
    case 'event':
      return generateEventName(tags)
    default:
      return `The ${atmosphereWords[Math.floor(Math.random() * atmosphereWords.length)]} ${locationWords[Math.floor(Math.random() * locationWords.length)]}`
  }
}

function generateRestaurantName(tags: string[]): string {
  // Check for cuisine-specific naming
  const cuisineNames = {
    'fine-dining': ['Bella Vista', 'Le Bernardin', 'The Crown', 'Lumière', 'Atelier'],
    'cafe': ['Corner Cafe', 'Brew & Bite', 'The Daily Grind', 'Sunrise Cafe', 'Beans & Dreams'],
    'bar': ['The Brass Monkey', 'Sunset Lounge', 'The Dive', 'Craft & Co', 'Midnight Bar'],
    'fast-food': ['Quick Bite', 'Speedy Eats', 'Fast & Fresh', 'Grab & Go', 'Rapid Diner'],
    'brunch': ['Sunday Brunch', 'The Waffle House', 'Pancake Palace', 'Brunch Spot', 'Morning Glory'],
    'takeout': ['Takeout Express', 'Quick Pickup', 'Grab & Go', 'Fast Delivery', 'Express Eats']
  }

  for (const [tag, names] of Object.entries(cuisineNames)) {
    if (tags.includes(tag)) {
      return names[Math.floor(Math.random() * names.length)]
    }
  }

  // Generic restaurant names
  const restaurantNames = [
    'The Golden Fork', 'Harvest Table', 'Urban Kitchen', 'Bistro 42', 'The Local Eatery',
    'Garden Bistro', 'Fire & Stone', 'The Rustic Spoon', 'Artisan Kitchen', 'The Copper Pot'
  ]
  
  return restaurantNames[Math.floor(Math.random() * restaurantNames.length)]
}

function generateActivityName(tags: string[]): string {
  const activityNames = {
    'sports': ['SportsPlex', 'Athletic Center', 'Fitness Hub', 'The Gym', 'Sports Arena'],
    'arcade': ['Game Zone', 'Arcade Planet', 'Fun Center', 'Pixel Palace', 'Game Galaxy'],
    'mini-golf': ['Mini Golf Paradise', 'Putt Putt Course', 'Adventure Golf', 'Mini Links', 'Tiny Greens'],
    'bowling': ['Strike Zone', 'Bowling Alley', 'Ten Pin Center', 'Lucky Strikes', 'Spare Time'],
    'museum': ['City Museum', 'Art Gallery', 'History Museum', 'Science Center', 'Cultural Center'],
    'shopping': ['Shopping Plaza', 'The Mall', 'Retail District', 'Market Square', 'Shopping Center'],
    'gym': ['Fitness First', 'The Gym', 'Iron House', 'Strength Studio', 'Flex Fitness'],
    'spa': ['Serenity Spa', 'Wellness Center', 'Relax & Restore', 'Tranquil Spa', 'The Spa']
  }

  for (const [tag, names] of Object.entries(activityNames)) {
    if (tags.includes(tag)) {
      return names[Math.floor(Math.random() * names.length)]
    }
  }

  const genericNames = [
    'Adventure Zone', 'Fun Factory', 'The Experience', 'Activity Hub', 'Entertainment Center',
    'Discovery Place', 'The Venue', 'Experience Center', 'Activity Plaza', 'Fun Central'
  ]
  
  return genericNames[Math.floor(Math.random() * genericNames.length)]
}

function generateOutdoorName(tags: string[]): string {
  const outdoorNames = {
    'park': ['City Park', 'Central Park', 'Green Space', 'Community Park', 'Recreation Area'],
    'hike': ['Nature Trail', 'Hiking Path', 'Trail Head', 'Mountain Path', 'Forest Trail'],
    'scenic': ['Scenic Overlook', 'Vista Point', 'Lookout Point', 'Scenic Drive', 'View Point'],
    'beach': ['Sandy Beach', 'Waterfront', 'Beach Park', 'Seaside', 'Coastal Area'],
    'lake': ['Lake View', 'Waterfront Park', 'Lake Shore', 'Reservoir', 'Water Park'],
    'garden': ['Botanical Garden', 'Rose Garden', 'Flower Garden', 'Nature Garden', 'Heritage Garden']
  }

  for (const [tag, names] of Object.entries(outdoorNames)) {
    if (tags.includes(tag)) {
      return names[Math.floor(Math.random() * names.length)]
    }
  }

  const genericNames = [
    'Nature Reserve', 'Outdoor Space', 'Recreation Area', 'Green Belt', 'Natural Area',
    'Parkland', 'Open Space', 'Conservation Area', 'Outdoor Center', 'Nature Park'
  ]
  
  return genericNames[Math.floor(Math.random() * genericNames.length)]
}

function generateEventName(tags: string[]): string {
  const eventNames = {
    'live-music': ['The Music Hall', 'Live Venue', 'Concert Hall', 'Music Club', 'The Stage'],
    'shows': ['Show Palace', 'Performance Hall', 'The Theater', 'Entertainment Center', 'Show Venue'],
    'movie': ['Cinema Complex', 'Movie Theater', 'Film House', 'The Movies', 'Picture Palace'],
    'theater': ['Drama Theater', 'Playhouse', 'The Stage', 'Community Theater', 'Theater Hall'],
    'concert': ['Concert Hall', 'Music Arena', 'The Amphitheater', 'Concert Venue', 'Music Hall'],
    'comedy': ['Comedy Club', 'Laugh Track', 'The Funny Bone', 'Comedy Central', 'Jokes & Laughs'],
    'festival': ['Festival Grounds', 'Event Park', 'Celebration Center', 'Festival Plaza', 'Event Space']
  }

  for (const [tag, names] of Object.entries(eventNames)) {
    if (tags.includes(tag)) {
      return names[Math.floor(Math.random() * names.length)]
    }
  }

  const genericNames = [
    'Event Center', 'The Venue', 'Entertainment Hall', 'Event Space', 'Performance Center',
    'The Arena', 'Convention Center', 'Event Plaza', 'Entertainment District', 'The Hall'
  ]
  
  return genericNames[Math.floor(Math.random() * genericNames.length)]
}

function generateAddress(city: string): string {
  const streetNumbers = Math.floor(Math.random() * 9999) + 1
  const streetNames = [
    'Main St', 'Oak Ave', 'Maple Dr', 'Cedar Ln', 'Pine St', 'Elm St', 'Washington Ave',
    'Park Rd', 'Lake Dr', 'River Rd', 'Hill St', 'Valley Rd', 'Forest Ave', 'Beach Dr',
    'Mountain View', 'Sunset Blvd', 'Broadway', 'First Ave', 'Second St', 'Third Ave'
  ]
  
  const streetName = streetNames[Math.floor(Math.random() * streetNames.length)]
  return `${streetNumbers} ${streetName}, ${city}`
}

function generatePriceLevel(tags: string[]): number {
  // Check for price-indicating tags
  if (tags.includes('fine-dining') || tags.includes('upscale')) {
    return 4
  }
  if (tags.includes('fast-food') || tags.includes('takeout')) {
    return 1
  }
  if (tags.includes('casual') || tags.includes('cafe')) {
    return 2
  }
  
  // Random price level (1-4)
  return Math.floor(Math.random() * 4) + 1
}

function generatePhotoUrl(venueType: string): string {
  const photoUrls = {
    restaurant: [
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1552566626-52f8b828add9?q=80&w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=80&w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=600&auto=format&fit=crop'
    ],
    activity: [
      'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?q=80&w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=600&auto=format&fit=crop'
    ],
    outdoor: [
      'https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?q=80&w=600&auto=format&fit=crop'
    ],
    event: [
      'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?q=80&w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?q=80&w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?q=80&w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=600&auto=format&fit=crop'
    ]
  }
  
  const urls = photoUrls[venueType as keyof typeof photoUrls] || photoUrls.restaurant
  return urls[Math.floor(Math.random() * urls.length)]
}

 