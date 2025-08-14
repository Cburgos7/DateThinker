import { NextRequest, NextResponse } from 'next/server'
import { searchSpecificVenues } from '@/lib/search-utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Transform PlaceResult to match explore page expectations
function transformVenueForExplore(venue: any) {
  return {
    id: venue.id,
    name: venue.name,
    rating: venue.rating,
    priceLevel: venue.price || venue.priceLevel,
    image: venue.photoUrl || venue.image,
    photos: venue.photoUrl ? [venue.photoUrl] : (venue.image ? [venue.image] : []),
    description: getVenueDescription(venue),
    category: venue.category,
    address: venue.address || venue.location,
    phone: venue.phone,
    website: venue.website,
    openNow: venue.openNow,
    isFavorite: false,
    trending: venue.trending || false,
    trending_reason: venue.trending_reason || undefined,
  }
}

// Generate appropriate descriptions based on venue type
function getVenueDescription(venue: any): string {
  const category = venue.category
  const name = venue.name
  
  if (venue.description) {
    return venue.description
  }
  
  if (category === 'event') {
    return `Join us for ${name.toLowerCase()}. An exciting event experience awaits!`
  } else if (category === 'restaurant') {
    return `Enjoy delicious dining at ${name}. Perfect for a memorable meal together.`
  } else if (category === 'activity') {
    return `Discover ${name} and create unforgettable memories together.`
  } else if (category === 'outdoor') {
    return `Experience the beauty of ${name}. Perfect for outdoor enthusiasts.`
  }
  
  return `Discover something special at ${name}.`
}

// Get category-specific search query
function getCategorySearchQuery(category: string, baseQuery: string): string {
  switch (category) {
    case 'restaurants':
      return 'restaurants food dining cafes bars'
    case 'activities':
      return 'activities entertainment recreation fun things to do'
    case 'outdoors':
      return 'outdoors parks nature trails hiking'
    case 'events':
      return 'events concerts shows performances'
    default:
      return baseQuery
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { city, searchQuery = '', category = '', limit = 50, excludeIds = [], offset = 0 } = body

    // Debug: Log the parameters being received
    console.log(`🔍 Discovery API Debug (POST):`, {
      city,
      searchQuery,
      category,
      limit,
      offset,
      excludeIdsLength: excludeIds.length,
      excludeIdsSample: excludeIds.slice(0, 5)
    })

    if (!city) {
      return NextResponse.json({ error: 'City parameter is required' }, { status: 400 })
    }

    // Use category-specific search query if category is provided
    const finalSearchQuery = category ? getCategorySearchQuery(category, searchQuery) : searchQuery

    console.log(`🔍 Calling searchSpecificVenues with:`, {
      city,
      searchQuery: finalSearchQuery,
      maxResults: limit,
      excludeIdsLength: excludeIds.length,
      offset,
      discoveryMode: true,
      categoryFilter: category
    })

    // Use discovery mode to find more unique venues, but only for events or when no specific category is requested
    const shouldUseDiscoveryMode = category === 'events' || !category
    
    const venues = await searchSpecificVenues({
      city,
      searchQuery: finalSearchQuery || 'restaurant', // Default to restaurant if no query
      maxResults: limit,
      excludeIds,
      offset, // Pass the offset for pagination
      discoveryMode: shouldUseDiscoveryMode, // Only use discovery mode for events or general search
      categoryFilter: category // Pass category filter to focus search
    })

    console.log(`🔍 Discovery API returning:`, {
      venuesFound: venues.length,
      hasMore: venues.length >= Math.max(limit * 0.5, 10) // More lenient: if we get at least 50% of requested or 10 venues, consider more available
    })

    // Add cache headers to reduce API calls
    const response = NextResponse.json({ 
      venues: venues.map(transformVenueForExplore), 
      hasMore: venues.length >= Math.max(limit * 0.5, 10), // More lenient hasMore logic
      page: 1,
      totalPages: 1,
      discoveryMode: shouldUseDiscoveryMode,
      category: category
    })
    
    // Cache results for 3 minutes (shorter than regular explore)
    response.headers.set('Cache-Control', 'public, s-maxage=180, stale-while-revalidate=300')
    
    return response
  } catch (error) {
    console.error('Error in discovery API:', error)
    return NextResponse.json({ error: 'Failed to fetch discovery venues' }, { status: 500 })
  }
}

// Keep GET for backward compatibility, but with limited excludeIds
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const city = searchParams.get('city')
    const searchQuery = searchParams.get('query') || ''
    const category = searchParams.get('category') || ''
    const limit = parseInt(searchParams.get('limit') || '50')
    const excludeIds = searchParams.get('excludeIds')?.split(',') || []
    const offset = parseInt(searchParams.get('offset') || '0')

    // Limit excludeIds for GET requests to prevent URL length issues
    const limitedExcludeIds = excludeIds.slice(-50) // Only use last 50 IDs for GET requests

    console.log(`🔍 Discovery API Debug (GET):`, {
      city,
      searchQuery,
      category,
      limit,
      offset,
      excludeIdsLength: excludeIds.length,
      limitedExcludeIdsLength: limitedExcludeIds.length,
      urlLength: request.url.length
    })

    if (!city) {
      return NextResponse.json({ error: 'City parameter is required' }, { status: 400 })
    }

    // Use category-specific search query if category is provided
    const finalSearchQuery = category ? getCategorySearchQuery(category, searchQuery) : searchQuery

    // Use discovery mode to find more unique venues, but only for events or when no specific category is requested
    const shouldUseDiscoveryMode = category === 'events' || !category
    
    const venues = await searchSpecificVenues({
      city,
      searchQuery: finalSearchQuery || 'restaurant', // Default to restaurant if no query
      maxResults: limit,
      excludeIds: limitedExcludeIds, // Use limited excludeIds for GET requests
      offset, // Pass the offset for pagination
      discoveryMode: shouldUseDiscoveryMode, // Only use discovery mode for events or general search
      categoryFilter: category // Pass category filter to focus search
    })

    // Add cache headers to reduce API calls
    const response = NextResponse.json({ 
      venues: venues.map(transformVenueForExplore), 
      hasMore: venues.length >= Math.max(limit * 0.5, 10), // More lenient hasMore logic
      page: 1,
      totalPages: 1,
      discoveryMode: shouldUseDiscoveryMode,
      category: category
    })
    
    // Cache results for 3 minutes (shorter than regular explore)
    response.headers.set('Cache-Control', 'public, s-maxage=180, stale-while-revalidate=300')
    
    return response
  } catch (error) {
    console.error('Error in discovery API:', error)
    return NextResponse.json({ error: 'Failed to fetch discovery venues' }, { status: 500 })
  }
}
