import { sanitizeInput } from "./api-utils"
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

// Eventbrite API integration
export async function fetchEventbriteEvents(
  city: string, 
  limit = 10,
  excludeIds: string[] = []
): Promise<PlaceResult[]> {
  try {
    // TEMPORARY: Disable Eventbrite API until endpoint is fixed
    const DISABLE_EVENTBRITE = true // Set to false when fixed
    
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
    
    // Eventbrite API endpoint - try simpler request first
    const url = new URL('https://www.eventbriteapi.com/v3/events/search/')
    url.searchParams.append('location.address', sanitizedCity)
    url.searchParams.append('location.within', '25mi') // 25 mile radius
    url.searchParams.append('expand', 'venue')
    url.searchParams.append('limit', Math.min(limit, 50).toString()) // Eventbrite max is 50
    url.searchParams.append('sort_by', 'date') // Use 'date' instead of 'best'
    url.searchParams.append('status', 'live') // Only live events
    
    console.log(`Fetching events from Eventbrite for ${sanitizedCity}`)
    console.log(`Eventbrite API URL: ${url.toString()}`)
    console.log(`Using API token: ${apiKey.substring(0, 8)}...`)

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store' // Don't cache event data as it changes frequently
    })

    console.log(`Eventbrite response status: ${response.status} ${response.statusText}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Eventbrite API error: ${response.status} ${response.statusText}`)
      console.error(`Error response body:`, errorText)
      return []
    }

    const data = await response.json()
    console.log(`Eventbrite API response:`, JSON.stringify(data, null, 2))
    
    if (!data.events || data.events.length === 0) {
      console.log(`No Eventbrite events found for ${sanitizedCity}`)
      return []
    }

    console.log(`Found ${data.events.length} Eventbrite events for ${sanitizedCity}`)

    // Convert Eventbrite events to our PlaceResult format
    const events: PlaceResult[] = data.events
      .filter((event: EventbriteEvent) => !excludeIds.includes(event.id))
      .map((event: EventbriteEvent) => convertEventbriteToPlaceResult(event))

    return events

  } catch (error) {
    console.error('Error fetching Eventbrite events:', error)
    return []
  }
}

// Ticketmaster API integration  
export async function fetchTicketmasterEvents(
  city: string,
  limit = 10,
  excludeIds: string[] = []
): Promise<PlaceResult[]> {
  try {
    const apiKey = process.env.TICKETMASTER_API_KEY
    
    if (!apiKey) {
      console.warn("Ticketmaster API key not configured, skipping Ticketmaster events")
      return []
    }

    const sanitizedCity = sanitizeInput(city)
    
    // Get current date in ISO format for filtering future events
    const now = new Date()
    const startDateTime = now.toISOString()
    
    // Ticketmaster Discovery API endpoint
    const url = new URL('https://app.ticketmaster.com/discovery/v2/events.json')
    url.searchParams.append('city', sanitizedCity)
    url.searchParams.append('size', limit.toString())
    url.searchParams.append('sort', 'date,asc') // Sort by date, ascending (earliest first)
    url.searchParams.append('apikey', apiKey)
    url.searchParams.append('startDateTime', startDateTime) // Only future events
    
    // Filter for entertainment categories
    url.searchParams.append('classificationName', 'Music,Arts & Theatre,Film,Sports')

    console.log(`Fetching future events from Ticketmaster for ${sanitizedCity}`)
    console.log(`Start date filter: ${startDateTime}`)

    const response = await fetch(url.toString(), {
      cache: 'no-store'
    })

    if (!response.ok) {
      console.error(`Ticketmaster API error: ${response.status} ${response.statusText}`)
      return []
    }

    const data = await response.json()
    
    if (!data._embedded?.events || data._embedded.events.length === 0) {
      console.log(`No future Ticketmaster events found for ${sanitizedCity}`)
      return []
    }

    console.log(`Found ${data._embedded.events.length} future Ticketmaster events for ${sanitizedCity}`)

    // Convert Ticketmaster events to our PlaceResult format
    const events: PlaceResult[] = data._embedded.events
      .filter((event: TicketmasterEvent) => !excludeIds.includes(event.id))
      .map((event: TicketmasterEvent) => convertTicketmasterToPlaceResult(event))
      .filter((event: PlaceResult) => event.openNow) // Additional client-side filter for upcoming events

    return events

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

  // Get the best quality image
  const image = event.images
    ?.filter(img => img.width >= 400)
    ?.sort((a, b) => b.width - a.width)[0]

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
    rating: 4.5, // Ticketmaster events tend to be higher quality
    price,
    category: 'event',
    photoUrl: image?.url,
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

  return Array.from({ length: count }, (_, i) => ({
    id: `fallback-event-${i}-${Date.now()}`,
    name: eventTypes[i % eventTypes.length],
    address: `${venues[i % venues.length]}, ${city}`,
    rating: 3.8 + Math.random() * 1.2,
    price: Math.floor(Math.random() * 3) + 1,
    category: 'event' as const,
    photoUrl: `https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=400&h=300&fit=crop&auto=format&q=80&sig=${i}`,
    openNow: Math.random() > 0.3, // 70% chance of being available
    placeId: `fallback-event-${i}`,
  }))
} 