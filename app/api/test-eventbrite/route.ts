import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.EVENTBRITE_PRIVATE_TOKEN
    
    if (!apiKey) {
      return NextResponse.json({ error: 'Eventbrite API key not configured' }, { status: 400 })
    }

    console.log('Testing Eventbrite API...')
    console.log(`API Key: ${apiKey.substring(0, 8)}...`)

    // Try different endpoints to find the working one
    const endpoints = [
      // Try the correct events search endpoint (without trailing slash)
      'https://www.eventbriteapi.com/v3/events/search?location.address=San Francisco&limit=5',
      // Try with different parameter format
      'https://www.eventbriteapi.com/v3/events/search?q=San Francisco&limit=5',
      // Try getting organizations events (more basic)
      'https://www.eventbriteapi.com/v3/organizations/me/events/?status=live&limit=5'
    ]

    for (const [index, url] of endpoints.entries()) {
      console.log(`Testing endpoint ${index + 1}: ${url}`)

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        }
      })

      console.log(`Response ${index + 1} status: ${response.status} ${response.statusText}`)
      
      const responseText = await response.text()
      console.log(`Response ${index + 1} body: ${responseText.substring(0, 200)}...`)

      if (response.ok) {
        const data = JSON.parse(responseText)
        return NextResponse.json({ 
          success: true,
          workingEndpoint: url,
          status: response.status,
          eventCount: data.events ? data.events.length : 0,
          data: data
        })
      }
    }

    return NextResponse.json({ 
      error: 'All endpoints failed',
      message: 'Tried multiple endpoints, none worked'
    }, { status: 404 })

  } catch (error) {
    console.error('Error testing Eventbrite API:', error)
    return NextResponse.json({ 
      error: 'Test failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 