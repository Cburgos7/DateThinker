import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const venueId = params.id
    
    if (!venueId) {
      return NextResponse.json({ error: 'Venue ID is required' }, { status: 400 })
    }

    console.log(`Fetching venue details for ID: ${venueId}`)

    // Try to fetch enhanced details based on venue ID type
    let enhancedDetails = null

    // Check if it's a Yelp venue (starts with 'yelp-')
    if (venueId.startsWith('yelp-')) {
      const businessId = venueId.replace('yelp-', '')
      enhancedDetails = await fetchYelpBusinessDetails(businessId)
    }
    // Check if it's a Google Places venue (starts with 'google-')
    else if (venueId.startsWith('google-')) {
      const placeId = venueId.split('-').slice(2).join('-') // Remove 'google-category-' prefix
      enhancedDetails = await fetchGooglePlaceDetails(placeId)
    }
    // Check if it's an event venue (starts with 'eventbrite-' or 'ticketmaster-')
    else if (venueId.startsWith('eventbrite-') || venueId.startsWith('ticketmaster-')) {
      enhancedDetails = await fetchEventDetails(venueId)
    }
    // Handle fallback and mock venues
    else if (venueId.startsWith('fallback-') || venueId.startsWith('mock-')) {
      enhancedDetails = await createFallbackVenueDetails(venueId)
    }
    // Handle any other venue format
    else {
      console.log(`Unknown venue ID format: ${venueId}, creating fallback details`)
      enhancedDetails = await createFallbackVenueDetails(venueId)
    }

    if (enhancedDetails) {
      return NextResponse.json(enhancedDetails)
    } else {
      // If all else fails, create basic fallback details
      const fallbackDetails = await createFallbackVenueDetails(venueId)
      return NextResponse.json(fallbackDetails)
    }

  } catch (error) {
    console.error('Error fetching venue details:', error)
    // Return fallback details instead of error
    try {
      const fallbackDetails = await createFallbackVenueDetails(params.id)
      return NextResponse.json(fallbackDetails)
    } catch (fallbackError) {
      return NextResponse.json({ error: 'Failed to fetch venue details' }, { status: 500 })
    }
  }
}

async function fetchYelpBusinessDetails(businessId: string) {
  try {
    const apiKey = process.env.YELP_API_KEY
    
    if (!apiKey) {
      console.warn("Yelp API key not configured")
      return null
    }

    const response = await fetch(`https://api.yelp.com/v3/businesses/${businessId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store'
    })

    if (!response.ok) {
      console.error(`Yelp business details API error: ${response.status}`)
      return null
    }

    const business = await response.json()
    
    // Transform Yelp data to our format
    return {
      id: `yelp-${business.id}`,
      name: business.name,
      rating: business.rating,
      priceLevel: business.price ? business.price.length : 2,
      photos: business.photos || [],
      description: business.categories?.map((cat: any) => cat.title).join(', '),
      category: 'restaurant',
      address: business.location.display_address.join(', '),
      phone: business.display_phone,
      website: business.url,
      hours: transformYelpHours(business.hours),
      openNow: !business.is_closed,
      reviews: business.reviews || [],
      amenities: ['Wi-Fi', 'Accepts Credit Cards', 'Wheelchair Accessible'],
      coordinates: business.coordinates
    }

  } catch (error) {
    console.error('Error fetching Yelp business details:', error)
    return null
  }
}

async function fetchGooglePlaceDetails(placeId: string) {
  try {
    // This would use Google Places Details API
    // For now, fall back to our intelligent fallback system
    console.log(`Google Places Details API not implemented, using fallback for place ID: ${placeId}`)
    
    // Create a venue ID that includes the place ID for better fallback handling
    const fallbackVenueId = `google-place-${placeId}`
    return await createFallbackVenueDetails(fallbackVenueId)

  } catch (error) {
    console.error('Error fetching Google Place details:', error)
    return null
  }
}

async function fetchEventDetails(eventId: string) {
  try {
    // Extract platform and ID
    const [platform, id] = eventId.split('-', 2)
    
    if (platform === 'eventbrite') {
      return await fetchEventbriteEventDetails(id)
    } else if (platform === 'ticketmaster') {
      return await fetchTicketmasterEventDetails(id)
    }
    
    return null

  } catch (error) {
    console.error('Error fetching event details:', error)
    return null
  }
}

async function fetchEventbriteEventDetails(eventId: string) {
  // Mock enhanced event details for now
  return {
    id: `eventbrite-${eventId}`,
    name: "Special Event",
    rating: 4.3,
    photos: [
      'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=600&h=400&fit=crop',
      'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&h=400&fit=crop'
    ],
    description: "Join us for an amazing event experience!",
    category: 'event',
    address: "Event Venue, 456 Event St, City, State",
    website: "https://eventbrite.com",
    eventDetails: {
      date: "Saturday, December 21, 2024",
      time: "7:00 PM - 11:00 PM",
      ticketPrice: "$25 - $75",
      venue: "The Grand Hall"
    },
    amenities: ['Advance Booking Required', 'Age 21+', 'Parking Available']
  }
}

async function fetchTicketmasterEventDetails(eventId: string) {
  try {
    const apiKey = process.env.TICKETMASTER_API_KEY
    
    if (!apiKey) {
      console.warn("Ticketmaster API key not configured, using mock data")
      return getMockTicketmasterEventDetails(eventId)
    }

    // Ticketmaster Event Details API endpoint
    const url = new URL(`https://app.ticketmaster.com/discovery/v2/events/${eventId}.json`)
    url.searchParams.append('apikey', apiKey)

    console.log(`Fetching Ticketmaster event details for event ID: ${eventId}`)

    const response = await fetch(url.toString(), {
      cache: 'no-store'
    })

    if (!response.ok) {
      console.error(`Ticketmaster event details API error: ${response.status} ${response.statusText}`)
      return getMockTicketmasterEventDetails(eventId)
    }

    const event = await response.json()
    
    // Transform the event data to our format
    const eventDate = new Date(event.dates.start.localDate + 'T' + (event.dates.start.localTime || '19:00'))
    const isUpcoming = eventDate > new Date()
    
    // Format the date properly
    const formattedDate = eventDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    
    const formattedTime = event.dates.start.localTime 
      ? new Date(`2000-01-01T${event.dates.start.localTime}`).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })
      : 'Time TBA'

    // Get venue information
    const venue = event._embedded?.venues?.[0]
    const venueAddress = venue ? `${venue.name}, ${venue.address?.line1 || ''}, ${venue.city?.name || ''}, ${venue.state?.stateCode || ''}`.trim() : 'Venue TBA'

    // Get price range
    let ticketPrice = 'Price TBA'
    if (event.priceRanges && event.priceRanges.length > 0) {
      const priceRange = event.priceRanges[0]
      ticketPrice = `$${priceRange.min} - $${priceRange.max}`
    }

    // Get best quality image
    const bestImage = event.images
      ?.filter((img: any) => img.width >= 400)
      ?.sort((a: any, b: any) => b.width - a.width)[0]

    // Get additional photos
    const photos = event.images
      ?.filter((img: any) => img.width >= 400)
      ?.sort((a: any, b: any) => b.width - a.width)
      ?.slice(0, 4)
      ?.map((img: any) => img.url) || []

    // Get classification info for description
    const classifications = event.classifications || []
    const segments = classifications.map((c: any) => c.segment?.name).filter(Boolean)
    const genres = classifications.map((c: any) => c.genre?.name).filter(Boolean)
    const description = segments.concat(genres).join(', ') || 'Live entertainment event'

    return {
      id: `ticketmaster-${eventId}`,
      name: event.name,
      rating: 4.7, // Events don't have ratings, use a good default
      photos: photos.length > 0 ? photos : [bestImage?.url].filter(Boolean),
      description: `${description}. ${event.info || 'An amazing live entertainment experience!'}`,
      category: 'event',
      address: venueAddress,
      website: event.url, // Use the actual event URL from Ticketmaster
      eventDetails: {
        date: formattedDate,
        time: formattedTime,
        ticketPrice,
        venue: venue?.name || 'Venue TBA'
      },
      amenities: getEventAmenities(event),
      isUpcoming
    }

  } catch (error) {
    console.error('Error fetching Ticketmaster event details:', error)
    return getMockTicketmasterEventDetails(eventId)
  }
}

function getMockTicketmasterEventDetails(eventId: string) {
  // Mock enhanced event details for fallback
  return {
    id: `ticketmaster-${eventId}`,
    name: "Concert Event",
    rating: 4.7,
    photos: [
      'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&h=400&fit=crop',
      'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&h=400&fit=crop'
    ],
    description: "An incredible live music experience!",
    category: 'event',
    address: "Concert Hall, 789 Music Ave, City, State",
    website: "https://ticketmaster.com",
    eventDetails: {
      date: "Future Event Date",
      time: "8:00 PM",
      ticketPrice: "$45 - $150",
      venue: "Symphony Hall"
    },
    amenities: ['All Ages', 'Concessions', 'Merchandise', 'Parking'],
    isUpcoming: true
  }
}

function getEventAmenities(event: any) {
  const amenities = []
  
  // Add age restrictions
  if (event.ageRestrictions?.legalAgeEnforced) {
    amenities.push('Age 21+')
  } else {
    amenities.push('All Ages')
  }
  
  // Add accessible seating if available
  if (event.accessibility?.info) {
    amenities.push('Accessible Seating')
  }
  
  // Add common venue amenities
  amenities.push('Concessions', 'Merchandise', 'Parking Available')
  
  return amenities
}

function transformYelpHours(yelpHours: any) {
  if (!yelpHours || !yelpHours[0] || !yelpHours[0].open) {
    return {
      'Monday': 'Hours not available',
      'Tuesday': 'Hours not available',
      'Wednesday': 'Hours not available', 
      'Thursday': 'Hours not available',
      'Friday': 'Hours not available',
      'Saturday': 'Hours not available',
      'Sunday': 'Hours not available'
    }
  }

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const hours: Record<string, string> = {}

  dayNames.forEach((day, index) => {
    const dayHours = yelpHours[0].open.find((h: any) => h.day === index)
    if (dayHours) {
      const start = formatTime(dayHours.start)
      const end = formatTime(dayHours.end)
      hours[day] = `${start} - ${end}`
    } else {
      hours[day] = 'Closed'
    }
  })

  return hours
}

function formatTime(timeString: string) {
  try {
    const time = new Date(`1970-01-01T${timeString}:00`)
    return time.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })
  } catch (error) {
    return timeString
  }
}

// Create minimal venue details with only verified information
async function createFallbackVenueDetails(venueId: string) {
  try {
    // Try to determine category from venue ID
    let category: 'restaurant' | 'activity' | 'outdoor' | 'event' = 'activity'
    let venueName = 'Unknown Venue'
    
    // Extract category from ID patterns
    if (venueId.includes('restaurant') || venueId.includes('cafe') || venueId.includes('bar')) {
      category = 'restaurant'
    } else if (venueId.includes('park') || venueId.includes('outdoor') || venueId.includes('trail') || venueId.includes('garden')) {
      category = 'outdoor'
    } else if (venueId.includes('event') || venueId.includes('concert') || venueId.includes('theater')) {
      category = 'event'
    } else if (venueId.includes('activity') || venueId.includes('museum') || venueId.includes('gallery')) {
      category = 'activity'
    }
    
    // Parse venue name from common ID formats
    if (venueId.startsWith('fallback-') || venueId.startsWith('mock-')) {
      // Try to extract venue name from fallback IDs
      const parts = venueId.split('-')
      if (parts.length > 2) {
        const nameIndex = parts.findIndex(part => part.match(/^[A-Z][a-z]/))
        if (nameIndex !== -1) {
          venueName = parts.slice(nameIndex).join(' ').replace(/\d+/g, '').trim()
        }
      }
    }
    
    // Special handling for known venue names - extract from ID
    if (venueId.toLowerCase().includes('mears') && venueId.toLowerCase().includes('park')) {
      venueName = 'Mears Park'
      category = 'outdoor'
    } else if (venueId.toLowerCase().includes('capitol')) {
      venueName = 'Minnesota State Capitol'
      category = 'activity'
    }
    
    // Generate category-appropriate images (this is the only "made up" data we'll provide)
    const categoryImages = {
      restaurant: [
        'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=400&fit=crop',
        'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=600&h=400&fit=crop',
        'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=600&h=400&fit=crop'
      ],
      activity: [
        'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=600&h=400&fit=crop',
        'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&h=400&fit=crop',
        'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=400&fit=crop'
      ],
      outdoor: [
        'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600&h=400&fit=crop', // Forest park
        'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=400&fit=crop', // Mountain landscape
        'https://images.unsplash.com/photo-1574263867128-a3e6a329d3d4?w=600&h=400&fit=crop', // City park
        'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?w=600&h=400&fit=crop', // Park pathway
        'https://images.unsplash.com/photo-1599608404398-4e6fd1c2e8dc?w=600&h=400&fit=crop'  // Urban park
      ],
      event: [
        'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=600&h=400&fit=crop',
        'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&h=400&fit=crop',
        'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=600&h=400&fit=crop'
      ]
    }
    
    // Only provide the basic information we have
    return {
      id: venueId,
      name: venueName,
      photos: categoryImages[category],
      description: "Limited information available for this venue.",
      category: category,
      // Don't provide fake contact info, hours, etc.
      address: undefined,
      phone: undefined,
      website: undefined,
      hours: undefined,
      openNow: undefined,
      rating: undefined,
      priceLevel: undefined,
      reviews: [],
      amenities: [],
      coordinates: undefined
    }
    
  } catch (error) {
    console.error('Error creating fallback venue details:', error)
    // Return very basic fallback
    return {
      id: venueId,
      name: "Venue",
      photos: [
        'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=600&h=400&fit=crop'
      ],
      description: "Information unavailable for this venue.",
      category: 'activity',
      address: undefined,
      phone: undefined,
      website: undefined,
      hours: undefined,
      openNow: undefined,
      rating: undefined,
      priceLevel: undefined,
      reviews: [],
      amenities: []
    }
  }
} 