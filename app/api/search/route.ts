import { NextRequest, NextResponse } from 'next/server'
import { searchSpecificVenuesCostEffective } from '@/lib/search-utils'
import { type PlaceResult } from '@/lib/search-utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Transform PlaceResult to match frontend expectations
function transformVenueForSearch(venue: PlaceResult) {
  return {
    id: venue.id,
    name: venue.name,
    rating: venue.rating,
    priceLevel: venue.price || venue.priceLevel,
    image: venue.photoUrl || venue.image,
    photos: venue.photoUrl ? [venue.photoUrl] : (venue.image ? [venue.image] : []),
    description: venue.description || getVenueDescription(venue),
    category: venue.category,
    address: venue.address || venue.location,
    phone: venue.phone,
    website: venue.website,
    openNow: venue.openNow,
    isFavorite: false,
  }
}

// Generate appropriate descriptions based on venue type
function getVenueDescription(venue: PlaceResult): string {
  const category = venue.category
  const name = venue.name
  
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

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const city = searchParams.get('city')
    const query = searchParams.get('query')
    const maxResults = parseInt(searchParams.get('maxResults') || '20')
    const excludeIds = searchParams.get('excludeIds')?.split(',') || []
    const useGoogleAPI = searchParams.get('useGoogleAPI') === 'true'

    if (!city) {
      return NextResponse.json({ error: 'City parameter is required' }, { status: 400 })
    }

    if (!query || query.trim() === '') {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 })
    }

    console.log(`[Search API] Searching for "${query}" in ${city}${useGoogleAPI ? ' (with Google API)' : ' (free APIs only)'}`)

    const searchResults = await searchSpecificVenuesCostEffective({
      city,
      searchQuery: query.trim(),
      maxResults,
      excludeIds,
      useGoogleAPI
    })

    // Add cache headers to reduce API calls for the same search
    const response = NextResponse.json({
      venues: searchResults.map(transformVenueForSearch),
      total: searchResults.length,
      query,
      city
    })
    
    // Cache results for 2 minutes to reduce API costs
    response.headers.set('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=300')
    
    return response
  } catch (error) {
    console.error('Error in search API:', error)
    return NextResponse.json({ error: 'Failed to search venues' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { city, query, maxResults = 20, excludeIds = [], useGoogleAPI = false } = body

    if (!city) {
      return NextResponse.json({ error: 'City is required' }, { status: 400 })
    }

    if (!query || query.trim() === '') {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 })
    }

    console.log(`[Search API] POST: Searching for "${query}" in ${city}${useGoogleAPI ? ' (with Google API)' : ' (free APIs only)'}`)

    const searchResults = await searchSpecificVenuesCostEffective({
      city,
      searchQuery: query.trim(),
      maxResults,
      excludeIds,
      useGoogleAPI
    })

    return NextResponse.json({
      venues: searchResults.map(transformVenueForSearch),
      total: searchResults.length,
      query,
      city
    })
  } catch (error) {
    console.error('Error in search API POST:', error)
    return NextResponse.json({ error: 'Failed to search venues' }, { status: 500 })
  }
}

export async function OPTIONS(request: Request) {
  console.log("[Search API] OPTIONS request received")
  return new NextResponse(null, { status: 200 })
}