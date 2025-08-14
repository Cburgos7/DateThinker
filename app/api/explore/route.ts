import { NextRequest, NextResponse } from 'next/server'
import { searchPlacesForExploreFree, searchTrendingVenues, getSocialData, searchSpecificVenues } from '@/lib/search-utils'
import { type PlaceResult } from '@/lib/search-utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Transform PlaceResult to match explore page expectations
function transformVenueForExplore(venue: PlaceResult | any) {
  return {
    id: venue.id,
    name: venue.name,
    rating: venue.rating,
    priceLevel: venue.price || venue.priceLevel,
    image: venue.photoUrl || venue.image, // Map photoUrl to image, or use existing image
    photos: venue.photoUrl ? [venue.photoUrl] : (venue.image ? [venue.image] : []),
    description: getVenueDescription(venue),
    category: venue.category,
    address: venue.address || venue.location,
    phone: venue.phone, // Add phone field
    website: venue.website, // Add website field
    openNow: venue.openNow,
    isFavorite: false, // TODO: Check actual favorite status
    trending: venue.trending || false,
    trending_reason: venue.trending_reason || undefined,
  }
}

// Generate appropriate descriptions based on venue type
function getVenueDescription(venue: PlaceResult | any): string {
  const category = venue.category
  const name = venue.name
  
  // If venue already has a description, use it
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

export async function POST(request: Request) {
  console.log("[Explore API] POST request received")
  
  try {
    const body = await request.json()
    console.log("[Explore API] Request body:", body)

    if (!body.city) {
      console.log("[Explore API] Missing city parameter")
      return NextResponse.json(
        { error: "City is required" },
        { status: 400 }
      )
    }

    const page = body.page || 1
    const limit = body.maxResults || 20
    
    // For infinite scroll, we need to fetch more venues than before
    // We'll fetch extra venues and use excludeIds to avoid duplicates
    const venues = await searchPlacesForExploreFree({
      city: body.city,
      placeId: body.placeId,
      maxResults: limit,
      excludeIds: body.excludeIds || []
    })

    // Calculate pagination info
    const hasMore = venues.length === limit // If we got a full page, there might be more
    const nextPage = hasMore ? page + 1 : null

    console.log(`[Explore API] Found ${venues.length} venues for ${body.city} (page ${page})`)

    return NextResponse.json({
      venues: venues.map(transformVenueForExplore),
      pagination: {
        currentPage: page,
        hasMore,
        nextPage,
        limit
      },
      total: venues.length,
      city: body.city
    })
  } catch (error) {
    console.error("[Explore API] Error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const city = searchParams.get('city')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const excludeIds = searchParams.get('excludeIds')?.split(',') || []
    const trending = searchParams.get('trending') === 'true'
    const social = searchParams.get('social') === 'true'
    const search = searchParams.get('search') // New search parameter
    const category = searchParams.get('category') || undefined

    if (!city) {
      return NextResponse.json({ error: 'City parameter is required' }, { status: 400 })
    }

    // If social data is requested, return social information
    if (social) {
      const socialData = await getSocialData(city)
      return NextResponse.json(socialData)
    }

    // If trending is requested, use the trending search function
    if (trending) {
      const trendingVenues = await searchTrendingVenues(city, limit)
      return NextResponse.json({ 
        venues: trendingVenues.map(transformVenueForExplore), 
        hasMore: false, // Trending results are limited
        page: 1,
        totalPages: 1
      })
    }

    // If search query is provided, search for specific venues
    if (search && search.trim()) {
      const searchResults = await searchSpecificVenues({
        city,
        searchQuery: search.trim(),
        maxResults: limit,
        excludeIds,
        discoveryMode: true // Enable discovery mode for better search results
      })
      
      return NextResponse.json({ 
        venues: searchResults.map(transformVenueForExplore), 
        hasMore: false, // Search results don't paginate 
        page: 1,
        totalPages: 1
      })
    }

    // Enable discovery mode for pages beyond 5 to find more unique venues
    const discoveryMode = page > 5
    const extraFetch = page <= 3 ? 10 : 5 // Fetch fewer extra venues for later pages
    const venues = await searchPlacesForExploreFree({ 
      city, 
      maxResults: limit + extraFetch, // Fetch extra to determine if there are more
      excludeIds,
      discoveryMode, // Enable expanded discovery for later pages
      // forward category to backend for proper filtering
      // @ts-ignore
      category
    })

    // Determine if there are more results available
    const hasMore = venues.length > limit
    const currentPageVenues = venues.slice(0, limit)

    // Add cache headers to reduce API calls for the same city
    const response = NextResponse.json({ 
      venues: currentPageVenues.map(transformVenueForExplore), 
      hasMore,
      page,
      totalPages: Math.ceil(venues.length / limit)
    })
    
    // Cache results for 5 minutes to reduce API costs
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
    
    return response
  } catch (error) {
    console.error('Error in explore API:', error)
    return NextResponse.json({ error: 'Failed to fetch venues' }, { status: 500 })
  }
} 