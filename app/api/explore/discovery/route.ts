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

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const city = searchParams.get('city')
    const searchQuery = searchParams.get('query') || ''
    const category = searchParams.get('category') || ''
               const limit = parseInt(searchParams.get('limit') || '150')
    const excludeIds = searchParams.get('excludeIds')?.split(',') || []

    if (!city) {
      return NextResponse.json({ error: 'City parameter is required' }, { status: 400 })
    }

    // Use category-specific search query if category is provided
    const finalSearchQuery = category ? getCategorySearchQuery(category, searchQuery) : searchQuery

    // Use discovery mode to find more unique venues
    const venues = await searchSpecificVenues({
      city,
      searchQuery: finalSearchQuery || 'restaurant', // Default to restaurant if no query
      maxResults: limit,
      excludeIds,
      discoveryMode: true, // Always use discovery mode for this endpoint
      categoryFilter: category // Pass category filter to focus search
    })

    // Add cache headers to reduce API calls
    const response = NextResponse.json({ 
      venues: venues.map(transformVenueForExplore), 
      hasMore: venues.length >= limit * 0.8, // Consider "more available" if we got at least 80% of requested
      page: 1,
      totalPages: 1,
      discoveryMode: true,
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
