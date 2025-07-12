# Explore Feature API Setup Guide

## API Requirements

The Explore feature integrates with multiple APIs to provide rich venue data:

1. **Google Places API** - Restaurants, activities, outdoor venues
2. **Eventbrite API** - Events and experiences  
3. **Ticketmaster API** - Events and shows
4. **Yelp Fusion API** - Restaurant data and reviews

## API Key Setup

### 1. Eventbrite API
```bash
# Get your API key from: https://www.eventbrite.com/platform/api-keys
EVENTBRITE_PRIVATE_TOKEN=your_eventbrite_token_here
```

### 2. Ticketmaster API
```bash
# Get your API key from: https://developer.ticketmaster.com/products-and-docs/apis/getting-started/
TICKETMASTER_API_KEY=your_ticketmaster_key_here
```

### 3. Yelp Fusion API
```bash
# Get your API key from: https://www.yelp.com/developers/v3/manage_app
YELP_API_KEY=your_yelp_api_key_here
```

### 4. Google Places API
```bash
# Get your API key from: https://console.cloud.google.com/apis/credentials
GOOGLE_API_KEY=your_google_api_key_here
```

## 🚨 Current Issues & Solutions

### Issue 1: Google Places API Billing Required
**Error**: `"This API method requires billing to be enabled"`
**Solution**: 
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (#887413991830)
3. Navigate to Billing
4. Enable billing for your project
5. Even with billing enabled, you get $200 free credit monthly

### Issue 2: Eventbrite API 404 Error
**Error**: `"Eventbrite API error: 404 NOT FOUND"`
**Possible Solutions**:
1. Check your API token is correct
2. Verify your token has proper permissions
3. Try regenerating your token

### Issue 3: Rate Limiting
**Error**: `"Rate limit exceeded. Please try again later."`
**Solution**: 
- Rate limits have been increased for explore feature
- Wait 60 seconds between requests if hitting limits
- For development, you can temporarily disable rate limiting

## API Request Limits (Free Tiers)

| API | Free Limit | Current Usage Pattern |
|-----|------------|----------------------|
| Google Places | $200 credit (~40,000 requests) | ~20 requests per page load |
| Eventbrite | 1,000 requests/day | ~5 requests per page load |
| Ticketmaster | 5,000 requests/day | ~5 requests per page load |
| Yelp Fusion | 500 requests/day | ~10 requests per page load |

**Total Monthly Capacity**: ~195,000 requests  
**Estimated Monthly Usage**: ~72,000 requests (based on 60 users/day)

## Testing API Status

Run these commands to test your API setup:

```bash
# Test all APIs
curl "http://localhost:3000/api/explore?city=San Francisco&limit=5"

# Test trending (requires Google Places)
curl "http://localhost:3000/api/explore?city=San Francisco&trending=true"

# Test social features
curl "http://localhost:3000/api/explore?city=San Francisco&social=true"
```

## Development Mode

For development without API keys, the explore feature falls back to:
- ✅ **Mock trending data** 
- ✅ **Mock social activity**
- ✅ **Fallback venues** with stock photos
- ✅ **Generated events** with realistic data

## Production Readiness

Current Status:
- ✅ Ticketmaster API: **Working**
- ✅ Yelp API: **Working**  
- ❌ Google Places API: **Needs Billing**
- ❌ Eventbrite API: **Needs Configuration**

## Next Steps

1. **Enable Google Places billing** (priority 1)
2. **Fix Eventbrite API token** (priority 2)
3. **Test all APIs** with the provided curl commands
4. **Deploy to production** once all APIs are working

## Troubleshooting

### Google Places Billing
If you're getting billing errors:
1. Check your Google Cloud Console project
2. Verify billing is enabled
3. Check your billing account has a valid payment method
4. Wait 5-10 minutes after enabling billing

### Rate Limiting in Development
To temporarily disable rate limiting during development:
```typescript
// In lib/search-utils.ts, comment out the rate limiting check:
// if (!checkRateLimit(`explore-${userIp}`, 50, 60000)) {
//   throw new Error("Rate limit exceeded. Please try again later.")
// }
```

### API Key Testing
Test individual API keys:
```bash
# Test Google Places
curl "https://places.googleapis.com/v1/places:searchText" \
  -H "Content-Type: application/json" \
  -H "X-Goog-Api-Key: YOUR_API_KEY" \
  -d '{"textQuery": "restaurants in San Francisco"}'

# Test Yelp
curl "https://api.yelp.com/v3/businesses/search?location=San Francisco" \
  -H "Authorization: Bearer YOUR_API_KEY"
``` 