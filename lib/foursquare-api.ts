import { sanitizeInput } from "./api-utils"
import { isTestMode } from "./app-config"
import { type PlaceResult } from "./search-utils"

// Foursquare API types
interface FoursquareVenue {
  fsq_id: string
  name: string
  location: {
    address?: string
    locality?: string
    region?: string
    formatted_address?: string
    country?: string
  }
  categories: Array<{
    id: string
    name: string
    short_name: string
    plural_name: string
    icon: {
      prefix: string
      suffix: string
    }
  }>
  rating?: number
  price?: number
  photos?: Array<{
    id: string
    prefix: string
    suffix: string
    width: number
    height: number
  }>
  hours?: {
    open_now?: boolean
    regular?: Array<{
      day: number
      open: string
      close: string
    }>
  }
  stats?: {
    total_photos: number
    total_ratings: number
    total_tips: number
  }
  popularity?: number
  distance?: number
}

interface FoursquareSearchResponse {
  results: FoursquareVenue[]
  context: {
    geo_bounds: {
      circle: {
        center: {
          latitude: number
          longitude: number
        }
        radius: number
      }
    }
  }
}

// Convert Foursquare venue to our PlaceResult format
function convertFoursquareToPlaceResult(venue: FoursquareVenue): PlaceResult {
  // Build address from Foursquare location data
  let address = venue.location.formatted_address || ''
  if (!address && venue.location.address) {
    const parts = [
      venue.location.address,
      venue.location.locality,
      venue.location.region
    ].filter(Boolean)
    address = parts.join(', ')
  }

  // Determine primary category
  const primaryCategory = venue.categories?.[0]
  const isRestaurant = primaryCategory?.name?.toLowerCase().includes('restaurant') || 
                      primaryCategory?.name?.toLowerCase().includes('food') ||
                      primaryCategory?.name?.toLowerCase().includes('dining') ||
                      primaryCategory?.name?.toLowerCase().includes('cafe')

  // Get photo URL
  let photoUrl = ''
  if (venue.photos && venue.photos.length > 0) {
    const photo = venue.photos[0]
    photoUrl = `${photo.prefix}300x300${photo.suffix}`
  } else {
    // Fallback restaurant images
    const restaurantImages = [
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=600&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=600&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?q=80&w=600&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1456306301233-ac56801b3b89?q=80&w=600&auto=format&fit=crop",
    ]
    photoUrl = restaurantImages[Math.floor(Math.random() * restaurantImages.length)]
  }

  return {
    id: `foursquare-${venue.fsq_id}`,
    name: venue.name,
    address,
    rating: venue.rating || (4 + Math.random() * 1), // Foursquare uses 0-10, convert to 4-5 range
    price: venue.price || Math.floor(Math.random() * 3) + 1, // 1-4 price level
    category: 'restaurant',
    photoUrl,
    openNow: venue.hours?.open_now ?? true,
    placeId: venue.fsq_id,
  }
}

// Main function to search Foursquare restaurants
export async function fetchFoursquareRestaurants(
  city: string,
  limit = 50,
  offset = 0,
  excludeIds: string[] = [],
  searchTerm?: string,
  lat?: number,
  lng?: number
): Promise<PlaceResult[]> {
  try {
    const apiKey = process.env.FOURSQUARE_API_KEY
    
    if (!apiKey) {
      console.warn("Foursquare API key not configured, skipping Foursquare restaurants")
      return []
    }

    const sanitizedCity = sanitizeInput(city)
    
    console.log(`Fetching restaurants from Foursquare for ${sanitizedCity} (limit: ${limit}, offset: ${offset})`)

    // Build the search query
    let query = 'restaurant'
    if (searchTerm && searchTerm.trim()) {
      query = `${searchTerm} restaurant`
    }

    // Build URL parameters for Foursquare API v3
    const params = new URLSearchParams({
      query,
      near: sanitizedCity,
      categories: '13000', // Food and Beverage category ID in Foursquare
      limit: Math.min(limit, 50).toString(), // Foursquare max is 50 per request
      sort: 'POPULARITY', // Can be POPULARITY, DISTANCE, or RATING
      fields: 'fsq_id,name,location,categories,rating,price,photos,hours,stats,popularity,distance'
    })

    // Add coordinates if available for more precise search
    if (lat && lng) {
      params.set('ll', `${lat},${lng}`)
      params.delete('near') // Use coordinates instead of city name
    }

    const url = `https://api.foursquare.com/v3/places/search?${params.toString()}`
    
    console.log(`Foursquare API URL: ${url}`)

    // Ensure proper Bearer format for Foursquare API v3
    const authHeader = apiKey.startsWith('Bearer ') ? apiKey : `Bearer ${apiKey}`
    
    const headers = {
      'Authorization': authHeader,
      'Accept': 'application/json',
    }

    const response = await fetch(url, {
      headers,
      cache: 'no-store' // Restaurant data changes frequently
    })

    if (!response.ok) {
      let errorBody = ''
      try { 
        errorBody = await response.text() 
      } catch {}
      console.error(`Foursquare API error: ${response.status} ${response.statusText} ${errorBody ? '- ' + errorBody : ''}`)
      return []
    }

    const data: FoursquareSearchResponse = await response.json()
    
    if (!data.results || data.results.length === 0) {
      console.log(`No Foursquare restaurants found for ${sanitizedCity}`)
      return []
    }

    console.log(`Found ${data.results.length} Foursquare restaurants in ${sanitizedCity}`)

    // Filter out excluded venues and convert to our format
    const restaurants: PlaceResult[] = data.results
      .filter(venue => !excludeIds.includes(`foursquare-${venue.fsq_id}`))
      .map(venue => convertFoursquareToPlaceResult(venue))

    console.log(`Returning ${restaurants.length} Foursquare restaurants after filtering`)
    return restaurants

  } catch (error) {
    console.error('Error fetching Foursquare restaurants:', error)
    return []
  }
}

// Function to search with different strategies for variety
export async function fetchFoursquareRestaurantsWithStrategies(
  city: string,
  totalLimit = 100,
  excludeIds: string[] = [],
  lat?: number,
  lng?: number
): Promise<PlaceResult[]> {
  const allRestaurants: PlaceResult[] = []
  const seenIds = new Set<string>()

  // Multiple search strategies for variety
  const strategies = [
    { query: '', sort: 'POPULARITY' }, // General popular restaurants
    { query: '', sort: 'RATING' },    // Highly rated restaurants  
    { query: 'pizza', sort: 'POPULARITY' },
    { query: 'burger', sort: 'POPULARITY' },
    { query: 'asian', sort: 'POPULARITY' },
    { query: 'mexican', sort: 'POPULARITY' },
    { query: 'italian', sort: 'POPULARITY' },
    { query: 'breakfast', sort: 'POPULARITY' },
  ]

  const perStrategy = Math.ceil(totalLimit / strategies.length)

  for (const strategy of strategies) {
    try {
      console.log(`🍽️ Foursquare strategy: ${strategy.query || 'general'} (${strategy.sort})`)
      
      const restaurants = await fetchFoursquareRestaurantsWithSort(
        city,
        perStrategy,
        0, // Always start from 0 for each strategy
        excludeIds,
        strategy.query,
        strategy.sort as 'POPULARITY' | 'RATING' | 'DISTANCE',
        lat,
        lng
      )

      // Filter out duplicates
      const newRestaurants = restaurants.filter(restaurant => {
        if (seenIds.has(restaurant.id)) return false
        seenIds.add(restaurant.id)
        return true
      })

      allRestaurants.push(...newRestaurants)
      console.log(`🍽️ Foursquare ${strategy.query || 'general'} contributed ${newRestaurants.length} restaurants`)

      // Break if we have enough
      if (allRestaurants.length >= totalLimit) break

    } catch (error) {
      console.error(`Foursquare strategy ${strategy.query || 'general'} failed:`, error)
    }
  }

  // Shuffle for variety
  const shuffled = allRestaurants.sort(() => Math.random() - 0.5)
  
  console.log(`🍽️ Total Foursquare restaurants: ${shuffled.length}`)
  return shuffled.slice(0, totalLimit)
}

// Helper function with sort parameter
async function fetchFoursquareRestaurantsWithSort(
  city: string,
  limit: number,
  offset: number,
  excludeIds: string[],
  searchTerm?: string,
  sort: 'POPULARITY' | 'RATING' | 'DISTANCE' = 'POPULARITY',
  lat?: number,
  lng?: number
): Promise<PlaceResult[]> {
  try {
    const apiKey = process.env.FOURSQUARE_API_KEY
    
    if (!apiKey) {
      console.warn(`Foursquare API key not configured, skipping ${sort} sort`)
      return []
    }

    const sanitizedCity = sanitizeInput(city)
    
    // Build the search query
    let query = 'restaurant'
    if (searchTerm && searchTerm.trim()) {
      query = `${searchTerm} restaurant`
    }

    // Build URL parameters with sort
    const params = new URLSearchParams({
      query,
      near: sanitizedCity,
      categories: '13000', // Food and Beverage category ID in Foursquare
      limit: Math.min(limit, 50).toString(),
      sort: sort,
      fields: 'fsq_id,name,location,categories,rating,price,photos,hours,stats,popularity,distance'
    })

    // Add coordinates if available for more precise search
    if (lat && lng) {
      params.set('ll', `${lat},${lng}`)
      params.delete('near')
    }

    const url = `https://api.foursquare.com/v3/places/search?${params.toString()}`
    
    console.log(`Foursquare API URL (${sort}): ${url}`)

    // Ensure proper Bearer format for Foursquare API v3
    const authHeader = apiKey.startsWith('Bearer ') ? apiKey : `Bearer ${apiKey}`
    
    const headers = {
      'Authorization': authHeader,
      'Accept': 'application/json',
    }

    const response = await fetch(url, {
      headers,
      cache: 'no-store'
    })

    if (!response.ok) {
      let errorBody = ''
      try { 
        errorBody = await response.text() 
      } catch {}
      console.error(`Foursquare API error (${sort}): ${response.status} ${response.statusText} ${errorBody ? '- ' + errorBody : ''}`)
      return []
    }

    const data: FoursquareSearchResponse = await response.json()
    
    if (!data.results || data.results.length === 0) {
      console.log(`No Foursquare restaurants found for ${sanitizedCity} with sort ${sort}`)
      return []
    }

    console.log(`Found ${data.results.length} Foursquare restaurants in ${sanitizedCity} (${sort})`)

    // Filter out excluded venues and convert to our format
    const restaurants: PlaceResult[] = data.results
      .filter(venue => !excludeIds.includes(`foursquare-${venue.fsq_id}`))
      .map(venue => convertFoursquareToPlaceResult(venue))

    console.log(`Returning ${restaurants.length} Foursquare restaurants after filtering (${sort})`)
    return restaurants

  } catch (error) {
    console.error(`Error fetching Foursquare restaurants with sort ${sort}:`, error)
    return []
  }
}
