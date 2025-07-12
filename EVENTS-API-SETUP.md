# Explore API Setup Guide

This guide explains how to set up API keys for real events and restaurant data in your DateThinker explore feature.

## 🎭 API Providers

### 1. Eventbrite API (Recommended - Free)
- **Best for**: Local events, community gatherings, workshops, classes
- **Free tier**: 1000 requests/day
- **Data quality**: Excellent for community events

### 2. Ticketmaster Discovery API (Free)
- **Best for**: Concerts, sports, major entertainment events  
- **Free tier**: 5000 requests/day
- **Data quality**: Excellent for major events

### 3. Yelp Fusion API (Free)
- **Best for**: Restaurant photos, reviews, ratings, detailed info
- **Free tier**: 500 requests/day
- **Data quality**: Superior restaurant data with high-quality photos

## 🔑 Getting API Keys

### Eventbrite Setup

1. **Create Eventbrite Account**
   - Go to [Eventbrite Developer Portal](https://www.eventbrite.com/platform/)
   - Sign up or log in with your Eventbrite account

2. **Create an App**
   - Click "Create App" 
   - Fill in app details:
     - **App Name**: DateThinker Events
     - **App Description**: Dating app that helps users discover local events
     - **App URL**: Your domain (e.g., `https://yourdomain.com`)

3. **Get API Keys**
   - Once approved, you'll get a **Private Token**
   - Copy the "Private Token" - this is your API key

4. **Add to Environment Variables**
   ```bash
   EVENTBRITE_PRIVATE_TOKEN=your_private_token_here
   ```

### Ticketmaster Setup

1. **Create Ticketmaster Account**
   - Go to [Ticketmaster Developer Portal](https://developer.ticketmaster.com/)
   - Sign up for a developer account

2. **Create an App**
   - Click "Get Your API Key"
   - Fill in app details:
     - **App Name**: DateThinker
     - **App Description**: Dating platform discovering local events
     - **Website**: Your domain

3. **Get API Key**
   - You'll receive a **Consumer Key** immediately
   - Copy the Consumer Key

4. **Add to Environment Variables**
   ```bash
   TICKETMASTER_API_KEY=your_consumer_key_here
   ```

### Yelp Setup

1. **Create Yelp Developer Account**
   - Go to [Yelp Fusion API](https://www.yelp.com/developers/v3/manage_app)
   - Sign up or log in with your Yelp account

2. **Create an App**
   - Click "Create New App"
   - Fill in app details:
     - **App Name**: DateThinker Restaurant Explorer
     - **Industry**: Software
     - **Company**: Your company name
     - **Website**: Your domain
     - **Description**: Dating app that helps users discover restaurants

3. **Get API Key**
   - Once approved, you'll see your **API Key**
   - Copy the API Key (starts with your app name)

4. **Add to Environment Variables**
   ```bash
   YELP_API_KEY=your_yelp_api_key_here
   ```

## 📝 Environment Variables Setup

Add these to your `.env.local` file:

```bash
# Events API Keys
EVENTBRITE_PRIVATE_TOKEN=your_eventbrite_private_token
TICKETMASTER_API_KEY=your_ticketmaster_consumer_key

# Restaurant API Keys  
YELP_API_KEY=your_yelp_api_key

# Existing keys (keep these)
GOOGLE_API_KEY=your_existing_google_key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_existing_maps_key
# ... other existing variables
```

## 🚀 Testing the Integration

### 1. Check API Status
Navigate to your explore page and check the browser console for logs:
- `Fetching events from Eventbrite for [city]`
- `Found X Eventbrite events for [city]`

### 2. Test Different Cities
Try cities with active event scenes:
- New York, NY
- Los Angeles, CA  
- Chicago, IL
- Austin, TX
- Atlanta, GA

### 3. Verify Data Quality
Real events should show:
- ✅ Actual event names (not generic fallbacks)
- ✅ Real venue addresses
- ✅ Event-specific photos
- ✅ Accurate pricing tiers

## 🎯 Expected Results

### With API Keys Configured:
```
✅ Real concerts, workshops, and festivals
✅ High-quality restaurant photos from Yelp
✅ Accurate pricing and venue information  
✅ Restaurant reviews and ratings
✅ Up-to-date availability status
✅ 15-25 venues per city (mixed sources)
```

### Without API Keys (Fallback):
```
⚠️  Generic event names like "Live Music Night"
⚠️  Placeholder venues like "Downtown Community Center"  
⚠️  Stock photos from Unsplash
⚠️  Estimated pricing
⚠️  5-10 fallback events per city
```

## 🔧 Troubleshooting

### Common Issues:

**1. No events showing up**
- Check console for API errors
- Verify API keys are correct
- Ensure `.env.local` is in root directory
- Restart your development server

**2. API Rate Limits**
- Eventbrite: 1000 requests/day (free)
- Ticketmaster: 5000 requests/day (free)
- Consider upgrading if you hit limits

**3. API Errors**
- Check API key format (no extra spaces)
- Verify account is active and approved
- Test with common cities first

### Debug Commands:

```bash
# Check if environment variables are loaded
console.log(process.env.EVENTBRITE_PRIVATE_TOKEN ? 'Eventbrite key found' : 'Missing Eventbrite key')
console.log(process.env.TICKETMASTER_API_KEY ? 'Ticketmaster key found' : 'Missing Ticketmaster key')
console.log(process.env.YELP_API_KEY ? 'Yelp key found' : 'Missing Yelp key')
```

## 💰 Cost Considerations

### Free Tier Usage:
- **Eventbrite**: 1000 requests/day = ~30,000/month
- **Ticketmaster**: 5000 requests/day = ~150,000/month
- **Yelp**: 500 requests/day = ~15,000/month
- **Total**: 195,000+ free requests/month

### Estimated Usage:
- **Explore page load**: 3 API calls (1 per provider)
- **Daily users**: 100 users × 8 explores = 2400 calls/day
- **Monthly usage**: ~72,000 calls/month (well within free limits)

### Paid Upgrades:
- **Eventbrite**: $0.59 per 1000 requests after free tier
- **Ticketmaster**: Contact for enterprise pricing
- **Recommendation**: Start with free tiers, upgrade as needed

## 🎨 Customization Options

### Event Categories (Eventbrite):
```typescript
// In lib/events-api.ts, modify categories parameter:
url.searchParams.append('categories', '103,105,110,113,116') 

// Categories:
// 103 = Music
// 105 = Performing & Visual Arts  
// 110 = Food & Drink
// 113 = Community & Culture
// 116 = Business & Professional
```

### Search Radius:
```typescript
// Modify search radius (default: 25 miles)
url.searchParams.append('location.within', '10mi') // Smaller radius
url.searchParams.append('location.within', '50mi') // Larger radius
```

## 📈 Next Steps

Once events API is working:
1. **Test in production** with real user traffic
2. **Monitor API usage** and costs
3. **Add more event sources** (Facebook Events, Meetup, etc.)
4. **Implement caching** for popular cities
5. **Add event booking** integration

## ❓ Support

If you need help:
1. Check the console logs for specific error messages
2. Verify your API keys work with direct API calls
3. Ensure your environment variables are properly loaded
4. Test with different cities to isolate issues

---

🎉 **You're all set!** Once configured, your explore feature will show real, up-to-date events happening in users' cities, making DateThinker much more engaging and useful for discovering date activities. 