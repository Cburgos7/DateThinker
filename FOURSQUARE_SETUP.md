# Foursquare API Setup Instructions

## Why Foursquare?
Foursquare provides better restaurant data than Yelp:
- 105+ million POIs globally
- Better pagination support
- Multiple search strategies (popularity, rating, cuisine types)
- More consistent API responses
- Better international coverage

## Setup Steps

### 1. Get Foursquare API Key
1. Go to https://developer.foursquare.com/
2. Sign up or log in
3. Create a new project
4. Get your API key from the project dashboard

### 2. Add Environment Variable
Add this to your environment variables:
```bash
FOURSQUARE_API_KEY=your_api_key_here
```

**Note**: Foursquare API v3 requires Bearer token format. The code automatically handles both formats:
- `FOURSQUARE_API_KEY=fsq1234567890abcdef` (will add "Bearer " prefix automatically)
- `FOURSQUARE_API_KEY=Bearer fsq1234567890abcdef` (already formatted)

### 3. Test the Integration
Use the debug endpoints to test:

**Test Foursquare directly:**
```
GET /api/debug/restaurant-pool?city=Chicago&action=test-foursquare&count=20
```

**Test mixed pool (70% Foursquare + 30% Geoapify):**
```
GET /api/debug/restaurant-pool?city=Chicago&action=test&count=20
```

### 4. Expected Results
With Foursquare configured, you should see:
- 70% of restaurants from Foursquare
- 30% from Geoapify for local variety
- Much better variety and coverage
- Consistent 20+ places per "Load More"

## Current Configuration
- **Primary source**: Foursquare (70%)
- **Secondary source**: Geoapify (30%)
- **Removed**: Yelp (as requested)
- **Fallback**: If Foursquare fails, uses Geoapify only

## Debugging
Check the browser console or server logs for:
```
🍽️ Foursquare contributed X restaurants
🗺️ Geoapify contributed X unique restaurants
```

If you see "Foursquare contributed 0 restaurants", check:
1. API key is set correctly
2. API key has proper permissions
3. Network connectivity to Foursquare API
