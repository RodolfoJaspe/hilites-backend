const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

class AIVideoDiscoveryService {
  constructor() {
    this.huggingFaceApiKey = process.env.HUGGING_FACE_API_KEY;
    this.youtubeApiKey = process.env.YOUTUBE_API_KEY;
    this.baseUrl = 'https://api-inference.huggingface.co/models';
    this.youtubeBaseUrl = 'https://www.googleapis.com/youtube/v3';
    
    // Model configurations for different tasks (using more robust models)
    this.models = {
      // Text classification for relevance scoring
      relevance: 'cardiffnlp/twitter-roberta-base-sentiment-latest',
      // Text generation for search query optimization (fallback to simple approach)
      textGeneration: 'gpt2',
      // Text summarization for video descriptions
      summarization: 'facebook/bart-large-cnn',
      // Named entity recognition for team/player extraction
      ner: 'dslim/bert-base-NER'
    };
    
    // Rate limiting
    this.requestCount = 0;
    this.lastReset = Date.now();
    this.maxRequestsPerMinute = 60; // Hugging Face free tier limit
  }

  /**
   * Check if we can make a request based on rate limits
   */
  canMakeRequest() {
    const now = Date.now();
    if (now - this.lastReset > 60000) { // Reset every minute
      this.requestCount = 0;
      this.lastReset = now;
    }
    return this.requestCount < this.maxRequestsPerMinute;
  }

  /**
   * Make a request to Hugging Face Inference API
   */
  async makeHuggingFaceRequest(modelId, inputs, options = {}) {
    if (!this.canMakeRequest()) {
      throw new Error('Rate limit exceeded. Please wait before making more requests.');
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/${modelId}`,
        {
          inputs,
          options: {
            wait_for_model: true,
            use_cache: false,
            ...options
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.huggingFaceApiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 second timeout
        }
      );

      this.requestCount++;
      return response.data;
    } catch (error) {
      console.error(`Error calling Hugging Face model ${modelId}:`, error.message);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }
      throw new Error(`Failed to call Hugging Face model: ${error.message}`);
    }
  }

  /**
   * Search YouTube for videos related to a match
   */
  async searchYouTubeVideos(matchData, maxResults = 10) {
    try {
      console.log(`🔍 Searching YouTube for: ${matchData.home_team.name} vs ${matchData.away_team.name}`);
      
      // Generate optimized search queries using AI
      const searchQueries = await this.generateSearchQueries(matchData);
      
      const allVideos = [];
      
      for (const query of searchQueries) {
        try {
          const response = await axios.get(`${this.youtubeBaseUrl}/search`, {
            params: {
              part: 'snippet',
              q: query,
              type: 'video',
              maxResults: Math.ceil(maxResults / searchQueries.length),
              order: 'relevance',
              key: this.youtubeApiKey
            },
            timeout: 10000
          });

          if (response.data.items) {
            allVideos.push(...response.data.items);
          }
        } catch (queryError) {
          console.warn(`Error searching with query "${query}":`, queryError.message);
          // If it's a 403 error (quota exceeded), throw a more specific error
          if (queryError.response?.status === 403) {
            throw new Error('YouTube API quota exceeded. Please try again later.');
          }
        }
      }

      // Get detailed video information
      const videoIds = allVideos.map(video => video.id.videoId).slice(0, maxResults);
      const detailedVideos = await this.getYouTubeVideoDetails(videoIds);
      
      return detailedVideos;
    } catch (error) {
      console.error('Error searching YouTube:', error.message);
      throw error;
    }
  }

  /**
   * Generate optimized search queries using AI
   */
  async generateSearchQueries(matchData) {
    try {
      const prompt = `Generate 3 optimized YouTube search queries for finding highlight videos of this football match:
      
Match: ${matchData.home_team.name} vs ${matchData.away_team.name}
Competition: ${matchData.competition_name}
Date: ${new Date(matchData.match_date).toLocaleDateString()}

Requirements:
- Include team names
- Include "highlights" or "goals"
- Include competition name if relevant
- Keep queries under 100 characters
- Make them specific to find the best highlight videos

Return only the 3 search queries, one per line:`;

      const response = await this.makeHuggingFaceRequest(
        this.models.textGeneration,
        prompt,
        { max_new_tokens: 150, temperature: 0.7 }
      );

      // Parse the response to extract queries
      const queries = response[0]?.generated_text
        ?.split('\n')
        .filter(line => line.trim().length > 0)
        .slice(0, 3) || [];

      // Fallback queries if AI generation fails
      const fallbackQueries = [
        `${matchData.home_team.name} vs ${matchData.away_team.name} highlights`,
        `${matchData.home_team.name} ${matchData.away_team.name} goals`,
        `${matchData.competition_name} ${matchData.home_team.name} vs ${matchData.away_team.name}`
      ];

      return queries.length > 0 ? queries : fallbackQueries;
    } catch (error) {
      console.warn('Error generating search queries with AI, using fallback:', error.message);
      return [
        `${matchData.home_team.name} vs ${matchData.away_team.name} highlights`,
        `${matchData.home_team.name} ${matchData.away_team.name} goals`,
        `${matchData.competition_name} ${matchData.home_team.name} vs ${matchData.away_team.name}`
      ];
    }
  }

  /**
   * Get detailed information about YouTube videos
   */
  async getYouTubeVideoDetails(videoIds) {
    try {
      const response = await axios.get(`${this.youtubeBaseUrl}/videos`, {
        params: {
          part: 'snippet,statistics,contentDetails',
          id: videoIds.join(','),
          key: this.youtubeApiKey
        },
        timeout: 10000
      });

      return response.data.items || [];
    } catch (error) {
      console.error('Error getting YouTube video details:', error.message);
      throw error;
    }
  }

  /**
   * Analyze video relevance using AI
   */
  async analyzeVideoRelevance(video, matchData) {
    try {
      const videoText = `${video.snippet.title} ${video.snippet.description}`;
      
      // Extract team names and competition from video text
      const extractedEntities = await this.extractEntities(videoText);
      
      // Calculate relevance score
      const relevanceScore = this.calculateRelevanceScore(
        videoText,
        matchData,
        extractedEntities
      );

      // Analyze sentiment (positive sentiment = good highlights)
      const sentimentScore = await this.analyzeSentiment(videoText);

      // Calculate quality score based on views, likes, etc.
      const qualityScore = this.calculateQualityScore(video);

      return {
        relevanceScore,
        sentimentScore,
        qualityScore,
        extractedEntities,
        finalScore: (relevanceScore * 0.5) + (sentimentScore * 0.3) + (qualityScore * 0.2)
      };
    } catch (error) {
      console.error('Error analyzing video relevance:', error.message);
      return {
        relevanceScore: 0.5,
        sentimentScore: 0.5,
        qualityScore: 0.5,
        extractedEntities: [],
        finalScore: 0.5
      };
    }
  }

  /**
   * Extract entities (teams, players) from video text
   */
  async extractEntities(text) {
    try {
      const response = await this.makeHuggingFaceRequest(
        this.models.ner,
        text,
        { max_new_tokens: 200 }
      );

      return response[0] || [];
    } catch (error) {
      console.warn('Error extracting entities:', error.message);
      return [];
    }
  }

  /**
   * Calculate relevance score based on text matching
   */
  calculateRelevanceScore(videoText, matchData, extractedEntities) {
    const text = videoText.toLowerCase();
    let score = 0;
    let matches = 0;

    // Check for team names
    const homeTeam = matchData.home_team.name.toLowerCase();
    const awayTeam = matchData.away_team.name.toLowerCase();
    
    if (text.includes(homeTeam)) {
      score += 0.3;
      matches++;
    }
    if (text.includes(awayTeam)) {
      score += 0.3;
      matches++;
    }

    // Check for competition name
    const competition = matchData.competition_name.toLowerCase();
    if (text.includes(competition)) {
      score += 0.2;
      matches++;
    }

    // Check for highlight keywords
    const highlightKeywords = ['highlights', 'goals', 'best moments', 'summary', 'recap'];
    const foundKeywords = highlightKeywords.filter(keyword => text.includes(keyword));
    score += foundKeywords.length * 0.1;

    // Check for date relevance (if mentioned)
    const matchDate = new Date(matchData.match_date);
    const dateStr = matchDate.toLocaleDateString().toLowerCase();
    if (text.includes(dateStr)) {
      score += 0.2;
    }

    // Normalize score
    return Math.min(score, 1.0);
  }

  /**
   * Analyze sentiment of video text
   */
  async analyzeSentiment(text) {
    try {
      // Truncate text to avoid token length issues (first 200 characters)
      const truncatedText = text.substring(0, 200);
      
      const response = await this.makeHuggingFaceRequest(
        this.models.relevance,
        truncatedText,
        { max_new_tokens: 10 }
      );

      // Extract sentiment score (assuming positive sentiment is better for highlights)
      const sentiment = response[0]?.[0];
      if (sentiment?.label === 'POSITIVE') {
        return sentiment.score;
      } else if (sentiment?.label === 'NEGATIVE') {
        return 1 - sentiment.score;
      }
      return 0.5; // Neutral
    } catch (error) {
      console.warn('Error analyzing sentiment:', error.message);
      return 0.5;
    }
  }

  /**
   * Calculate quality score based on video metrics
   */
  calculateQualityScore(video) {
    const stats = video.statistics;
    const views = parseInt(stats.viewCount) || 0;
    const likes = parseInt(stats.likeCount) || 0;
    const dislikes = parseInt(stats.dislikeCount) || 0;
    const comments = parseInt(stats.commentCount) || 0;

    // Calculate engagement rate
    const totalInteractions = likes + dislikes + comments;
    const engagementRate = views > 0 ? totalInteractions / views : 0;

    // Calculate like ratio
    const likeRatio = (likes + dislikes) > 0 ? likes / (likes + dislikes) : 0.5;

    // Normalize scores (higher is better)
    const viewScore = Math.min(views / 1000000, 1.0); // Cap at 1M views
    const engagementScore = Math.min(engagementRate * 100, 1.0); // Cap at 1%
    const likeScore = likeRatio;

    return (viewScore * 0.4) + (engagementScore * 0.3) + (likeScore * 0.3);
  }

  /**
   * Process a single match for video discovery (on-demand only)
   */
  async processSingleMatchForVideoDiscovery(matchId) {
    try {
      console.log(`🤖 Starting AI video discovery for match: ${matchId}`);

      // Get the specific match
      const { data: match, error } = await supabase
        .from('matches')
        .select(`
          *,
          home_team:teams!matches_home_team_id_fkey(name, short_name),
          away_team:teams!matches_away_team_id_fkey(name, short_name)
        `)
        .eq('id', matchId)
        .single();

      if (error) throw error;
      if (!match) throw new Error('Match not found');

      console.log(`⚽ Processing match: ${match.home_team.name} vs ${match.away_team.name}`);
      
      // Search for videos
      let videos = [];
      try {
        videos = await this.searchYouTubeVideos(match, 20);
      } catch (searchError) {
        console.warn(`⚠️ YouTube search failed for match ${match.id}:`, searchError.message);
        // Return a response indicating no videos were found due to API limits
        return {
          match: {
            id: match.id,
            home_team: match.home_team.name,
            away_team: match.away_team.name,
            competition: match.competition_name
          },
          videosFound: 0,
          highlightsStored: 0,
          bestVideos: [],
          error: searchError.message
        };
      }
      
      // Analyze and score videos
      const scoredVideos = [];
      for (const video of videos) {
        const analysis = await this.analyzeVideoRelevance(video, match);
        scoredVideos.push({
          ...video,
          analysis
        });
      }

      // Sort by final score and take the best ones
      const bestVideos = scoredVideos
        .sort((a, b) => b.analysis.finalScore - a.analysis.finalScore)
        .slice(0, 3);

      // Store highlights in database
      const storedVideos = [];
      for (const video of bestVideos) {
        try {
          await this.storeHighlight(match.id, video);
          storedVideos.push(video);
        } catch (storeError) {
          console.warn(`⚠️ Could not store video ${video.id}: ${storeError.message}`);
        }
      }

      console.log(`✅ Processed match: ${match.home_team.name} vs ${match.away_team.name} - Found ${storedVideos.length} highlights`);

      return {
        match: {
          id: match.id,
          home_team: match.home_team.name,
          away_team: match.away_team.name,
          competition: match.competition_name
        },
        videosFound: videos.length,
        highlightsStored: storedVideos.length,
        bestVideos: storedVideos.map(v => ({
          title: v.snippet.title,
          score: v.analysis.finalScore,
          url: `https://www.youtube.com/watch?v=${v.id}`
        }))
      };
    } catch (error) {
      console.error('❌ Error in AI video discovery process:', error.message);
      throw error;
    }
  }

  /**
   * Store highlight in database
   */
  async storeHighlight(matchId, video) {
    try {
      const highlightData = {
        match_id: matchId,
        youtube_video_id: video.id,
        youtube_url: `https://www.youtube.com/watch?v=${video.id}`,
        title: video.snippet.title,
        description: video.snippet.description,
        thumbnail_url: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.default?.url,
        duration_seconds: this.parseDuration(video.contentDetails.duration),
        view_count: parseInt(video.statistics.viewCount) || 0,
        like_count: parseInt(video.statistics.likeCount) || 0,
        channel_name: video.snippet.channelTitle,
        relevance_score: video.analysis.relevanceScore,
        quality_score: video.analysis.qualityScore,
        is_verified: video.analysis.finalScore > 0.7
      };

      const { error } = await supabase
        .from('match_highlights')
        .insert(highlightData);

      if (error) throw error;

      console.log(`💾 Stored highlight: ${video.snippet.title}`);
    } catch (error) {
      console.error('Error storing highlight:', error.message);
      throw error;
    }
  }

  /**
   * Parse YouTube duration format (PT4M13S) to seconds
   */
  parseDuration(duration) {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;

    const hours = parseInt(match[1]) || 0;
    const minutes = parseInt(match[2]) || 0;
    const seconds = parseInt(match[3]) || 0;

    return hours * 3600 + minutes * 60 + seconds;
  }

  /**
   * Get processing statistics
   */
  async getProcessingStats() {
    try {
      const { data: stats, error } = await supabase
        .from('ai_processing_logs')
        .select('status, processing_type')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const summary = {
        total: stats.length,
        completed: stats.filter(s => s.status === 'completed').length,
        failed: stats.filter(s => s.status === 'failed').length,
        pending: stats.filter(s => s.status === 'pending').length,
        processing: stats.filter(s => s.status === 'processing').length
      };

      return summary;
    } catch (error) {
      console.error('Error getting processing stats:', error.message);
      return { total: 0, completed: 0, failed: 0, pending: 0, processing: 0 };
    }
  }
}

module.exports = AIVideoDiscoveryService;
