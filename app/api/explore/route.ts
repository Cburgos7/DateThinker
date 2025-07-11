import { NextRequest, NextResponse } from 'next/server'
import { searchPlacesForExplore, searchTrendingVenues, getSocialData } from '@/lib/search-utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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
      venues,
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
        venues: trendingVenues, 
        hasMore: false, // Trending results are limited
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
      venues: currentPageVenues, 
      hasMore,
      page,
      totalPages: Math.ceil(venues.length / limit)
    })
  } catch (error) {
    console.error('Error in explore API:', error)
    return NextResponse.json({ error: 'Failed to fetch venues' }, { status: 500 })
  }
} 