import { getUserPreferences } from "@/app/actions/user-preferences"
import { scorePlace } from "@/lib/user-preferences"
import { type PlaceResult, type SearchResults } from "@/lib/search-utils"

export interface RecommendationRequest {
  city: string
  placeId?: string
  userId: string
  maxResults?: number
  excludeIds?: string[]
}

export interface RecommendationResult {
  restaurants: PlaceResult[]
  activities: PlaceResult[]
  drinks: PlaceResult[]
  outdoors: PlaceResult[]
}

export async function getPersonalizedRecommendations({
  city,
  placeId,
  userId,
  maxResults = 5,
  excludeIds = []
}: RecommendationRequest): Promise<RecommendationResult> {
  try {
    // Get user preferences
    const preferences = await getUserPreferences(userId)
    
    if (!preferences) {
      throw new Error("User preferences not found")
    }

    // Build search filters based on preferences
    const searchFilters = {
      restaurants: preferences.interests?.includes('restaurants') || 
                  Object.values(preferences.dining_preferences || {}).some(Boolean),
      activities: preferences.interests?.includes('activities') || 
                 Object.values(preferences.activity_preferences || {}).some(Boolean),
      drinks: preferences.interests?.includes('drinks') || 
              preferences.interests?.includes('nightlife') ||
              (preferences.dining_preferences?.cocktail_bars || 
               preferences.dining_preferences?.wine_bars || 
               preferences.dining_preferences?.breweries),
      outdoors: preferences.interests?.includes('outdoor') || 
                preferences.interests?.includes('nature') ||
                preferences.activity_preferences?.outdoor
    }

    // Use user's default price range if they have one
    const priceRange = preferences.default_price_range || 0

    // Make the search request
    const response = await fetch("/api/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        city,
        placeId,
        filters: searchFilters,
        priceRange,
        maxResults: maxResults * 3 // Get more results to score and filter
      }),
    })

    if (!response.ok) {
      throw new Error(`Search failed with status: ${response.status}`)
    }

    const searchResults: SearchResults = await response.json()

    // Score and filter results based on preferences
    const scoreAndFilterResults = (places: PlaceResult[]): PlaceResult[] => {
      return places
        .filter(place => !excludeIds.includes(place.id))
        .map(place => ({
          ...place,
          preferenceScore: scorePlace(place, preferences)
        }))
        .sort((a, b) => (b.preferenceScore || 0) - (a.preferenceScore || 0))
        .slice(0, maxResults)
    }

    // Convert single results to arrays and score them
    const result: RecommendationResult = {
      restaurants: searchResults.restaurant ? 
        scoreAndFilterResults([searchResults.restaurant]) : [],
      activities: searchResults.activity ? 
        scoreAndFilterResults([searchResults.activity]) : [],
      drinks: searchResults.drink ? 
        scoreAndFilterResults([searchResults.drink]) : [],
      outdoors: searchResults.outdoor ? 
        scoreAndFilterResults([searchResults.outdoor]) : []
    }

    return result

  } catch (error) {
    console.error("Error getting personalized recommendations:", error)
    
    // Return empty results on error
    return {
      restaurants: [],
      activities: [],
      drinks: [],
      outdoors: []
    }
  }
}

export async function getRandomRecommendation({
  city,
  placeId,
  userId,
  category,
  excludeIds = []
}: RecommendationRequest & { category: 'restaurant' | 'activity' | 'drink' | 'outdoor' }): Promise<PlaceResult | null> {
  try {
    const preferences = await getUserPreferences(userId)
    const priceRange = preferences?.default_price_range || 0

    // Create filters for just this category
    const filters = {
      restaurants: category === 'restaurant',
      activities: category === 'activity', 
      drinks: category === 'drink',
      outdoors: category === 'outdoor'
    }

    const response = await fetch("/api/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        city,
        placeId,
        filters,
        priceRange,
        maxResults: 10 // Get multiple options to randomize from
      }),
    })

    if (!response.ok) {
      throw new Error(`Search failed with status: ${response.status}`)
    }

    const searchResults: SearchResults = await response.json()
    
    // Get the result for this category
    let categoryResult: PlaceResult | undefined
    switch (category) {
      case 'restaurant':
        categoryResult = searchResults.restaurant
        break
      case 'activity':
        categoryResult = searchResults.activity
        break
      case 'drink':
        categoryResult = searchResults.drink
        break
      case 'outdoor':
        categoryResult = searchResults.outdoor
        break
    }

    // Filter out excluded IDs
    if (categoryResult && !excludeIds.includes(categoryResult.id)) {
      return categoryResult
    }

    return null

  } catch (error) {
    console.error("Error getting random recommendation:", error)
    return null
  }
}

export async function getComplementaryVenues({
  anchorVenue,
  city,
  userId,
  maxResults = 3
}: {
  anchorVenue: PlaceResult
  city: string
  userId: string
  maxResults?: number
}): Promise<Partial<RecommendationResult>> {
  try {
    const preferences = await getUserPreferences(userId)
    
    if (!preferences) {
      return {}
    }

    // Determine what types of venues would complement the anchor venue
    let suggestedCategories: string[] = []
    
    switch (anchorVenue.category) {
      case 'restaurant':
        // After dining, suggest activities or drinks
        if (preferences.interests?.includes('activities') || Object.values(preferences.activity_preferences || {}).some(Boolean)) {
          suggestedCategories.push('activities')
        }
        if (preferences.interests?.includes('drinks') || preferences.interests?.includes('nightlife')) {
          suggestedCategories.push('drinks')
        }
        break
      case 'activity':
        // After activities, suggest food or drinks
        suggestedCategories.push('restaurants', 'drinks')
        break
      case 'drink':
        // Before/after drinks, suggest food or activities
        suggestedCategories.push('restaurants', 'activities')
        break
      case 'outdoor':
        // After outdoor activities, suggest food
        suggestedCategories.push('restaurants')
        if (preferences.interests?.includes('drinks')) {
          suggestedCategories.push('drinks')
        }
        break
    }

    // Get recommendations for each suggested category
    const complementaryVenues: Partial<RecommendationResult> = {}
    
    for (const category of suggestedCategories) {
      const result = await getRandomRecommendation({
        city,
        userId,
        category: category as 'restaurant' | 'activity' | 'drink' | 'outdoor',
        excludeIds: [anchorVenue.id]
      })
      
      if (result) {
        switch (category) {
          case 'restaurants':
            complementaryVenues.restaurants = [result]
            break
          case 'activities':
            complementaryVenues.activities = [result]
            break
          case 'drinks':
            complementaryVenues.drinks = [result]
            break
          case 'outdoors':
            complementaryVenues.outdoors = [result]
            break
        }
      }
    }

    return complementaryVenues

  } catch (error) {
    console.error("Error getting complementary venues:", error)
    return {}
  }
} 