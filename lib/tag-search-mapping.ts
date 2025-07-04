import { VENUE_TYPE_OPTIONS, VENUE_SUB_TAGS } from './types'

// Mapping from simplified venue types to Google Places API types
export const TAG_TO_PLACE_TYPE_MAP: Record<string, string[]> = {
  // Main venue types
  'restaurant': ['restaurant', 'meal_takeaway', 'meal_delivery', 'cafe', 'bakery', 'bar'],
  'activity': ['museum', 'art_gallery', 'movie_theater', 'amusement_park', 'casino', 'shopping_mall', 'gym', 'spa', 'bowling_alley', 'golf_course'],
  'outdoor': ['park', 'tourist_attraction', 'rv_park', 'campground', 'zoo'],
  'event': ['movie_theater', 'performing_arts_theater', 'stadium', 'concert_hall', 'convention_center'],
}

// Mapping from tags to search keywords
export const TAG_TO_KEYWORD_MAP: Record<string, string[]> = {
  // Main venue types
  'restaurant': ['restaurant', 'dining', 'food', 'eat'],
  'activity': ['activity', 'fun', 'entertainment'],
  'outdoor': ['outdoor', 'park', 'nature', 'recreation'],
  'event': ['event', 'show', 'performance'],
  
  // Restaurant sub-tags
  'dinner': ['dinner', 'evening dining'],
  'lunch': ['lunch', 'midday dining'],
  'brunch': ['brunch', 'breakfast', 'morning'],
  'cafe': ['cafe', 'coffee', 'bakery'],
  'bar': ['bar', 'drinks', 'cocktails'],
  'fast-food': ['fast food', 'quick service'],
  'fine-dining': ['fine dining', 'upscale', 'elegant'],
  'takeout': ['takeout', 'delivery', 'to-go'],
  
  // Activity sub-tags
  'sports': ['sports', 'athletic', 'fitness'],
  'arcade': ['arcade', 'games', 'entertainment'],
  'mini-golf': ['mini golf', 'putt putt'],
  'bowling': ['bowling', 'bowling alley'],
  'museum': ['museum', 'art', 'history'],
  'shopping': ['shopping', 'mall', 'retail'],
  'gym': ['gym', 'fitness', 'workout'],
  'spa': ['spa', 'wellness', 'relaxation'],
  
  // Outdoor sub-tags
  'park': ['park', 'recreation', 'playground'],
  'hike': ['hiking', 'trail', 'nature walk'],
  'scenic': ['scenic', 'views', 'lookout'],
  'national-park': ['national park', 'preserve'],
  'beach': ['beach', 'shore', 'waterfront'],
  'lake': ['lake', 'water', 'swimming'],
  'trail': ['trail', 'path', 'walking'],
  'garden': ['garden', 'botanical', 'flowers'],
  
  // Event sub-tags
  'live-music': ['live music', 'band', 'concert'],
  'shows': ['show', 'performance', 'entertainment'],
  'movie': ['movie', 'cinema', 'film'],
  'theater': ['theater', 'play', 'drama'],
  'concert': ['concert', 'music', 'performance'],
  'comedy': ['comedy', 'stand-up', 'humor'],
  'festival': ['festival', 'celebration', 'event'],
  'sports-event': ['sports event', 'game', 'match'],
}

// Price level mapping - simplified (no longer using price tags)
export const TAG_TO_PRICE_LEVEL_MAP: Record<string, number> = {
  // Default price levels can be set by user preferences if needed
}

export interface TagSearchParams {
  placeTypes: string[]
  keywords: string[]
  priceLevel?: number
  timeOfDay?: string
  openNow?: boolean
}

export function mapTagsToSearchParams(tags: string[]): TagSearchParams {
  const result: TagSearchParams = {
    placeTypes: [],
    keywords: [],
  }

  for (const tag of tags) {
    // Map to place types
    if (TAG_TO_PLACE_TYPE_MAP[tag]) {
      result.placeTypes.push(...TAG_TO_PLACE_TYPE_MAP[tag])
    }

    // Map to keywords
    if (TAG_TO_KEYWORD_MAP[tag]) {
      result.keywords.push(...TAG_TO_KEYWORD_MAP[tag])
    }

    // Map to price level
    if (TAG_TO_PRICE_LEVEL_MAP[tag]) {
      result.priceLevel = TAG_TO_PRICE_LEVEL_MAP[tag]
    }

    // Time of day mapping removed - no longer using time tags
  }

  // Remove duplicates
  result.placeTypes = [...new Set(result.placeTypes)]
  result.keywords = [...new Set(result.keywords)]

  // Set openNow based on time preference
  if (result.timeOfDay) {
    result.openNow = true
  }

  return result
}

export function buildSearchQuery(params: TagSearchParams): string {
  const queryParts: string[] = []

  // Add keywords
  if (params.keywords.length > 0) {
    queryParts.push(params.keywords.join(' '))
  }

  // Add place type if no keywords
  if (params.keywords.length === 0 && params.placeTypes.length > 0) {
    queryParts.push(params.placeTypes[0])
  }

  return queryParts.join(' ')
}

export function getSearchFilters(params: TagSearchParams) {
  return {
    types: params.placeTypes,
    priceLevel: params.priceLevel,
    openNow: params.openNow,
  }
}

// Helper function to get recommended search parameters for common scenarios
export function getRecommendedSearchParams(scenario: string): TagSearchParams {
  switch (scenario) {
    case 'dinner-date':
      return mapTagsToSearchParams(['restaurant', 'romantic'])
    case 'coffee-chat':
      return mapTagsToSearchParams(['restaurant', 'casual', 'quiet'])
    case 'fun-activity':
      return mapTagsToSearchParams(['activity', 'lively'])
    case 'cultural-experience':
      return mapTagsToSearchParams(['activity', 'quiet'])
    case 'outdoor-adventure':
      return mapTagsToSearchParams(['outdoor'])
    default:
      return { placeTypes: [], keywords: [] }
  }
}

export function prioritizeSearchResults(results: any[], tags: string[]): any[] {
  // Simple scoring system based on tag relevance
  return results.map(result => ({
    ...result,
    relevanceScore: calculateRelevanceScore(result, tags)
  })).sort((a, b) => b.relevanceScore - a.relevanceScore)
}

function calculateRelevanceScore(result: any, tags: string[]): number {
  let score = 0
  
  // Check name and types for keywords
  const searchableText = `${result.name} ${result.types?.join(' ')} ${result.vicinity}`.toLowerCase()
  
  for (const tag of tags) {
    const keywords = TAG_TO_KEYWORD_MAP[tag] || [tag]
    for (const keyword of keywords) {
      if (searchableText.includes(keyword.toLowerCase())) {
        score += 1
      }
    }
  }

  // Bonus for highly rated places
  if (result.rating && result.rating >= 4.0) {
    score += 1
  }

  // Bonus for rating
  if (result.rating) {
    score += result.rating * 0.5
  }

  return score
}

// Tag to Google Places API search parameter mapping
export interface SearchMapping {
  query: string
  placeTypes: string[]
  keywords: string[]
  relevanceScore: number // 1-10, higher is better
}

// Map venue type tags to search parameters
export const VENUE_TYPE_MAPPING: Record<string, SearchMapping> = {
  restaurant: {
    query: 'restaurants',
    placeTypes: ['restaurant', 'meal_takeaway', 'meal_delivery'],
    keywords: ['restaurant', 'dining', 'food'],
    relevanceScore: 10
  },
  activity: {
    query: 'attractions',
    placeTypes: ['tourist_attraction', 'amusement_park', 'aquarium', 'art_gallery', 'museum'],
    keywords: ['attraction', 'activity', 'entertainment'],
    relevanceScore: 10
  },
  outdoor: {
    query: 'parks',
    placeTypes: ['park', 'campground', 'rv_park', 'zoo'],
    keywords: ['park', 'outdoor', 'nature', 'hiking'],
    relevanceScore: 10
  },
  event: {
    query: 'events',
    placeTypes: ['event_venue', 'night_club', 'movie_theater', 'casino'],
    keywords: ['event', 'venue', 'entertainment', 'show'],
    relevanceScore: 10
  }
}

// Map restaurant sub-tags to search refinements
export const RESTAURANT_SUB_MAPPING: Record<string, SearchMapping> = {
  dinner: {
    query: 'dinner restaurants',
    placeTypes: ['restaurant'],
    keywords: ['dinner', 'evening', 'fine dining'],
    relevanceScore: 8
  },
  lunch: {
    query: 'lunch restaurants',
    placeTypes: ['restaurant', 'meal_takeaway'],
    keywords: ['lunch', 'casual dining'],
    relevanceScore: 8
  },
  brunch: {
    query: 'brunch restaurants',
    placeTypes: ['restaurant'],
    keywords: ['brunch', 'breakfast', 'weekend'],
    relevanceScore: 7
  },
  cafe: {
    query: 'cafes',
    placeTypes: ['cafe'],
    keywords: ['cafe', 'coffee', 'casual'],
    relevanceScore: 9
  },
  bar: {
    query: 'bars',
    placeTypes: ['bar', 'night_club'],
    keywords: ['bar', 'drinks', 'nightlife'],
    relevanceScore: 8
  },
  'fast-food': {
    query: 'fast food',
    placeTypes: ['meal_takeaway', 'meal_delivery'],
    keywords: ['fast food', 'quick', 'takeaway'],
    relevanceScore: 6
  },
  'fine-dining': {
    query: 'fine dining restaurants',
    placeTypes: ['restaurant'],
    keywords: ['fine dining', 'upscale', 'elegant'],
    relevanceScore: 9
  },
  takeout: {
    query: 'takeout restaurants',
    placeTypes: ['meal_takeaway', 'meal_delivery'],
    keywords: ['takeout', 'delivery', 'pickup'],
    relevanceScore: 7
  }
}

// Map activity sub-tags to search refinements
export const ACTIVITY_SUB_MAPPING: Record<string, SearchMapping> = {
  sports: {
    query: 'sports facilities',
    placeTypes: ['stadium', 'gym'],
    keywords: ['sports', 'athletic', 'fitness'],
    relevanceScore: 8
  },
  arcade: {
    query: 'arcade',
    placeTypes: ['amusement_park'],
    keywords: ['arcade', 'games', 'entertainment'],
    relevanceScore: 7
  },
  'mini-golf': {
    query: 'mini golf',
    placeTypes: ['tourist_attraction'],
    keywords: ['mini golf', 'putt putt', 'family fun'],
    relevanceScore: 7
  },
  bowling: {
    query: 'bowling',
    placeTypes: ['bowling_alley'],
    keywords: ['bowling', 'lanes', 'recreation'],
    relevanceScore: 8
  },
  museum: {
    query: 'museums',
    placeTypes: ['museum'],
    keywords: ['museum', 'art', 'history', 'culture'],
    relevanceScore: 9
  },
  shopping: {
    query: 'shopping',
    placeTypes: ['shopping_mall', 'store'],
    keywords: ['shopping', 'mall', 'retail'],
    relevanceScore: 8
  },
  gym: {
    query: 'gym',
    placeTypes: ['gym'],
    keywords: ['gym', 'fitness', 'workout'],
    relevanceScore: 7
  },
  spa: {
    query: 'spa',
    placeTypes: ['spa'],
    keywords: ['spa', 'wellness', 'relaxation'],
    relevanceScore: 8
  }
}

// Map outdoor sub-tags to search refinements
export const OUTDOOR_SUB_MAPPING: Record<string, SearchMapping> = {
  park: {
    query: 'parks',
    placeTypes: ['park'],
    keywords: ['park', 'recreation', 'green space'],
    relevanceScore: 10
  },
  hike: {
    query: 'hiking trails',
    placeTypes: ['park', 'campground'],
    keywords: ['hiking', 'trail', 'nature walk'],
    relevanceScore: 9
  },
  scenic: {
    query: 'scenic viewpoints',
    placeTypes: ['tourist_attraction', 'park'],
    keywords: ['scenic', 'viewpoint', 'overlook'],
    relevanceScore: 8
  },
  'national-park': {
    query: 'national parks',
    placeTypes: ['park'],
    keywords: ['national park', 'protected area'],
    relevanceScore: 10
  },
  beach: {
    query: 'beaches',
    placeTypes: ['park'],
    keywords: ['beach', 'waterfront', 'swimming'],
    relevanceScore: 9
  },
  lake: {
    query: 'lakes',
    placeTypes: ['park'],
    keywords: ['lake', 'water', 'fishing'],
    relevanceScore: 8
  },
  trail: {
    query: 'trails',
    placeTypes: ['park'],
    keywords: ['trail', 'walking', 'biking'],
    relevanceScore: 9
  },
  garden: {
    query: 'gardens',
    placeTypes: ['park'],
    keywords: ['garden', 'botanical', 'flowers'],
    relevanceScore: 8
  }
}

// Map event sub-tags to search refinements
export const EVENT_SUB_MAPPING: Record<string, SearchMapping> = {
  'live-music': {
    query: 'live music venues',
    placeTypes: ['night_club', 'event_venue'],
    keywords: ['live music', 'concert', 'band'],
    relevanceScore: 9
  },
  shows: {
    query: 'show venues',
    placeTypes: ['event_venue', 'movie_theater'],
    keywords: ['show', 'performance', 'entertainment'],
    relevanceScore: 8
  },
  movie: {
    query: 'movie theaters',
    placeTypes: ['movie_theater'],
    keywords: ['movie', 'cinema', 'film'],
    relevanceScore: 9
  },
  theater: {
    query: 'theaters',
    placeTypes: ['event_venue'],
    keywords: ['theater', 'stage', 'drama'],
    relevanceScore: 9
  },
  concert: {
    query: 'concert venues',
    placeTypes: ['event_venue', 'night_club'],
    keywords: ['concert', 'music venue', 'performance'],
    relevanceScore: 9
  },
  comedy: {
    query: 'comedy clubs',
    placeTypes: ['night_club', 'event_venue'],
    keywords: ['comedy', 'stand up', 'humor'],
    relevanceScore: 8
  },
  festival: {
    query: 'festival venues',
    placeTypes: ['event_venue', 'park'],
    keywords: ['festival', 'outdoor event', 'celebration'],
    relevanceScore: 7
  },
  'sports-event': {
    query: 'sports venues',
    placeTypes: ['stadium'],
    keywords: ['sports venue', 'stadium', 'arena'],
    relevanceScore: 8
  }
}

// Combine all mappings for easy lookup
export const ALL_TAG_MAPPINGS = {
  ...VENUE_TYPE_MAPPING,
  ...RESTAURANT_SUB_MAPPING,
  ...ACTIVITY_SUB_MAPPING,
  ...OUTDOOR_SUB_MAPPING,
  ...EVENT_SUB_MAPPING
}

// Function to convert tags to search parameters
export function tagsToSearchParams(tags: string[], city: string) {
  if (tags.length === 0) {
    return null
  }

  // Get mappings for all tags
  const mappings = tags.map(tag => ALL_TAG_MAPPINGS[tag]).filter(Boolean)
  
  if (mappings.length === 0) {
    return null
  }

  // Combine search terms and keywords
  const queries = mappings.map(m => m.query)
  const keywords = mappings.flatMap(m => m.keywords)
  const placeTypes = [...new Set(mappings.flatMap(m => m.placeTypes))]
  
  // Create primary search query
  const primaryQuery = queries[0] // Use the first (most relevant) query
  const searchQuery = `${primaryQuery} in ${city}`
  
  // Calculate combined relevance score
  const totalRelevance = mappings.reduce((sum, m) => sum + m.relevanceScore, 0)
  const avgRelevance = totalRelevance / mappings.length

  return {
    query: searchQuery,
    placeTypes,
    keywords,
    relevanceScore: avgRelevance,
    city
  }
} 