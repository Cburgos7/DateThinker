import { NextRequest, NextResponse } from 'next/server'
import { searchPlacesForExplore, searchTrendingVenues, getSocialData, searchSpecificVenues } from '@/lib/search-utils'
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
    const venues = await searchPlacesForExplore({
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
        excludeIds
      })
      
      return NextResponse.json({ 
        venues: searchResults.map(transformVenueForExplore), 
        hasMore: false, // Search results don't paginate 
        page: 1,
        totalPages: 1
      })
    }

    // Calculate offset for pagination
    const offset = (page - 1) * limit
    
    // Get venues with extra results to determine if there are more pages
    const maxResults = offset + limit + 1
    const venues = await searchPlacesForExplore({ 
      city, 
      maxResults, 
      excludeIds 
    })

    // Slice the results for the current page
    const currentPageVenues = venues.slice(offset, offset + limit)
    const hasMore = venues.length > offset + limit

    return NextResponse.json({ 
      venues: currentPageVenues.map(transformVenueForExplore), 
      hasMore,
      page,
      totalPages: Math.ceil(venues.length / limit)
    })
  } catch (error) {
    console.error('Error in explore API:', error)
    return NextResponse.json({ error: 'Failed to fetch venues' }, { status: 500 })
  }
} 