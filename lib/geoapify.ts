import { sanitizeInput } from '@/lib/api-utils'

// Geoapify API types
export interface GeoapifyPlace {
  place_id: string
  name: string
  formatted: string
  address_line1?: string
  address_line2?: string
  city?: string
  state?: string
  country?: string
  postcode?: string
  lat: number
  lon: number
  category?: string
  type?: string
  amenity?: string
  cuisine?: string
  brand?: string
  opening_hours?: {
    open_now?: boolean
    periods?: Array<{
      open: { day: number; time: string }
      close: { day: number; time: string }
    }>
    weekday_text?: string[]
  }
  phone?: string
  website?: string
  email?: string
  fax?: string
  wheelchair?: string
  internet_access?: string
  internet_access_fee?: string
  smoking?: string
  takeaway?: string
  delivery?: string
  drive_through?: string
  outdoor_seating?: string
  live_music?: string
  microbrewery?: string
  organic?: string
  kosher?: string
  halal?: string
  vegetarian?: string
  vegan?: string
  gluten_free?: string
  price_range?: string
  rating?: number
  review_count?: number
  stars?: number
  image?: string
  description?: string
  tags?: string[]
}

export interface GeoapifySearchParams {
  city: string
  category?: string
  query?: string
  limit?: number
  offset?: number
  excludeIds?: string[]
  priceRange?: number
  radius?: number
  lat?: number  // User's latitude from geolocation
  lng?: number  // User's longitude from geolocation
}

// Convert Geoapify place to PlaceResult format
export function convertGeoapifyToPlaceResult(place: GeoapifyPlace, category: string): any {
  const address = place.formatted || `${place.address_line1 || ''} ${place.city || ''} ${place.state || ''}`.trim()
  
  // Determine price level from price_range or default to 2
  let priceLevel = 2
  if (place.price_range) {
    const priceMatch = place.price_range.match(/\$+/)
    if (priceMatch) {
      priceLevel = Math.min(priceMatch[0].length, 4)
    }
  }

  // Determine rating from various possible fields
  let rating = place.rating || place.stars || 0

  // Create description based on available data
  let description = ''
  if (place.cuisine) {
    description += `${place.cuisine} cuisine`
  }
  if (place.brand) {
    description += description ? ` - ${place.brand}` : place.brand
  }
  if (place.amenity) {
    description += description ? ` - ${place.amenity}` : place.amenity
  }
  if (!description) {
    description = `Discover ${category} in ${place.city || 'this area'}`
  }

  return {
    id: `geoapify-${place.place_id}`,
    name: place.name,
    rating,
    address,
    price: priceLevel,
    photoUrl: place.image,
    openNow: place.opening_hours?.open_now,
    category: category as 'restaurant' | 'activity' | 'event',
    placeId: place.place_id,
    phone: place.phone,
    website: place.website,
    description,
    // Additional Geoapify specific data
    lat: place.lat,
    lon: place.lon,
    cuisine: place.cuisine,
    brand: place.brand,
    amenity: place.amenity,
    tags: place.tags || [],
    // Include website info if available
    url: place.website || undefined
  }
}

// PROPER 2-STEP GEOAPIFY SEARCH - Following documentation exactly
export async function searchGeoapifyPlaces(params: GeoapifySearchParams): Promise<any[]> {
  console.log(`🔍 2-STEP SEARCH: searchGeoapifyPlaces called with params:`, JSON.stringify(params))
  const { city, category = 'restaurant', limit = 20, lat, lng } = params
  
  try {
    const apiKey = process.env.GEOAPIFY_API_KEY
    if (!apiKey) {
      console.error('❌ Geoapify API key is not configured')
      return []
    }
    
    console.log(`✅ Using Geoapify API key: ${apiKey.substring(0, 8)}...`)

    let searchLat: number, searchLng: number

    // If we have user coordinates, use them directly
    if (lat && lng) {
      searchLat = lat
      searchLng = lng
      console.log(`📍 Using provided coordinates: lat=${searchLat}, lng=${searchLng}`)
    } else {
      // Step 1: Geocode the city name (e.g. "Chicago" or "Saint Paul")
      const cityToSearch = city || 'Saint Paul'
      console.log(`🗺️ Step 1: Geocoding city: ${cityToSearch}`)
      
      const geocodeUrl = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(cityToSearch)}&apiKey=${apiKey}`
      console.log(`🗺️ Geocoding URL: ${geocodeUrl}`)
      
      const geocodeResponse = await fetch(geocodeUrl)
      console.log(`📡 Geocoding response status: ${geocodeResponse.status}`)
      
      if (!geocodeResponse.ok) {
        console.error(`❌ Geocoding failed: ${geocodeResponse.status}`)
        return []
      }
      
      const geocodeData = await geocodeResponse.json()
      console.log(`📍 Geocoding response: ${JSON.stringify(geocodeData).substring(0, 300)}...`)
      
      if (!geocodeData.features || geocodeData.features.length === 0) {
        console.error(`❌ No coordinates found for: ${cityToSearch}`)
        return []
      }
      
      // Extract coordinates from geocoding result
      const coordinates = geocodeData.features[0].geometry.coordinates
      searchLng = coordinates[0] // longitude first in GeoJSON
      searchLat = coordinates[1] // latitude second
      
      console.log(`✅ Step 1 complete: Found coordinates lat=${searchLat}, lng=${searchLng}`)
    }
    
    // Step 2: Query places by category using coordinates
    console.log(`🍽️ Step 2: Searching for restaurants near coordinates`)
    
    // 10km radius as suggested in documentation
    const radiusMeters = 10000
    
    const placesUrl = `https://api.geoapify.com/v2/places?categories=catering.restaurant&filter=circle:${searchLng},${searchLat},${radiusMeters}&limit=${limit}&apiKey=${apiKey}`
    
    console.log(`🍽️ Places API URL: ${placesUrl}`)
    
    const placesResponse = await fetch(placesUrl)
    console.log(`📡 Places API response status: ${placesResponse.status}`)

    if (!placesResponse.ok) {
      const errorText = await placesResponse.text()
      console.error(`❌ Places API error: ${placesResponse.status} - ${errorText}`)
      return []
    }

    const placesData = await placesResponse.json()
    console.log(`✅ Places API response: ${JSON.stringify(placesData).substring(0, 300)}...`)
    
    if (!placesData.features || !Array.isArray(placesData.features)) {
      console.log('❌ No features found in places response')
      return []
    }

    console.log(`✅ Step 2 complete: Found ${placesData.features.length} restaurants!`)
    
    // Convert to our format
    const restaurants = placesData.features
      .filter((feature: any) => feature.properties?.name)
      .map((feature: any) => {
        const place = feature.properties
        return {
          id: place.place_id || `geo-${Math.random()}`,
          name: place.name,
          address: place.formatted || place.address_line1 || '',
          rating: 0,
          priceLevel: 0,
          category: 'restaurant',
          emoji: '🍽️',
          lat: feature.geometry?.coordinates?.[1] || 0,
          lng: feature.geometry?.coordinates?.[0] || 0,
          url: place.website
        }
      })

    console.log(`🎯 Final result: Returning ${restaurants.length} restaurants`)
    return restaurants

  } catch (error) {
    console.error('❌ Error in 2-step search:', error)
    return []
  }
}

// Helper function to get correct Geoapify category
function getGeoapifyCategory(category: string): string {
  switch (category) {
    case 'restaurant':
      return 'catering.restaurant'
    case 'activity':
      return 'entertainment,tourism.sights,sport.climbing,sport.golf'
    case 'outdoor':
      return 'sport,natural'
    case 'event':
      return 'entertainment'
    default:
      return 'catering.restaurant'
  }
}

// Simple helper to enhance city names for better search results
function enhanceCityName(city: string): string {
  const cityMap: { [key: string]: string } = {
    'saint paul': 'Saint Paul, Minnesota',
    'st paul': 'Saint Paul, Minnesota',
    'chicago': 'Chicago, Illinois',
    'minneapolis': 'Minneapolis, Minnesota',
    'new york': 'New York, New York',
    'los angeles': 'Los Angeles, California',
    'miami': 'Miami, Florida',
    'seattle': 'Seattle, Washington',
    'portland': 'Portland, Oregon',
    'denver': 'Denver, Colorado',
    'austin': 'Austin, Texas',
    'houston': 'Houston, Texas',
    'dallas': 'Dallas, Texas',
    'san francisco': 'San Francisco, California',
    'boston': 'Boston, Massachusetts',
    'atlanta': 'Atlanta, Georgia'
  }
  
  const lowerCity = city.toLowerCase().trim()
  return cityMap[lowerCity] || city
}

// Removed complex state cities logic - no longer needed!

// Get Geoapify category filters based on our category
function getGeoapifyCategories(category: string): string {
  switch (category) {
    case 'restaurant':
      return 'catering.restaurant,catering.cafe,catering.fast_food,catering.bar,catering.pub'
    case 'activity':
      return 'entertainment,leisure,tourism,sport'
    case 'event':
      return 'entertainment.culture,entertainment.music,entertainment.sports'
    case 'outdoor':
      return 'natural,leisure.park,sport'
    default:
      return 'catering.restaurant,entertainment'
  }
}

// Search for restaurants using Geoapify
export async function searchGeoapifyRestaurants(city: string, limit = 20, excludeIds: string[] = [], lat?: number, lng?: number): Promise<any[]> {
  console.log(`🍽️ searchGeoapifyRestaurants called with city: ${city}, limit: ${limit}, coords: ${lat},${lng}`)
  try {
    const result = await searchGeoapifyPlaces({
      city,
      category: 'restaurant',
      limit,
      excludeIds,
      lat,
      lng
    })
    console.log(`🍽️ searchGeoapifyRestaurants returning ${result.length} restaurants`)
    return result
  } catch (error) {
    console.error(`🍽️ searchGeoapifyRestaurants error:`, error)
    return []
  }
}

// Search for activities using Geoapify
export async function searchGeoapifyActivities(city: string, limit = 20, excludeIds: string[] = [], lat?: number, lng?: number): Promise<any[]> {
  console.log(`🎯 searchGeoapifyActivities called with city: ${city}, limit: ${limit}, coords: ${lat},${lng}`)
  try {
    const result = await searchGeoapifyPlaces({
      city,
      category: 'activity',
      limit,
      excludeIds,
      lat,
      lng
    })
    console.log(`🎯 searchGeoapifyActivities returning ${result.length} activities`)
    return result
  } catch (error) {
    console.error(`🎯 searchGeoapifyActivities error:`, error)
    return []
  }
}

// Search for events using Geoapify
export async function searchGeoapifyEvents(city: string, limit = 20, excludeIds: string[] = []): Promise<any[]> {
  return searchGeoapifyPlaces({
    city,
    category: 'event',
    limit,
    excludeIds
  })
}

// Search for outdoor activities using Geoapify
export async function searchGeoapifyOutdoor(city: string, limit = 20, excludeIds: string[] = []): Promise<any[]> {
  return searchGeoapifyPlaces({
    city,
    category: 'outdoor',
    limit,
    excludeIds
  })
}

// Get place details from Geoapify
export async function getGeoapifyPlaceDetails(placeId: string): Promise<GeoapifyPlace | null> {
  try {
    const apiKey = process.env.GEOAPIFY_API_KEY
    if (!apiKey) {
      throw new Error('Geoapify API key is not configured')
    }

    // Remove our prefix if present
    const cleanPlaceId = placeId.replace('geoapify-', '')

    const url = new URL('https://api.geoapify.com/v2/place-details')
    url.searchParams.set('apiKey', apiKey)
    url.searchParams.set('id', cleanPlaceId)
    url.searchParams.set('format', 'json')

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      console.error(`Geoapify details API error: ${response.status}`)
      return null
    }

    const data = await response.json()
    return data.properties || null

  } catch (error) {
    console.error('Error getting Geoapify place details:', error)
    return null
  }
}
