import { sanitizeInput } from "./api-utils"
import { isTestMode } from "./app-config"
import { type PlaceResult } from "./search-utils"

// Types for Yelp API responses
export interface YelpBusiness {
  id: string
  alias: string
  name: string
  image_url: string
  is_closed: boolean
  url: string
  review_count: number
  categories: Array<{
    alias: string
    title: string
  }>
  rating: number
  coordinates: {
    latitude: number
    longitude: number
  }
  transactions: string[]
  price?: string
  location: {
    address1: string
    address2?: string
    address3?: string
    city: string
    zip_code: string
    country: string
    state: string
    display_address: string[]
  }
  phone: string
  display_phone: string
  distance: number
  photos?: string[]
}

export interface YelpSearchResponse {
  businesses: YelpBusiness[]
  total: number
  region: {
    center: {
      longitude: number
      latitude: number
    }
  }
}

export interface YelpBusinessDetails extends YelpBusiness {
  photos: string[]
  hours?: Array<{
    open: Array<{
      is_overnight: boolean
      start: string
      end: string
      day: number
    }>
    hours_type: string
    is_open_now: boolean
  }>
  special_hours?: Array<{
    date: string
    is_closed?: boolean
    start?: string
    end?: string
    is_overnight?: boolean
  }>
}

// Fetch Yelp activities (non-restaurant venues) via category aliases
export async function fetchYelpActivities(
  city: string,
  limit = 20,
  offset = 0,
  excludeIds: string[] = [],
  searchTerm?: string
): Promise<PlaceResult[]> {
  try {
    // Return mock data when in test mode
    if (isTestMode()) {
      const mocks: PlaceResult[] = Array.from({ length: limit }, (_, i) => ({
        id: `yelp-mock-activity-${offset + i}`,
        name: `Mock Activity ${offset + i + 1}`,
        address: `${sanitizeInput(city)} Activity Address ${i + 1}`,
        rating: 4.3,
        price: 2,
        category: 'activity',
        photoUrl: `https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=600&auto=format&fit=crop`,
        openNow: true,
        placeId: `mock-activity-${offset + i}`,
      }))
      return mocks.filter(m => !excludeIds.includes(m.id))
    }
    const apiKey = process.env.YELP_API_KEY
    if (!apiKey) {
      console.warn("Yelp API key not configured, skipping Yelp activities")
      return []
    }

    const sanitizedCity = sanitizeInput(city)
    const maxPerRequest = 50
    const maxTotalResults = 1000
    const totalRequested = Math.min(limit, maxTotalResults - offset)
    const numRequests = Math.ceil(totalRequested / maxPerRequest)

    console.log(`Fetching activities from Yelp for ${sanitizedCity} (total requested: ${totalRequested}, requests needed: ${numRequests})`)

    const allActivities: PlaceResult[] = []
    const seenIds = new Set<string>()

    // Broad activity-focused categories (non-restaurant)
    const activityCategories = [
      'active', 'arts', 'museums', 'theater', 'escapegames', 'arcades', 'bowling',
      'axethrowing', 'paintandsip', 'landmarks', 'cinema', 'comedyclubs'
    ].join(',')

    for (let i = 0; i < numRequests; i++) {
      const currentOffset = offset + (i * maxPerRequest)
      const currentLimit = Math.min(maxPerRequest, totalRequested - (i * maxPerRequest))
      if (currentLimit <= 0) break

      const url = new URL('https://api.yelp.com/v3/businesses/search')
      url.searchParams.append('location', sanitizedCity)
      url.searchParams.append('categories', activityCategories)
      url.searchParams.append('limit', currentLimit.toString())
      url.searchParams.append('offset', currentOffset.toString())
      if (searchTerm && searchTerm.trim()) {
        url.searchParams.append('term', searchTerm.trim())
      }
      url.searchParams.append('sort_by', 'best_match')
      url.searchParams.append('radius', '40000')

      console.log(`Yelp activities request ${i + 1}/${numRequests}: limit=${currentLimit}, offset=${currentOffset}`)

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store'
      })

      if (!response.ok) {
        console.error(`Yelp activities API error on request ${i + 1}: ${response.status} ${response.statusText}`)
        continue
      }

      const data: YelpSearchResponse = await response.json()
      if (!data.businesses || data.businesses.length === 0) {
        console.log(`No more Yelp activities found for ${sanitizedCity} at offset ${currentOffset}`)
        break
      }

      const newActivities: PlaceResult[] = data.businesses
        .filter(business => !excludeIds.includes(`yelp-${business.id}`) && !seenIds.has(business.id))
        .map(business => {
          seenIds.add(business.id)
          return convertYelpBusinessToPlaceResult(business, 'activity')
        })

      allActivities.push(...newActivities)

      if (data.businesses.length < currentLimit) break
      if (i < numRequests - 1) await new Promise(r => setTimeout(r, 100))
    }

    console.log(`Total Yelp activities found: ${allActivities.length}`)
    return allActivities
  } catch (error) {
    console.error('Error fetching Yelp activities:', error)
    return []
  }
}

// Main function to search Yelp restaurants
export async function fetchYelpRestaurants(
  city: string,
  limit = 20,
  offset = 0,
  excludeIds: string[] = [],
  searchTerm?: string
): Promise<PlaceResult[]> {
  try {
    // Return mock data when in test mode
    if (isTestMode()) {
      const mocks: PlaceResult[] = Array.from({ length: limit }, (_, i) => ({
        id: `yelp-mock-restaurant-${offset + i}`,
        name: `Mock Restaurant ${offset + i + 1}`,
        address: `${sanitizeInput(city)} Restaurant Address ${i + 1}`,
        rating: 4.5,
        price: 2,
        category: 'restaurant',
        photoUrl: `https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=600&auto=format&fit=crop`,
        openNow: true,
        placeId: `mock-restaurant-${offset + i}`,
      }))
      return mocks.filter(m => !excludeIds.includes(m.id))
    }
    const apiKey = process.env.YELP_API_KEY
    
    if (!apiKey) {
      console.warn("Yelp API key not configured, skipping Yelp restaurants")
      return []
    }

    const sanitizedCity = sanitizeInput(city)
    
    // Yelp has a maximum of 50 results per request and 1000 total results
    const maxPerRequest = 50
    const maxTotalResults = 1000
    
    // Calculate how many requests we need to make
    const totalRequested = Math.min(limit, maxTotalResults - offset)
    const numRequests = Math.ceil(totalRequested / maxPerRequest)
    
    console.log(`Fetching restaurants from Yelp for ${sanitizedCity} (total requested: ${totalRequested}, requests needed: ${numRequests})`)

    const allRestaurants: PlaceResult[] = []
    const seenIds = new Set<string>()

    // Make multiple requests to get all the results we need
    for (let i = 0; i < numRequests; i++) {
      const currentOffset = offset + (i * maxPerRequest)
      const currentLimit = Math.min(maxPerRequest, totalRequested - (i * maxPerRequest))
      
      if (currentLimit <= 0) break
      
      // Yelp Fusion API search endpoint
      const url = new URL('https://api.yelp.com/v3/businesses/search')
      url.searchParams.append('location', sanitizedCity)
      url.searchParams.append('categories', 'restaurants,food,bars')
      url.searchParams.append('limit', currentLimit.toString())
      url.searchParams.append('offset', currentOffset.toString())
      
      // Add search term if provided
      if (searchTerm && searchTerm.trim()) {
        url.searchParams.append('term', searchTerm.trim())
      }
      
      // Use different sorting strategies to get more variety
      // Yelp supports: best_match, rating, review_count, distance
      const sortStrategies = ['best_match', 'rating', 'review_count', 'distance']
      const sortIndex = Math.floor(offset / 50) % sortStrategies.length // Change sort every 50 results
      const sortBy = sortStrategies[sortIndex]
      url.searchParams.append('sort_by', sortBy)
      
      url.searchParams.append('radius', '40000') // 25 miles in meters
      
      console.log(`Yelp request ${i + 1}/${numRequests}: limit=${currentLimit}, offset=${currentOffset}, sort_by=${sortBy}`)

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store' // Restaurant data changes frequently
      })

      if (!response.ok) {
        let body = ''
        try { body = await response.text() } catch {}
        console.error(`Yelp API error on request ${i + 1}: ${response.status} ${response.statusText} ${body ? '- ' + body : ''}`)
        continue // Skip this request but continue with others
      }

      const data: YelpSearchResponse = await response.json()
      
      if (!data.businesses || data.businesses.length === 0) {
        console.log(`No more Yelp restaurants found for ${sanitizedCity} at offset ${currentOffset}`)
        break // No more results, stop paginating
      }

      console.log(`Found ${data.businesses.length} Yelp restaurants in request ${i + 1}`)

      // Filter out excluded businesses and duplicates, then convert to our format
      const newRestaurants: PlaceResult[] = data.businesses
        .filter(business => !excludeIds.includes(`yelp-${business.id}`) && !seenIds.has(business.id))
        .map(business => {
          seenIds.add(business.id)
          return convertYelpToPlaceResult(business)
        })

      allRestaurants.push(...newRestaurants)
      
      // If we got fewer results than requested, we've reached the end
      if (data.businesses.length < currentLimit) {
        console.log(`Reached end of Yelp results after ${i + 1} requests`)
        break
      }
      
      // Add a small delay between requests to be respectful to the API
      if (i < numRequests - 1) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    console.log(`Total Yelp restaurants found: ${allRestaurants.length}`)
    return allRestaurants

  } catch (error) {
    console.error('Error fetching Yelp restaurants:', error)
    return []
  }
}

// Function to get detailed business information including photos
export async function fetchYelpBusinessDetails(businessId: string): Promise<YelpBusinessDetails | null> {
  try {
    if (isTestMode()) {
      return {
        id: `mock-${businessId}`,
        alias: `mock-${businessId}`,
        name: `Mock Business ${businessId}`,
        image_url: '',
        is_closed: false,
        url: '',
        review_count: 120,
        categories: [{ alias: 'mock', title: 'Mock' }],
        rating: 4.4,
        coordinates: { latitude: 0, longitude: 0 },
        transactions: [],
        price: '$$',
        location: { address1: '123 Test', city: 'Test', zip_code: '00000', country: 'US', state: 'TS', display_address: ['123 Test', 'Test, TS'] },
        phone: '',
        display_phone: '',
        distance: 0,
        photos: [],
        hours: [{ open: [], hours_type: 'REGULAR', is_open_now: true }],
        special_hours: [],
      }
    }
    const apiKey = process.env.YELP_API_KEY
    
    if (!apiKey) {
      console.warn("Yelp API key not configured")
      return null
    }

    const response = await fetch(`https://api.yelp.com/v3/businesses/${businessId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store'
    })

    if (!response.ok) {
      console.error(`Yelp business details API error: ${response.status}`)
      return null
    }

    const business: YelpBusinessDetails = await response.json()
    return business

  } catch (error) {
    console.error('Error fetching Yelp business details:', error)
    return null
  }
}

// Function to search for restaurants near a specific coordinate
export async function fetchYelpRestaurantsNearby(
  latitude: number,
  longitude: number,
  limit = 20,
  radius = 5000, // meters
  excludeIds: string[] = []
): Promise<PlaceResult[]> {
  try {
    const apiKey = process.env.YELP_API_KEY
    
    if (!apiKey) {
      console.warn("Yelp API key not configured")
      return []
    }

    const url = new URL('https://api.yelp.com/v3/businesses/search')
    url.searchParams.append('latitude', latitude.toString())
    url.searchParams.append('longitude', longitude.toString())
    url.searchParams.append('categories', 'restaurants,food,bars')
    url.searchParams.append('limit', limit.toString())
    url.searchParams.append('radius', Math.min(radius, 40000).toString()) // Yelp max is 40km
    url.searchParams.append('sort_by', 'best_match')
    
    console.log(`Fetching nearby restaurants from Yelp at (${latitude}, ${longitude})`)

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store'
    })

    if (!response.ok) {
      console.error(`Yelp API error: ${response.status}`)
      return []
    }

    const data: YelpSearchResponse = await response.json()
    
    if (!data.businesses || data.businesses.length === 0) {
      console.log(`No nearby Yelp restaurants found`)
      return []
    }

    console.log(`Found ${data.businesses.length} nearby Yelp restaurants`)

    const restaurants: PlaceResult[] = data.businesses
      .filter(business => !excludeIds.includes(business.id))
      .map(business => convertYelpToPlaceResult(business))

    return restaurants

  } catch (error) {
    console.error('Error fetching nearby Yelp restaurants:', error)
    return []
  }
}

// Helper function to convert Yelp business to our PlaceResult format
function convertYelpToPlaceResult(business: YelpBusiness): PlaceResult {
  // Convert Yelp price ($, $$, $$$, $$$$) to our 1-4 scale
  let price = 2 // Default to moderate
  if (business.price) {
    price = business.price.length // $ = 1, $$ = 2, $$$ = 3, $$$$ = 4
  }

  // Build address from location
  const address = business.location.display_address.join(', ')

  // Determine if open now (if hours data is available)
  const openNow = !business.is_closed

  return {
    id: `yelp-${business.id}`,
    name: business.name,
    address,
    rating: business.rating,
    price,
    category: 'restaurant',
    photoUrl: business.image_url || undefined, // Only real images, no fallbacks
    openNow,
    placeId: business.id,
    // Additional Yelp-specific data we can store
    preferenceScore: business.rating * (business.review_count > 50 ? 1.1 : 1.0), // Boost well-reviewed places
  }
}

// Generic converter allowing category override
function convertYelpBusinessToPlaceResult(business: YelpBusiness, category: 'restaurant' | 'activity' | 'event'): PlaceResult {
  let price = 2
  if (business.price) {
    price = business.price.length
  }
  const address = business.location.display_address.join(', ')
  const openNow = !business.is_closed
  return {
    id: `yelp-${business.id}`,
    name: business.name,
    address,
    rating: business.rating,
    price,
    category,
    photoUrl: business.image_url || undefined,
    openNow,
    placeId: business.id,
    preferenceScore: business.rating * (business.review_count > 50 ? 1.1 : 1.0),
  }
}

// Function to enhance existing restaurants with Yelp data
export async function enhanceRestaurantsWithYelp(
  restaurants: PlaceResult[], 
  city: string
): Promise<PlaceResult[]> {
  try {
    // Get Yelp restaurants for this city
    const yelpRestaurants = await fetchYelpRestaurants(city, 20, 0, [])
    
    if (yelpRestaurants.length === 0) {
      return restaurants
    }

    // Create a map for quick lookup
    const yelpMap = new Map<string, PlaceResult>()
    yelpRestaurants.forEach(restaurant => {
      // Use fuzzy matching on name for enhancement
      const normalizedName = restaurant.name.toLowerCase().replace(/[^a-z0-9\s]/g, '')
      yelpMap.set(normalizedName, restaurant)
    })

    // Enhance existing restaurants with Yelp data where possible
    const enhancedRestaurants = restaurants.map(restaurant => {
      if (restaurant.category !== 'restaurant') return restaurant
      
      const normalizedName = restaurant.name.toLowerCase().replace(/[^a-z0-9\s]/g, '')
      const yelpMatch = yelpMap.get(normalizedName)
      
      if (yelpMatch && yelpMatch.photoUrl && !restaurant.photoUrl) {
        // Enhance with Yelp photo if we don't have one
        return {
          ...restaurant,
          photoUrl: yelpMatch.photoUrl,
          // Keep original rating and other data, just enhance photo
        }
      }
      
      return restaurant
    })

    // Add new Yelp restaurants that weren't in the original list
    const existingNames = new Set(
      restaurants
        .filter(r => r.category === 'restaurant')
        .map(r => r.name.toLowerCase().replace(/[^a-z0-9\s]/g, ''))
    )
    
    const newYelpRestaurants = yelpRestaurants.filter(restaurant => {
      const normalizedName = restaurant.name.toLowerCase().replace(/[^a-z0-9\s]/g, '')
      return !existingNames.has(normalizedName)
    })

    console.log(`Enhanced ${enhancedRestaurants.length} restaurants, added ${newYelpRestaurants.length} new Yelp restaurants`)
    
    // Combine enhanced restaurants with new Yelp restaurants
    return [...enhancedRestaurants, ...newYelpRestaurants.slice(0, 5)] // Limit new additions

  } catch (error) {
    console.error('Error enhancing restaurants with Yelp:', error)
    return restaurants
  }
}

// Function to get trending restaurants (highly rated with many reviews)
export async function fetchTrendingYelpRestaurants(
  city: string,
  limit = 10
): Promise<PlaceResult[]> {
  try {
    const apiKey = process.env.YELP_API_KEY
    
    if (!apiKey) {
      return []
    }

    const sanitizedCity = sanitizeInput(city)
    
    const url = new URL('https://api.yelp.com/v3/businesses/search')
    url.searchParams.append('location', sanitizedCity)
    url.searchParams.append('categories', 'restaurants')
    url.searchParams.append('limit', limit.toString())
    url.searchParams.append('sort_by', 'rating') // Sort by highest rated
    url.searchParams.append('radius', '25000') // 25km radius
    
    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store'
    })

    if (!response.ok) {
      return []
    }

    const data: YelpSearchResponse = await response.json()
    
    // Filter for trending restaurants (high rating + good review count)
    const trendingRestaurants = data.businesses
      .filter(business => business.rating >= 4.0 && business.review_count >= 50)
      .map(business => convertYelpToPlaceResult(business))

    console.log(`Found ${trendingRestaurants.length} trending restaurants in ${sanitizedCity}`)
    
    return trendingRestaurants

  } catch (error) {
    console.error('Error fetching trending Yelp restaurants:', error)
    return []
  }
} 