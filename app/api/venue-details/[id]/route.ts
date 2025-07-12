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

    if (enhancedDetails) {
      return NextResponse.json(enhancedDetails)
    } else {
      return NextResponse.json({ error: 'Venue details not found' }, { status: 404 })
    }

  } catch (error) {
    console.error('Error fetching venue details:', error)
    return NextResponse.json({ error: 'Failed to fetch venue details' }, { status: 500 })
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
    // For now, return enhanced mock data
    return {
      id: `google-${placeId}`,
      name: "Enhanced Place Details",
      rating: 4.5,
      priceLevel: 3,
      photos: [
        'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=400&fit=crop',
        'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=600&h=400&fit=crop',
        'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=600&h=400&fit=crop'
      ],
      description: "A wonderful place to visit with great atmosphere and excellent service.",
      category: 'activity',
      address: "123 Main St, City, State 12345",
      phone: "(555) 123-4567",
      website: "https://example.com",
      hours: {
        'Monday': '9:00 AM - 9:00 PM',
        'Tuesday': '9:00 AM - 9:00 PM',
        'Wednesday': '9:00 AM - 9:00 PM',
        'Thursday': '9:00 AM - 10:00 PM',
        'Friday': '9:00 AM - 10:00 PM',
        'Saturday': '8:00 AM - 10:00 PM',
        'Sunday': '8:00 AM - 8:00 PM'
      },
      openNow: true,
      reviews: [
        {
          author: "Google User",
          rating: 5,
          text: "Excellent place, highly recommend!",
          timeAgo: "1 week ago"
        }
      ],
      amenities: ['Family Friendly', 'Parking Available', 'Wi-Fi']
    }

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
  const hour = parseInt(timeString.slice(0, 2))
  const minute = timeString.slice(2)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour)
  return `${displayHour}:${minute} ${ampm}`
} 