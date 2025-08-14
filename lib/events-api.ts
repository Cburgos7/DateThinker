import { sanitizeInput } from "./api-utils"
import { isTestMode } from "./app-config"
import { type PlaceResult } from "./search-utils"

// Types for event data
export interface EventbriteEvent {
  id: string
  name: {
    text: string
  }
  description?: {
    text: string
  }
  start: {
    utc: string
    local: string
  }
  end: {
    utc: string
    local: string
  }
  venue?: {
    name: string
    address: {
      localized_address_display: string
      city: string
      region: string
    }
  }
  logo?: {
    url: string
  }
  ticket_availability?: {
    minimum_ticket_price?: {
      value: number
      currency: string
    }
    maximum_ticket_price?: {
      value: number
      currency: string
    }
  }
  is_free: boolean
  url: string
}

export interface TicketmasterEvent {
  id: string
  name: string
  url: string
  images: Array<{
    url: string
    width: number
    height: number
  }>
  dates: {
    start: {
      localDate: string
      localTime: string
    }
  }
  priceRanges?: Array<{
    min: number
    max: number
    currency: string
  }>
  venues?: Array<{
    name: string
    city: {
      name: string
    }
    address: {
      line1: string
    }
  }>
  classifications: Array<{
    segment: {
      name: string
    }
    genre: {
      name: string
    }
  }>
}

// Re-enable and fix Eventbrite API
export async function fetchEventbriteEvents(
  city: string, 
  limit = 50, // Increased from 10 to 50
  excludeIds: string[] = []
): Promise<PlaceResult[]> {
  try {
    if (isTestMode()) {
      const mocks: PlaceResult[] = Array.from({ length: limit }, (_, i) => ({
        id: `eventbrite-mock-${i}`,
        name: `Mock Eventbrite Event ${i + 1}`,
        address: `${sanitizeInput(city)} Event Venue ${i + 1}`,
        rating: 4.2,
        price: 2,
        category: 'event',
        photoUrl: `https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?q=80&w=600&auto=format&fit=crop`,
        openNow: true,
        placeId: `mock-eb-${i}`,
      }))
      return mocks.filter(m => !excludeIds.includes(m.id))
    }
    // RE-ENABLED: Eventbrite API is now enabled
    const DISABLE_EVENTBRITE = false // Set to false to enable
    
    if (DISABLE_EVENTBRITE) {
      console.log("Eventbrite API temporarily disabled - using Ticketmaster only")
      return []
    }

    const apiKey = process.env.EVENTBRITE_PRIVATE_TOKEN
    
    if (!apiKey) {
      console.warn("Eventbrite API key not configured, skipping Eventbrite events")
      return []
    }

    const sanitizedCity = sanitizeInput(city)
    
    // Multiple requests for different event types
    const allEvents: PlaceResult[] = []
    
    const searchQueries = [
      { categories: '', sort: 'date' },
      { categories: 'music', sort: 'date' },
      { categories: 'food-and-drink', sort: 'date' },
      { categories: 'arts', sort: 'date' },
      { categories: 'community', sort: 'date' },
    ]
    
    for (const searchQuery of searchQueries) {
      const url = new URL('https://www.eventbriteapi.com/v3/events/search/')
      url.searchParams.append('location.address', sanitizedCity)
      url.searchParams.append('location.within', '50mi') // Increased radius
      url.searchParams.append('expand', 'venue')
      url.searchParams.append('limit', '50')
      url.searchParams.append('sort_by', searchQuery.sort)
      url.searchParams.append('status', 'live')
      
      if (searchQuery.categories) {
        url.searchParams.append('categories', searchQuery.categories)
      }
      
      console.log(`Fetching events from Eventbrite for ${sanitizedCity} (category: ${searchQuery.categories || 'all'})`)

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store'
      })

      if (!response.ok) {
        console.error(`Eventbrite API error: ${response.status} ${response.statusText}`)
        continue
      }

      const data = await response.json()
      
      if (data.events && data.events.length > 0) {
        const batchEvents: PlaceResult[] = data.events
          .filter((event: EventbriteEvent) => !excludeIds.includes(event.id))
          .map((event: EventbriteEvent) => convertEventbriteToPlaceResult(event))
        
        allEvents.push(...batchEvents)
        console.log(`Found ${batchEvents.length} Eventbrite events`)
      }
      
      if (allEvents.length >= limit) break
    }
    
    return allEvents.slice(0, limit)

  } catch (error) {
    console.error('Error fetching Eventbrite events:', error)
    return []
  }
}

// Fixed Ticketmaster API
export async function fetchTicketmasterEvents(
  city: string,
  limit = 50, 
  excludeIds: string[] = []
): Promise<PlaceResult[]> {
  try {
    if (isTestMode()) {
      const mocks: PlaceResult[] = Array.from({ length: limit }, (_, i) => ({
        id: `ticketmaster-mock-${i}`,
        name: i % 3 === 0 ? `Mock Baseball Game` : `Mock Concert ${i + 1}`,
        address: `${sanitizeInput(city)} Arena ${i + 1}`,
        rating: 4.6,
        price: 3,
        category: 'event',
        photoUrl: `https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=600&auto=format&fit=crop`,
        openNow: true,
        placeId: `mock-tm-${i}`,
      }))
      return mocks.filter(m => !excludeIds.includes(m.id))
    }
    const apiKey = process.env.TICKETMASTER_API_KEY
    
    if (!apiKey) {
      console.warn("Ticketmaster API key not configured, skipping Ticketmaster events")
      return []
    }

    const sanitizedCity = sanitizeInput(city)
    
    // Get current date for filtering future events
    const now = new Date()
    const startDateTime = now.toISOString().split('T')[0] + 'T00:00:00Z'
    
    // Make multiple requests for different event types
    const allEvents: PlaceResult[] = []
    const seenIds = new Set<string>()
    const seenNames = new Set<string>()

    const normalizeName = (name: string) => name
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[^a-z0-9\s]/g, '')
      .trim()
    
    // Fixed category mappings for Ticketmaster API
    const eventCategories = [
      { keyword: 'music', segment: 'KZFzniwnSyZfZ7v7nJ' }, // Music
      { keyword: 'theater', segment: 'KZFzniwnSyZfZ7v7na' }, // Arts & Theatre
      { keyword: 'sports', segment: 'KZFzniwnSyZfZ7v7nE' }, // Sports
      { keyword: 'film', segment: 'KZFzniwnSyZfZ7v7nn' }, // Film
      { keyword: 'family', segment: 'KZFzniwnSyZfZ7v7n1' }, // Family
    ]
    
    const perCategoryLimit = Math.max(1, Math.ceil(limit / eventCategories.length))

    for (const category of eventCategories) {
      const url = new URL('https://app.ticketmaster.com/discovery/v2/events.json')
      
      // Fixed parameters for Ticketmaster API
      url.searchParams.append('apikey', apiKey)
      url.searchParams.append('countryCode', 'US')  // Required parameter
      url.searchParams.append('city', sanitizedCity)  // Use requested city
      url.searchParams.append('radius', '25')  // Miles radius
      url.searchParams.append('unit', 'miles')
      url.searchParams.append('size', '50')
      url.searchParams.append('sort', 'date,asc')
      url.searchParams.append('startDateTime', startDateTime)
      
      // Use keyword for category filtering
      if (category.keyword) {
        url.searchParams.append('keyword', category.keyword)
      }

      console.log(`Fetching Ticketmaster events for ${sanitizedCity} (category: ${category.keyword})`)
      console.log(`Ticketmaster API URL: ${url.toString()}`)

      const response = await fetch(url.toString(), {
        cache: 'no-store'
      })

      if (!response.ok) {
        console.error(`Ticketmaster API error for ${category.keyword}: ${response.status} ${response.statusText}`)
        if (response.status === 400) {
          const errorText = await response.text()
          console.error(`Ticketmaster 400 error details: ${errorText}`)
        }
        continue
      }

      const data = await response.json()
      
      if (data._embedded?.events && data._embedded.events.length > 0) {
        const converted: PlaceResult[] = data._embedded.events
          .map((event: TicketmasterEvent) => convertTicketmasterToPlaceResult(event))
          .filter((event: PlaceResult) => event.openNow)

        const uniqueForCategory: PlaceResult[] = []
        for (const ev of converted) {
          if (excludeIds.includes(ev.id)) continue
          if (seenIds.has(ev.id)) continue
          const nameKey = normalizeName(ev.name)
          if (seenNames.has(nameKey)) continue // avoid multiple dates of same named game/show
          seenIds.add(ev.id)
          seenNames.add(nameKey)
          uniqueForCategory.push(ev)
          if (uniqueForCategory.length >= perCategoryLimit) break
        }

        allEvents.push(...uniqueForCategory)
        console.log(`Found ${uniqueForCategory.length} unique Ticketmaster events for ${category.keyword}`)
      } else {
        console.log(`No events found for ${category.keyword}`)
      }
      
      if (allEvents.length >= limit) break
    }
    
    return allEvents.slice(0, limit)

  } catch (error) {
    console.error('Error fetching Ticketmaster events:', error)
    return []
  }
}

// Main function to fetch events from all sources
export async function fetchAllEvents(
  city: string,
  maxResults = 10,
  excludeIds: string[] = []
): Promise<PlaceResult[]> {
  try {
    const allEvents: PlaceResult[] = []
    
    // Fetch from Eventbrite (prioritized for local/community events)
    const eventbriteEvents = await fetchEventbriteEvents(city, Math.ceil(maxResults * 0.7), excludeIds)
    allEvents.push(...eventbriteEvents)
    
    // Fetch from Ticketmaster (for major events/concerts)
    const remainingSlots = maxResults - allEvents.length
    if (remainingSlots > 0) {
      const newExcludeIds = [...excludeIds, ...allEvents.map(e => e.id)]
      const ticketmasterEvents = await fetchTicketmasterEvents(city, remainingSlots, newExcludeIds)
      allEvents.push(...ticketmasterEvents)
    }
    
    // Shuffle to mix different event sources
    const shuffledEvents = allEvents.sort(() => Math.random() - 0.5)
    
    console.log(`Total events fetched: ${shuffledEvents.length} for ${city}`)
    return shuffledEvents.slice(0, maxResults)
    
  } catch (error) {
    console.error('Error fetching events from all sources:', error)
    return []
  }
}

// Helper function to convert Eventbrite event to PlaceResult
function convertEventbriteToPlaceResult(event: EventbriteEvent): PlaceResult {
  // Calculate price based on ticket info
  let price = 2 // Default to moderate pricing
  if (event.is_free) {
    price = 1
  } else if (event.ticket_availability?.minimum_ticket_price?.value) {
    const minPrice = event.ticket_availability.minimum_ticket_price.value
    if (minPrice < 20) price = 1
    else if (minPrice < 50) price = 2
    else if (minPrice < 100) price = 3
    else price = 4
  }

  // Determine if event is happening now or soon
  const eventStart = new Date(event.start.utc)
  const now = new Date()
  const isUpcoming = eventStart > now

  return {
    id: `eventbrite-${event.id}`,
    name: event.name.text,
    address: event.venue?.address?.localized_address_display || event.venue?.name || 'Location TBD',
    rating: 4.3, // Events don't have ratings, use a good default
    price,
    category: 'event',
    photoUrl: event.logo?.url || undefined,
    openNow: isUpcoming,
    placeId: event.id,
  }
}

// Helper function to convert Ticketmaster event to PlaceResult  
function convertTicketmasterToPlaceResult(event: TicketmasterEvent): PlaceResult {
  // Calculate price based on price ranges
  let price = 3 // Default to higher pricing for Ticketmaster events
  if (event.priceRanges && event.priceRanges.length > 0) {
    const avgPrice = (event.priceRanges[0].min + event.priceRanges[0].max) / 2
    if (avgPrice < 30) price = 2
    else if (avgPrice < 75) price = 3
    else price = 4
  }

  // ALL Ticketmaster events should be categorized as 'event' since they happen on specific dates
  const category = 'event'
  
  // Get the best quality image from Ticketmaster API
  let eventImage = null
  let isGenericImage = false
  
  if (event.images && event.images.length > 0) {
    // Filter for high-quality images and prioritize 16:9 ratio images
    const highQualityImages = event.images.filter(img => img.width >= 400 && img.height >= 300)
    const idealImages = highQualityImages.filter(img => {
      const ratio = img.width / img.height
      return ratio >= 1.3 && ratio <= 1.8 // Good for cards/thumbnails
    })
    
    // Use ideal ratio image if available, otherwise use highest quality
    const imagesToUse = idealImages.length > 0 ? idealImages : highQualityImages
    
    if (imagesToUse.length > 0) {
      // Sort by quality (resolution) and take the best one
      const bestImage = imagesToUse.sort((a, b) => (b.width * b.height) - (a.width * a.height))[0]
      eventImage = bestImage.url
      console.log(`Using real Ticketmaster image for ${event.name}: ${eventImage}`)
    }
  }
  
  // Use generic event image if no real image available
  if (!eventImage) {
    const eventImages = [
      "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?q=80&w=600&auto=format&fit=crop", // Concert/music event
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?q=80&w=600&auto=format&fit=crop", // Live music performance
      "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?q=80&w=600&auto=format&fit=crop", // Theater/stage performance
      "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=600&auto=format&fit=crop", // Concert venue
      "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?q=80&w=600&auto=format&fit=crop", // Music festival
      "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?q=80&w=600&auto=format&fit=crop", // Concert crowd
      "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=600&auto=format&fit=crop", // Theater seats
      "https://images.unsplash.com/photo-1583912267550-3ed0991b8e33?q=80&w=600&auto=format&fit=crop", // Live performance
    ]
    
    // Choose event image based on event type/classification
    const classifications = event.classifications || []
    const segment = classifications[0]?.segment?.name?.toLowerCase() || ''
    const genre = classifications[0]?.genre?.name?.toLowerCase() || ''
    
    if (segment.includes('music') || genre.includes('music')) {
      eventImage = eventImages[Math.floor(Math.random() * 3)] // Music-related images
    } else if (segment.includes('arts') || segment.includes('theatre') || genre.includes('theatre')) {
      eventImage = eventImages[2] // Theater performance
    } else if (segment.includes('sports')) {
      eventImage = eventImages[5] // Crowd/audience
    } else {
      eventImage = eventImages[Math.floor(Math.random() * eventImages.length)]
    }
    
    isGenericImage = true
    console.log(`Using generic event image for ${event.name}: ${eventImage}`)
  }

  // Build address from venue info
  let address = 'Venue TBD'
  if (event.venues && event.venues.length > 0) {
    const venue = event.venues[0]
    address = `${venue.name}, ${venue.address?.line1 || ''}, ${venue.city?.name || ''}`.trim()
  }

  // Check if event is upcoming
  const eventDate = new Date(event.dates.start.localDate)
  const now = new Date()
  const isUpcoming = eventDate > now

  return {
    id: `ticketmaster-${event.id}`,
    name: event.name,
    address,
    rating: 4.5,
    price,
    category: 'event', // All Ticketmaster events are time-specific events
    photoUrl: eventImage,
    openNow: isUpcoming,
    placeId: event.id,
  }
}

// Fallback events for when APIs are unavailable
export function createFallbackEvents(city: string, count = 5): PlaceResult[] {
  const eventTypes = [
    'Live Music Night',
    'Art Gallery Opening', 
    'Food Festival',
    'Comedy Show',
    'Wine Tasting',
    'Trivia Night',
    'Book Reading',
    'Dance Class',
    'Cooking Workshop',
    'Outdoor Movie'
  ]

  const venues = [
    'Downtown Community Center',
    'The Local Theater', 
    'City Park Pavilion',
    'Main Street Gallery',
    'Riverside Venue',
    'Cultural Arts Center',
    'The Underground',
    'Civic Center',
    'Library Auditorium',
    'Town Square'
  ]

  // Better event-specific images
  const eventImages = [
    "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?q=80&w=600&auto=format&fit=crop", // Concert/music event
    "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?q=80&w=600&auto=format&fit=crop", // Live music performance
    "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?q=80&w=600&auto=format&fit=crop", // Theater/stage performance
    "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=600&auto=format&fit=crop", // Concert venue
    "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?q=80&w=600&auto=format&fit=crop", // Music festival
    "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?q=80&w=600&auto=format&fit=crop", // Concert crowd
    "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=600&auto=format&fit=crop", // Theater seats
    "https://images.unsplash.com/photo-1583912267550-3ed0991b8e33?q=80&w=600&auto=format&fit=crop", // Live performance
  ]

  return Array.from({ length: count }, (_, i) => ({
    id: `fallback-event-${i}-${Date.now()}`,
    name: eventTypes[i % eventTypes.length],
    address: `${venues[i % venues.length]}, ${city}`,
    rating: 3.8 + Math.random() * 1.2,
    price: Math.floor(Math.random() * 3) + 1,
    category: 'event' as const,
    photoUrl: eventImages[i % eventImages.length],
    openNow: Math.random() > 0.3, // 70% chance of being available
    placeId: `fallback-event-${i}`,
  }))
} 