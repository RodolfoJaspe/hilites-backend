# AI Video Discovery Setup Guide

This guide will help you set up the AI-powered video discovery system for the Hilites app using LangChain and Hugging Face models.

## 🤖 **AI Models Used**

### **1. Text Classification & Sentiment Analysis**

- **Model**: `cardiffnlp/twitter-roberta-base-sentiment-latest`
- **Purpose**: Analyze video titles and descriptions for positive sentiment
- **Task**: Sentiment analysis (POSITIVE/NEGATIVE/NEUTRAL)
- **Free Tier**: ✅ Unlimited inference

### **2. Text Generation**

- **Model**: `microsoft/DialoGPT-medium`
- **Purpose**: Generate optimized YouTube search queries
- **Task**: Text generation for search query optimization
- **Free Tier**: ✅ Unlimited inference

### **3. Text Summarization**

- **Model**: `facebook/bart-large-cnn`
- **Purpose**: Summarize video descriptions for better analysis
- **Task**: Text summarization
- **Free Tier**: ✅ Unlimited inference

### **4. Named Entity Recognition (NER)**

- **Model**: `dbmdz/bert-large-cased-finetuned-conll03-english`
- **Purpose**: Extract team names, player names, and other entities
- **Task**: Named entity recognition
- **Free Tier**: ✅ Unlimited inference

## 🔑 **Required API Keys**

### **1. Hugging Face Access Token**

- **Website**: https://huggingface.co/settings/tokens
- **Free Tier**: Unlimited inference for public models
- **Purpose**: AI model inference for video analysis
- **Environment Variable**: `HUGGING_FACE_API_KEY`

### **2. YouTube Data API Key**

- **Website**: https://console.developers.google.com/
- **Free Tier**: 10,000 units/day
- **Purpose**: Search for match highlight videos
- **Environment Variable**: `YOUTUBE_API_KEY`

## 🚀 **Setup Instructions**

### **Step 1: Get API Keys**

1. **Hugging Face Access Token**:

   - Go to https://huggingface.co/settings/tokens
   - Sign up or log in to your account
   - Click "New token"
   - Select "Read" permissions (sufficient for inference)
   - Copy the access token

2. **YouTube Data API Key**:
   - Go to https://console.developers.google.com/
   - Create a new project or select existing
   - Enable YouTube Data API v3
   - Create credentials (API key)
   - Copy the API key

### **Step 2: Update Environment Variables**

Add these to your `.env` file:

```env
# AI/LLM APIs (for AI video discovery - FREE!)
HUGGING_FACE_API_KEY=your_hugging_face_access_token_here
YOUTUBE_API_KEY=your_youtube_data_api_key_here
```

### **Step 3: Test the AI Discovery System**

Run the test script to verify everything is working:

```bash
cd hilites-backend
npm run test:ai-discovery
```

Expected output:

```
🤖 Testing AI Video Discovery Service...

1️⃣ Testing API keys...
✅ API keys found

2️⃣ Testing Hugging Face model connectivity...
✅ Hugging Face API working
   Sample result: POSITIVE

3️⃣ Testing YouTube API connectivity...
✅ YouTube API working
   Test video title: Rick Astley - Never Gonna Give You Up

4️⃣ Getting a test match...
✅ Found test match: Liverpool vs Manchester United

5️⃣ Testing search query generation...
✅ Search queries generated:
   1. Liverpool vs Manchester United highlights goals
   2. Liverpool Manchester United best moments
   3. Premier League Liverpool vs Man United

6️⃣ Testing YouTube video search...
✅ Found 15 videos on YouTube
   Sample video: Liverpool vs Manchester United - All Goals & Highlights

7️⃣ Testing video relevance analysis...
✅ Video analysis completed:
   Relevance Score: 0.85
   Sentiment Score: 0.78
   Quality Score: 0.92
   Final Score: 0.83

8️⃣ Testing individual model functions...
✅ Sentiment analysis: 0.78
✅ Entity extraction: 4 entities found
✅ Relevance calculation: 0.85

9️⃣ Testing processing statistics...
✅ Processing statistics:
   Total: 0
   Completed: 0
   Failed: 0
   Pending: 0

🎉 AI Video Discovery Test Completed!
```

## 🔧 **New API Endpoints**

The following new AI discovery endpoints are now available:

### **AI Discovery Endpoints**

- `GET /api/ai-discovery/status` - Get AI processing status and model info
- `POST /api/ai-discovery/process` - Process matches for video discovery
- `GET /api/ai-discovery/test-model/:modelType` - Test a specific AI model
- `GET /api/ai-discovery/search-queries/:matchId` - Generate search queries for a match
- `GET /api/ai-discovery/analyze-video` - Analyze a specific YouTube video
- `GET /api/ai-discovery/highlights/:matchId` - Get AI-discovered highlights for a match

### **Example API Calls**

```javascript
// Get AI discovery status
fetch("/api/ai-discovery/status")
  .then((response) => response.json())
  .then((data) => console.log(data));

// Process matches for video discovery
fetch("/api/ai-discovery/process", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ limit: 5 }),
})
  .then((response) => response.json())
  .then((data) => console.log(data));

// Test a specific model
fetch("/api/ai-discovery/test-model/relevance?input=Amazing football match!")
  .then((response) => response.json())
  .then((data) => console.log(data));

// Generate search queries for a match
fetch("/api/ai-discovery/search-queries/MATCH_ID")
  .then((response) => response.json())
  .then((data) => console.log(data));

// Analyze a YouTube video
fetch("/api/ai-discovery/analyze-video?videoId=VIDEO_ID&matchId=MATCH_ID")
  .then((response) => response.json())
  .then((data) => console.log(data));
```

## 🧠 **How the AI System Works**

### **1. Search Query Generation**

- Uses `microsoft/DialoGPT-medium` to generate optimized YouTube search queries
- Considers team names, competition, and date
- Creates 3 different search variations for better coverage

### **2. Video Discovery**

- Searches YouTube using generated queries
- Fetches detailed video information (views, likes, comments)
- Collects up to 20 videos per match

### **3. AI Analysis Pipeline**

- **Relevance Scoring**: Analyzes title/description for team names, competition, keywords
- **Sentiment Analysis**: Uses `cardiffnlp/twitter-roberta-base-sentiment-latest` for positive sentiment
- **Entity Extraction**: Uses `dbmdz/bert-large-cased-finetuned-conll03-english` for team/player names
- **Quality Scoring**: Based on views, engagement rate, like ratio

### **4. Final Scoring**

```
Final Score = (Relevance × 0.5) + (Sentiment × 0.3) + (Quality × 0.2)
```

### **5. Storage**

- Stores top 3 videos per match in `match_highlights` table
- Includes all analysis scores and metadata
- Marks videos as "verified" if final score > 0.7

## 📊 **Data Flow**

```
Match Data → AI Query Generation → YouTube Search → AI Analysis → Database Storage
     ↓              ↓                    ↓              ↓              ↓
Football-Data.org → DialoGPT → YouTube API → RoBERTa/BERT → Supabase
```

## 🚨 **Rate Limiting**

The system includes built-in rate limiting:

- **Hugging Face**: 60 requests/minute (free tier)
- **YouTube Data API**: 10,000 units/day (free tier)
- **Automatic queuing** and retry logic

## 🔍 **Monitoring**

Monitor the AI system using:

```javascript
// Get AI processing statistics
const stats = await aiService.getProcessingStats();
console.log(stats);

// Check rate limit status
const status = aiService.getStatus();
console.log(status);
```

## 🛠️ **Troubleshooting**

### **Common Issues**

1. **Hugging Face API Errors**:

   - Verify the access token is correct
   - Check if you've exceeded rate limits
   - Ensure the model is available and not loading

2. **YouTube API Errors**:

   - Verify the API key is correct
   - Check if you've exceeded daily quota
   - Ensure YouTube Data API v3 is enabled

3. **Model Loading Issues**:
   - Some models may take time to load on first use
   - The system includes `wait_for_model: true` to handle this
   - Consider using smaller models for faster response times

### **Debug Mode**

Enable debug logging by setting:

```env
NODE_ENV=development
```

## 🎯 **Next Steps**

1. **Test the AI models** using the test endpoints
2. **Run a full video discovery process** on existing matches
3. **Monitor the results** and adjust scoring weights if needed
4. **Set up automated processing** (background jobs)
5. **Integrate with frontend** to display AI-discovered highlights

## 📚 **Model Alternatives**

If you want to experiment with different models:

### **For Sentiment Analysis**:

- `cardiffnlp/twitter-roberta-base-sentiment-latest` (current)
- `nlptown/bert-base-multilingual-uncased-sentiment`
- `distilbert-base-uncased-finetuned-sst-2-english`

### **For Text Generation**:

- `microsoft/DialoGPT-medium` (current)
- `gpt2`
- `distilgpt2`

### **For NER**:

- `dbmdz/bert-large-cased-finetuned-conll03-english` (current)
- `dslim/bert-base-NER`
- `dbmdz/bert-large-cased-finetuned-conll03-english`

## 🎉 **Success Metrics**

The AI system is working well when:

- ✅ **Relevance Score > 0.7**: Videos are actually about the match
- ✅ **Sentiment Score > 0.6**: Videos have positive sentiment (good highlights)
- ✅ **Quality Score > 0.5**: Videos have decent view counts and engagement
- ✅ **Final Score > 0.6**: Overall good match between video and match

---

The AI video discovery system is now ready! The system will automatically find, analyze, and score YouTube videos to provide the best highlights for each match.


