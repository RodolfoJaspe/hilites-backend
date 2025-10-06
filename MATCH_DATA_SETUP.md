# Match Data Integration Setup Guide

This guide will help you set up the match data integration for the Hilites app.

## 🔑 **Required API Keys**

### **1. Football-Data.org API Key (Primary)**

- **Website**: https://www.football-data.org/client/register
- **Free Tier**: 10 requests/minute, 500 requests/day
- **Coverage**: Major European leagues, international competitions
- **Environment Variable**: `FOOTBALL_DATA_API_KEY`

### **2. API-Football Key (Backup)**

- **Website**: https://www.api-football.com/
- **Free Tier**: 100 requests/day
- **Coverage**: 950+ leagues worldwide
- **Environment Variable**: `API_FOOTBALL_KEY`

### **3. YouTube Data API Key (For AI Video Discovery)**

- **Website**: https://console.developers.google.com/
- **Free Tier**: 10,000 units/day
- **Purpose**: Search for match highlight videos
- **Environment Variable**: `YOUTUBE_API_KEY`

### **4. Hugging Face Access Token (For AI Video Discovery)**

- **Website**: https://huggingface.co/settings/tokens
- **Free Tier**: Unlimited inference for public models
- **Purpose**: AI model inference for video analysis
- **Environment Variable**: `HUGGING_FACE_API_KEY`

## 🚀 **Setup Instructions**

### **Step 1: Get API Keys**

1. **Football-Data.org**:

   - Go to https://www.football-data.org/client/register
   - Register for a free account
   - Copy your API key

2. **API-Football** (Optional):

   - Go to https://www.api-football.com/
   - Sign up for free tier
   - Get your API key

3. **YouTube Data API**:

   - Go to https://console.developers.google.com/
   - Create a new project or select existing
   - Enable YouTube Data API v3
   - Create credentials (API key)
   - Copy the API key

4. **Hugging Face Access Token**:

   - Go to https://huggingface.co/settings/tokens
   - Sign up or log in to your account
   - Click "New token"
   - Select "Read" permissions (sufficient for inference)
   - Copy the access token

5. **OpenAI API Key** (Optional - for advanced AI features):
   - Go to https://platform.openai.com/api-keys
   - Sign up or log in to your OpenAI account
   - Click "Create new secret key"
   - Give it a name (e.g., "Hilites App")
   - Copy the API key (starts with "sk-")
   - **Note**: OpenAI requires a paid account with credits

### **Step 2: Update Environment Variables**

Add these to your `.env` file:

```env
# Football Data APIs
FOOTBALL_DATA_API_KEY=your_football_data_org_api_key_here
API_FOOTBALL_KEY=your_api_football_key_here

# YouTube Data API
YOUTUBE_API_KEY=your_youtube_data_api_key_here

# AI/LLM APIs (for AI video discovery - FREE!)
HUGGING_FACE_API_KEY=your_hugging_face_access_token_here
# OPENAI_API_KEY=your_openai_api_key_here  # Optional - requires paid account
```

### **Step 3: Test the Integration**

Run the test script to verify everything is working:

```bash
cd hilites-backend
node scripts/test-match-data.js
```

Expected output:

```
🧪 Testing Match Data Integration...

1️⃣ Testing API connectivity...
✅ API key found

2️⃣ Testing competitions fetch...
✅ Successfully fetched 50+ competitions
   - Premier League (league) - England
   - La Liga (league) - Spain
   - Serie A (league) - Italy
   - Bundesliga (league) - Germany
   - Ligue 1 (league) - France

3️⃣ Testing today's matches fetch...
✅ Successfully fetched X matches for today

4️⃣ Testing database storage...
✅ Successfully stored test competition
✅ Test data cleaned up

5️⃣ Testing background processor...
✅ Background processor status: { is_processing: false, last_processed: null }

6️⃣ Testing matches without highlights query...
✅ Found X matches without highlights

🎉 Match Data Integration Test Completed!
```

## 🔧 **New API Endpoints**

The following new endpoints are now available:

### **Match Data Endpoints**

- `GET /api/matches` - Get all matches with filtering and pagination
- `GET /api/matches/:id` - Get specific match with highlights
- `GET /api/matches/:id/highlights` - Get highlights for a match
- `GET /api/matches/today` - Get today's matches
- `GET /api/matches/upcoming` - Get upcoming matches
- `POST /api/matches/refresh` - Manually refresh match data
- `GET /api/matches/stats` - Get match statistics

### **Example API Calls**

```javascript
// Get today's matches
fetch("/api/matches/today")
  .then((response) => response.json())
  .then((data) => console.log(data));

// Get matches for Premier League
fetch("/api/matches?competition_id=PL&limit=10")
  .then((response) => response.json())
  .then((data) => console.log(data));

// Get upcoming matches
fetch("/api/matches/upcoming?limit=20")
  .then((response) => response.json())
  .then((data) => console.log(data));

// Refresh match data
fetch("/api/matches/refresh", { method: "POST" })
  .then((response) => response.json())
  .then((data) => console.log(data));
```

## 🤖 **Background Processing**

The system includes automated background processing for:

- **Daily Match Fetching**: Automatically fetches today's matches
- **Score Updates**: Updates live and finished match scores
- **AI Processing Queue**: Identifies matches that need highlight videos
- **Log Cleanup**: Removes old processing logs

### **Manual Background Processing**

You can trigger background processing manually:

```javascript
// In your backend code
const BackgroundProcessor = require("./services/backgroundProcessor");
const processor = new BackgroundProcessor();

// Process new matches
await processor.processNewMatches();

// Get matches for AI processing
const matches = await processor.getMatchesForAIProcessing(10);
```

## 📊 **Data Flow**

```
Football-Data.org API → MatchDataService → Supabase Database → Frontend
                                    ↓
                            BackgroundProcessor → AI Processing Queue
```

## 🚨 **Rate Limiting**

The system includes built-in rate limiting:

- **Football-Data.org**: 10 requests/minute (free tier)
- **API-Football**: 100 requests/day (free tier)
- **YouTube Data API**: 10,000 units/day (free tier)

## 🔍 **Monitoring**

Monitor the system using:

```javascript
// Get processing statistics
const stats = await processor.getProcessingStats();
console.log(stats);

// Get processor status
const status = processor.getStatus();
console.log(status);
```

## 🛠️ **Troubleshooting**

### **Common Issues**

1. **API Key Not Working**:

   - Verify the API key is correct
   - Check if you've exceeded rate limits
   - Ensure the API key has proper permissions

2. **No Matches Found**:

   - Check if there are matches scheduled for today
   - Verify the competition IDs are correct
   - Check API response for errors

3. **Database Connection Issues**:
   - Verify Supabase credentials
   - Check if tables exist
   - Ensure RLS policies allow access

### **Debug Mode**

Enable debug logging by setting:

```env
NODE_ENV=development
```

## 🎯 **Next Steps**

1. **Test the API endpoints** using the examples above
2. **Set up automated background processing** (cron jobs or scheduled functions)
3. **Integrate with frontend** to display match data
4. **Set up AI video discovery** (next phase)

## 📚 **Additional Resources**

- [Football-Data.org API Documentation](https://www.football-data.org/documentation/quickstart)
- [API-Football Documentation](https://www.api-football.com/documentation)
- [YouTube Data API Documentation](https://developers.google.com/youtube/v3)
- [Supabase Documentation](https://supabase.com/docs)

---

The match data integration is now ready! The system will automatically fetch and store match data, making it available for the AI video discovery phase.
