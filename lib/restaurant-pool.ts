import { PlaceResult } from "./search-utils"
import { sanitizeInput } from "./api-utils"

// Restaurant pool manager for better pagination
interface RestaurantPool {
  restaurants: PlaceResult[]
  currentIndex: number
  city: string
  lastFetched: number
  totalFetched: number
  isExhausted: boolean
}

// In-memory cache for restaurant pools by city
const restaurantPools = new Map<string, RestaurantPool>()

// Pool configuration
const POOL_SIZE = 150 // Increased pool size for more variety
const POOL_EXPIRY_MS = 30 * 60 * 1000 // 30 minutes
const BATCH_SIZE = 20 // Increased to ensure 20+ restaurants per load more

export class RestaurantPoolManager {
  private static async fetchRestaurantBatch(
    city: string, 
    offset: number, 
    limit: number,
    excludeIds: string[] = []
  ): Promise<PlaceResult[]> {
    const allRestaurants: PlaceResult[] = []
    const sanitizedCity = sanitizeInput(city)
    
    console.log(`🏊‍♂️ Fetching restaurant batch: city=${sanitizedCity}, offset=${offset}, limit=${limit}`)
    
    // Strategy 1: Foursquare API (primary source - best coverage and variety)
    try {
      const { fetchFoursquareRestaurantsWithStrategies } = await import("@/lib/foursquare-api")
      
      const foursquareRestaurants = await fetchFoursquareRestaurantsWithStrategies(
        sanitizedCity,
        Math.ceil(limit * 0.7), // 70% from Foursquare
        excludeIds
      )
      
      allRestaurants.push(...foursquareRestaurants)
      console.log(`🍽️ Foursquare contributed ${foursquareRestaurants.length} restaurants`)
    } catch (error) {
      console.error("❌ Error fetching from Foursquare:", error)
    }

    // Strategy 2: Geoapify API (secondary source for local variety)
    try {
      const { searchGeoapifyRestaurants } = await import("@/lib/geoapify")
      const geoapifyRestaurants = await searchGeoapifyRestaurants(
        sanitizedCity,
        Math.ceil(limit * 0.3), // 30% from Geoapify (increased since no Yelp)
        excludeIds
      )
      
      // Filter out duplicates from Foursquare results
      const uniqueGeoapify = geoapifyRestaurants.filter(geo => 
        !allRestaurants.some(existing => 
          existing.id === geo.id ||
          existing.name.toLowerCase() === geo.name.toLowerCase()
        )
      )
      
      allRestaurants.push(...uniqueGeoapify)
      console.log(`🗺️ Geoapify contributed ${uniqueGeoapify.length} unique restaurants`)
    } catch (error) {
      console.error("❌ Error fetching from Geoapify:", error)
    }
    

    
    // Final deduplication and filtering
    const uniqueRestaurants = allRestaurants.filter((restaurant, index, self) => 
      index === self.findIndex(r => r.id === restaurant.id) && 
      !excludeIds.includes(restaurant.id)
    )
    
    // Shuffle to mix different sources
    const shuffledRestaurants = uniqueRestaurants.sort(() => Math.random() - 0.5)
    
    console.log(`🏊‍♂️ Batch complete: ${shuffledRestaurants.length} unique restaurants (requested: ${limit})`)
    return shuffledRestaurants
  }
  
  static async getRestaurantPool(city: string): Promise<RestaurantPool> {
    const sanitizedCity = sanitizeInput(city).toLowerCase()
    const existing = restaurantPools.get(sanitizedCity)
    const now = Date.now()
    
    // Return existing pool if valid and not expired
    if (existing && (now - existing.lastFetched) < POOL_EXPIRY_MS && !existing.isExhausted) {
      return existing
    }
    
    console.log(`🏊‍♂️ Creating new restaurant pool for ${sanitizedCity}`)
    
    // Fetch a large batch of restaurants
    const offset = existing ? existing.totalFetched : 0
    const restaurants = await this.fetchRestaurantBatch(sanitizedCity, offset, POOL_SIZE)
    
    // Create or update pool
    const pool: RestaurantPool = {
      restaurants: existing ? [...existing.restaurants, ...restaurants] : restaurants,
      currentIndex: existing ? existing.currentIndex : 0,
      city: sanitizedCity,
      lastFetched: now,
      totalFetched: (existing?.totalFetched || 0) + restaurants.length,
      isExhausted: restaurants.length < POOL_SIZE * 0.5 // Exhausted if we got less than 50% of requested
    }
    
    restaurantPools.set(sanitizedCity, pool)
    console.log(`🏊‍♂️ Pool created/updated for ${sanitizedCity}: ${pool.restaurants.length} total restaurants, index: ${pool.currentIndex}`)
    
    return pool
  }
  
  static async getNextRestaurants(
    city: string, 
    count: number = BATCH_SIZE,
    excludeIds: string[] = []
  ): Promise<{ restaurants: PlaceResult[], hasMore: boolean }> {
    const pool = await this.getRestaurantPool(city)
    
    console.log(`🍽️ Getting next ${count} restaurants from pool`)
    console.log(`🍽️ Pool state: ${pool.restaurants.length} total, index: ${pool.currentIndex}, excluded: ${excludeIds.length}`)
    
    // Get all remaining restaurants from current index
    const remainingRestaurants = pool.restaurants.slice(pool.currentIndex)
    
    // Filter out excluded IDs from remaining restaurants
    const availableRestaurants = remainingRestaurants.filter(r => !excludeIds.includes(r.id))
    
    console.log(`🍽️ Remaining: ${remainingRestaurants.length}, Available after exclusions: ${availableRestaurants.length}`)
    
    // If we don't have enough restaurants and pool isn't exhausted, fetch more
    if (availableRestaurants.length < count && !pool.isExhausted) {
      console.log(`🔄 Pool running low (${availableRestaurants.length} < ${count}), fetching more restaurants...`)
      
      // Fetch more restaurants and add to pool
      const newPool = await this.getRestaurantPool(city) // This will fetch more
      
      // Retry with the updated pool (avoid infinite recursion with max retries)
      if (newPool.restaurants.length > pool.restaurants.length) {
        console.log(`🔄 Pool expanded from ${pool.restaurants.length} to ${newPool.restaurants.length}, retrying...`)
        return this.getNextRestaurants(city, count, excludeIds)
      }
    }
    
    // Take the requested number of restaurants (or whatever is available)
    const nextRestaurants = availableRestaurants.slice(0, count)
    
    // FIXED: Simpler index tracking - advance by the number of restaurants we actually took
    // Find the last restaurant we're returning and update index to the position after it
    if (nextRestaurants.length > 0) {
      const lastRestaurant = nextRestaurants[nextRestaurants.length - 1]
      const lastIndex = pool.restaurants.findIndex(r => r.id === lastRestaurant.id)
      if (lastIndex !== -1) {
        pool.currentIndex = lastIndex + 1
      } else {
        // Fallback: just advance by the number we're returning
        pool.currentIndex += nextRestaurants.length
      }
    }
    
    const hasMore = pool.currentIndex < pool.restaurants.length || !pool.isExhausted
    
    console.log(`🍽️ Serving ${nextRestaurants.length} restaurants. New index: ${pool.currentIndex}, Has more: ${hasMore}`)
    
    // If we're returning fewer than requested and it's a significant shortfall, log a warning
    if (nextRestaurants.length < count * 0.7) {
      console.warn(`⚠️ Restaurant pool shortfall: requested ${count}, returning ${nextRestaurants.length}`)
    }
    
    return {
      restaurants: nextRestaurants,
      hasMore
    }
  }
  
  // Reset pool for a city (useful for testing or if user wants fresh results)
  static resetPool(city: string): void {
    const sanitizedCity = sanitizeInput(city).toLowerCase()
    restaurantPools.delete(sanitizedCity)
    console.log(`🔄 Reset restaurant pool for ${sanitizedCity}`)
  }
  
  // Get pool stats for debugging
  static getPoolStats(city: string): { size: number, currentIndex: number, hasMore: boolean } | null {
    const sanitizedCity = sanitizeInput(city).toLowerCase()
    const pool = restaurantPools.get(sanitizedCity)
    
    if (!pool) return null
    
    return {
      size: pool.restaurants.length,
      currentIndex: pool.currentIndex,
      hasMore: pool.currentIndex < pool.restaurants.length || !pool.isExhausted
    }
  }
}
