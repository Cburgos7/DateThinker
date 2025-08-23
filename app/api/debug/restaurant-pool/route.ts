import { NextRequest, NextResponse } from 'next/server'
import { RestaurantPoolManager } from '@/lib/restaurant-pool'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const city = searchParams.get('city') || 'Chicago'
    const action = searchParams.get('action') // 'stats', 'reset', 'test'
    
    if (action === 'reset') {
      RestaurantPoolManager.resetPool(city)
      return NextResponse.json({ 
        message: `Restaurant pool reset for ${city}`,
        city 
      })
    }
    
    if (action === 'test') {
      // Test fetching next restaurants
      const count = parseInt(searchParams.get('count') || '10')
      const result = await RestaurantPoolManager.getNextRestaurants(city, count)
      
      return NextResponse.json({
        city,
        requested: count,
        returned: result.restaurants.length,
        hasMore: result.hasMore,
        restaurants: result.restaurants.map(r => ({
          id: r.id,
          name: r.name,
          category: r.category,
          rating: r.rating,
          source: r.id.includes('foursquare') ? 'Foursquare' : 
                  r.id.includes('geo') ? 'Geoapify' : 'Unknown'
        })),
        poolStats: RestaurantPoolManager.getPoolStats(city),
        breakdown: {
          foursquare: result.restaurants.filter(r => r.id.includes('foursquare')).length,
          geoapify: result.restaurants.filter(r => r.id.includes('geo')).length,
          other: result.restaurants.filter(r => !r.id.includes('foursquare') && !r.id.includes('geo')).length
        }
      })
    }
    
    if (action === 'test-foursquare') {
      // Test Foursquare API directly
      try {
        const { fetchFoursquareRestaurantsWithStrategies } = await import('@/lib/foursquare-api')
        const count = parseInt(searchParams.get('count') || '20')
        const restaurants = await fetchFoursquareRestaurantsWithStrategies(city, count)
        
        return NextResponse.json({
          city,
          requested: count,
          returned: restaurants.length,
          restaurants: restaurants.map(r => ({
            id: r.id,
            name: r.name,
            rating: r.rating,
            price: r.price,
            address: r.address
          }))
        })
      } catch (error) {
        return NextResponse.json({ 
          error: 'Failed to test Foursquare API',
          details: error instanceof Error ? error.message : String(error)
        }, { status: 500 })
      }
    }
    
    // Default: return stats
    const stats = RestaurantPoolManager.getPoolStats(city)
    
    return NextResponse.json({
      city,
      poolExists: !!stats,
      stats: stats || { message: 'No pool exists for this city yet' }
    })
    
  } catch (error) {
    console.error('Error in restaurant pool debug endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
