import { NextRequest, NextResponse } from 'next/server'
import { type PlaceResult } from '@/lib/search-utils'
import { searchPlacesForExploreFree } from '@/lib/search-utils'

function transformVenueForExplore(venue: PlaceResult) {
  return {
    id: venue.id,
    name: venue.name,
    rating: venue.rating,
    priceLevel: venue.price,
    image: venue.photoUrl,
    photos: venue.photos,
    description: venue.description,
    category: venue.category,
    address: venue.address,
    phone: venue.phone,
    website: venue.website,
    openNow: venue.openNow,
    isFavorite: false, // This will be set by the client
    trending: false,
    trending_reason: undefined
  }
}

function getVenueDescription(venue: PlaceResult | any): string {
  const name = venue.name || 'This venue'
  
  if (venue.description) {
    return venue.description
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
    const limit = parseInt(searchParams.get('limit') || '25') // Increased default limit
    const excludeIds = searchParams.get('excludeIds')?.split(',') || []
    const trending = searchParams.get('trending') === 'true'
    const social = searchParams.get('social') === 'true'
    const search = searchParams.get('search') // New search parameter
    const category = searchParams.get('category') || undefined
    const lat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : undefined
    const lng = searchParams.get('lng') ? parseFloat(searchParams.get('lng')!) : undefined

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
    const extraFetch = page <= 3 ? 10 : 5
    const venues = await searchPlacesForExploreFree({ 
      city, 
      maxResults: limit + extraFetch, // Fetch extra to determine if there are more
      excludeIds,
      discoveryMode, // Enable expanded discovery for later pages
      // forward category to backend for proper filtering
      // @ts-ignore
      category,
      // Pass user coordinates for more accurate results
      lat,
      lng,
      // Pass page number for pagination-aware search
      page
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

// Helper functions for social data and trending venues
async function getSocialData(city: string) {
  // Mock social data for now
  return {
    recentActivity: [
      {
        id: '1',
        type: 'favorite',
        venue: 'Sample Restaurant',
        timeAgo: '2 hours ago',
        userCount: 5
      }
    ],
    popularThisWeek: [
      {
        venue: 'Popular Cafe',
        interactions: 25,
        favorites: 12,
        plans: 8
      }
    ],
    totalUsersExploring: 150,
    totalVenuesViewed: 1200
  }
}

async function searchTrendingVenues(city: string, limit: number) {
  // Use Geoapify to get trending venues
  try {
    const { searchGeoapifyPlaces } = await import('@/lib/geoapify')
    const venues = await searchGeoapifyPlaces({
      city,
      limit,
      category: 'restaurant' // Start with restaurants for trending
    })
    
    // Add trending badge
    return venues.map(venue => ({
      ...venue,
      trending: true,
      trending_reason: 'Popular this week'
    }))
  } catch (error) {
    console.error('Error fetching trending venues:', error)
    return []
  }
}

async function searchSpecificVenues(params: {
  city: string
  searchQuery: string
  maxResults: number
  excludeIds: string[]
  discoveryMode: boolean
}) {
  try {
    const { searchGeoapifyPlaces } = await import('@/lib/geoapify')
    const venues = await searchGeoapifyPlaces({
      city: params.city,
      query: params.searchQuery,
      limit: params.maxResults,
      excludeIds: params.excludeIds
    })
    return venues
  } catch (error) {
    console.error('Error in searchSpecificVenues:', error)
    return []
  }
} 