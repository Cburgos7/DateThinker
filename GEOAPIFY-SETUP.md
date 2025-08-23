# Hybrid API Setup Guide

## Overview
This project has been updated to use a cost-effective hybrid approach:
- **Geoapify** for restaurants and activities (cost-effective venue discovery)
- **Eventbrite + Ticketmaster** for events (completely free APIs)
- **Yelp** for restaurant data (free tier available)

This approach provides the best of both worlds - cost-effective venue discovery with free event APIs.

## Setup Instructions

### 1. Get a Geoapify API Key (for restaurants & activities)
1. Visit [Geoapify](https://www.geoapify.com/)
2. Sign up for a free account
3. Navigate to your dashboard
4. Copy your API key

### 2. Get Eventbrite API Key (for events - FREE)
1. Visit [Eventbrite Developer Portal](https://www.eventbrite.com/platform/)
2. Sign up or log in with your Eventbrite account
3. Create an app and get your Private Token

### 3. Get Ticketmaster API Key (for events - FREE)
1. Visit [Ticketmaster Developer Portal](https://developer.ticketmaster.com/)
2. Sign up for a developer account
3. Create an app and get your Consumer Key

### 4. Get Yelp API Key (optional - for restaurant data)
1. Visit [Yelp Fusion API](https://www.yelp.com/developers/v3/manage_app)
2. Sign up and create an app
3. Copy your API Key

### 5. Add Environment Variables
Add the following to your `.env.local` file:

```bash
# Geoapify (for restaurants & activities)
GEOAPIFY_API_KEY=your_geoapify_api_key_here

# Event APIs (FREE)
EVENTBRITE_PRIVATE_TOKEN=your_eventbrite_private_token
TICKETMASTER_API_KEY=your_ticketmaster_consumer_key

# Restaurant API (optional)
YELP_API_KEY=your_yelp_api_key_here
```

## API Usage Limits & Costs

### Free APIs (Events)
- **Eventbrite**: 1,000 requests/day (free)
- **Ticketmaster**: 5,000 requests/day (free)
- **Total Event API Cost**: $0

### Cost-Effective APIs (Venues)
- **Geoapify**: 3,000 requests/day (free tier)
- **Yelp**: 500 requests/day (free tier)
- **Total Venue API Cost**: $0 (free tier)

### Cost Comparison
- **Old Google Places API**: ~$17 per 1000 requests
- **New Hybrid Approach**: $0 for typical usage
- **Savings**: 100% cost reduction for most use cases

## What's Changed

### API Integration Strategy
- **Events**: Eventbrite + Ticketmaster (completely free)
- **Restaurants**: Geoapify + Yelp (cost-effective)
- **Activities**: Geoapify (cost-effective)
- **Images**: Free event images from Eventbrite/Ticketmaster + emoji placeholders for venues

### Updated Files
- **New File**: `lib/geoapify.ts` - Geoapify API integration
- **Updated**: `lib/search-utils.ts` - Hybrid API approach
- **Updated**: `lib/events-api.ts` - Eventbrite + Ticketmaster integration
- **Updated**: `app/api/explore/route.ts` - Uses hybrid approach
- **Updated**: `components/explore-simple.tsx` - No image dependencies

### Features
- ✅ Free event discovery (Eventbrite + Ticketmaster)
- ✅ Cost-effective venue discovery (Geoapify)
- ✅ Restaurant data (Yelp + Geoapify)
- ✅ Activity discovery (Geoapify)
- ✅ Free event images (Eventbrite + Ticketmaster)
- ✅ Emoji placeholders for venues without images
- ✅ Category filtering
- ✅ Search functionality

## Testing
1. Set up your API keys
2. Navigate to the explore page
3. Enter a city name
4. Verify:
   - Events are loading from Eventbrite/Ticketmaster
   - Restaurants are loading from Geoapify/Yelp
   - Activities are loading from Geoapify

## Expected Results
- **Events**: Real concerts, workshops, festivals, sports events
- **Restaurants**: Local dining options with ratings and details
- **Activities**: Entertainment venues, attractions, experiences

## Support
If you encounter issues:
1. Check all API keys are correctly set
2. Verify your accounts are active
3. Check browser console for error messages
4. Review API documentation for limits
