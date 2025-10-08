const express = require('express');
const AIVideoDiscoveryService = require('../services/aiVideoDiscoveryService');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();
const aiVideoDiscoveryService = new AIVideoDiscoveryService();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// GET /api/ai-discovery/status - Get AI processing status
router.get('/status', async (req, res) => {
  try {
    const stats = await aiVideoDiscoveryService.getProcessingStats();
    
    res.json({
      success: true,
      data: {
        ...stats,
        models: {
          relevance: 'cardiffnlp/twitter-roberta-base-sentiment-latest',
          textGeneration: 'microsoft/DialoGPT-medium',
          summarization: 'facebook/bart-large-cnn',
          ner: 'dbmdz/bert-large-cased-finetuned-conll03-english'
        },
        rateLimit: {
          requestsPerMinute: 60,
          currentRequests: aiVideoDiscoveryService.requestCount
        }
      },
      message: 'AI discovery service status retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting AI discovery status:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get AI discovery status',
      message: error.message
    });
  }
});

// POST /api/ai-discovery/process - Process a single match for video discovery (on-demand)
router.post('/process', async (req, res) => {
  try {
    const { matchId } = req.body;
    
    if (!matchId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter',
        message: 'matchId is required for on-demand video discovery'
      });
    }
    
    console.log('🤖 AI video discovery process triggered for match:', matchId);
    
    // Process single match on-demand
    const result = await aiVideoDiscoveryService.processSingleMatchForVideoDiscovery(matchId);
    
    res.json({
      success: true,
      data: result,
      message: `Processed match: ${result.match.home_team} vs ${result.match.away_team}`
    });
  } catch (error) {
    console.error('Error in AI video discovery process:', error.message);
    
    // Check if it's a YouTube quota error
    if (error.message.includes('YouTube API quota exceeded')) {
      return res.status(429).json({
        success: false,
        error: 'YouTube API quota exceeded',
        message: 'The YouTube API daily quota has been exceeded. Highlights will be available again tomorrow. Please check back later.',
        retryAfter: '24 hours'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to process AI video discovery',
      message: error.message
    });
  }
});

// GET /api/ai-discovery/test-model/:modelType - Test a specific model
router.get('/test-model/:modelType', async (req, res) => {
  try {
    const { modelType } = req.params;
    const { input } = req.query;

    if (!input) {
      return res.status(400).json({
        success: false,
        error: 'Input parameter is required',
        message: 'Please provide an input query parameter'
      });
    }

    let modelId;
    let testInput = input;

    switch (modelType) {
      case 'relevance':
        modelId = aiVideoDiscoveryService.models.relevance;
        break;
      case 'text-generation':
        modelId = aiVideoDiscoveryService.models.textGeneration;
        break;
      case 'summarization':
        modelId = aiVideoDiscoveryService.models.summarization;
        break;
      case 'ner':
        modelId = aiVideoDiscoveryService.models.ner;
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid model type',
          message: 'Valid types: relevance, text-generation, summarization, ner'
        });
    }

    console.log(`🧪 Testing model ${modelType} with input: ${input}`);

    const result = await aiVideoDiscoveryService.makeHuggingFaceRequest(
      modelId,
      testInput,
      { max_new_tokens: 100 }
    );

    res.json({
      success: true,
      data: {
        modelType,
        modelId,
        input: testInput,
        result
      },
      message: `Model ${modelType} test completed successfully`
    });
  } catch (error) {
    console.error(`Error testing model ${req.params.modelType}:`, error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to test model',
      message: error.message
    });
  }
});

// GET /api/ai-discovery/search-queries/:matchId - Generate search queries for a match
router.get('/search-queries/:matchId', async (req, res) => {
  try {
    const { matchId } = req.params;

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
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });

    const searchQueries = await aiVideoDiscoveryService.generateSearchQueries(match);

    res.json({
      success: true,
      data: {
        match: {
          id: match.id,
          home_team: match.home_team.name,
          away_team: match.away_team.name,
          competition: match.competition_name,
          date: match.match_date
        },
        searchQueries
      },
      message: 'Search queries generated successfully'
    });
  } catch (error) {
    console.error('Error generating search queries:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to generate search queries',
      message: error.message
    });
  }
});

// GET /api/ai-discovery/analyze-video - Analyze a specific YouTube video
router.get('/analyze-video', async (req, res) => {
  try {
    const { videoId, matchId } = req.query;

    if (!videoId || !matchId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters',
        message: 'Both videoId and matchId are required'
      });
    }

    // Get match data
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select(`
        *,
        home_team:teams!matches_home_team_id_fkey(name, short_name),
        away_team:teams!matches_away_team_id_fkey(name, short_name)
      `)
      .eq('id', matchId)
      .single();

    if (matchError) throw matchError;
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });

    // Get video details
    const videos = await aiVideoDiscoveryService.getYouTubeVideoDetails([videoId]);
    if (videos.length === 0) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }

    const video = videos[0];
    const analysis = await aiVideoDiscoveryService.analyzeVideoRelevance(video, match);

    res.json({
      success: true,
      data: {
        video: {
          id: video.id,
          title: video.snippet.title,
          description: video.snippet.description,
          channel: video.snippet.channelTitle,
          views: video.statistics.viewCount,
          likes: video.statistics.likeCount,
          url: `https://www.youtube.com/watch?v=${video.id}`
        },
        match: {
          id: match.id,
          home_team: match.home_team.name,
          away_team: match.away_team.name,
          competition: match.competition_name
        },
        analysis
      },
      message: 'Video analysis completed successfully'
    });
  } catch (error) {
    console.error('Error analyzing video:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze video',
      message: error.message
    });
  }
});

// GET /api/ai-discovery/highlights/:matchId - Get AI-discovered highlights for a match
router.get('/highlights/:matchId', async (req, res) => {
  try {
    const { matchId } = req.params;

    const { data: highlights, error } = await supabase
      .from('match_highlights')
      .select('*')
      .eq('match_id', matchId)
      .order('relevance_score', { ascending: false });

    if (error) throw error;

    // Check if there are processing errors logged for this match
    const { data: logs } = await supabase
      .from('ai_processing_logs')
      .select('*')
      .eq('match_id', matchId)
      .eq('status', 'error')
      .order('created_at', { ascending: false })
      .limit(1);

    // If there are recent errors indicating quota exceeded
    if (logs && logs.length > 0) {
      const latestLog = logs[0];
      if (latestLog.error_message && latestLog.error_message.includes('YouTube API quota exceeded')) {
        return res.status(429).json({
          success: false,
          error: 'YouTube API quota exceeded',
          message: 'The YouTube API daily quota has been exceeded. Highlights will be available again tomorrow.',
          data: [],
          count: 0
        });
      }
    }

    res.json({
      success: true,
      data: highlights,
      count: highlights.length,
      message: `Found ${highlights.length} AI-discovered highlights`
    });
  } catch (error) {
    console.error('Error getting AI highlights:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get AI highlights',
      message: error.message
    });
  }
});

// GET /api/ai-discovery/matches-without-highlights - Get matches that need highlights (for frontend)
router.get('/matches-without-highlights', async (req, res) => {
  try {
    const { limit = 20, competition_id } = req.query;

    // Get finished matches without highlights
    let query = supabase
      .from('matches')
      .select(`
        id,
        external_id,
        competition_name,
        match_date,
        home_score,
        away_score,
        home_team:teams!matches_home_team_id_fkey(name, short_name, logo_url),
        away_team:teams!matches_away_team_id_fkey(name, short_name, logo_url)
      `)
      .eq('status', 'finished')
      .not('home_score', 'is', null)
      .not('away_score', 'is', null)
      .order('match_date', { ascending: false })
      .limit(parseInt(limit));

    if (competition_id) {
      query = query.eq('competition_id', competition_id);
    }

    const { data: matches, error } = await query;

    if (error) throw error;

    // Filter out matches that already have highlights
    const matchesWithoutHighlights = [];
    for (const match of matches) {
      const { data: existingHighlights } = await supabase
        .from('match_highlights')
        .select('id')
        .eq('match_id', match.id)
        .limit(1);

      if (!existingHighlights || existingHighlights.length === 0) {
        matchesWithoutHighlights.push(match);
      }
    }

    res.json({
      success: true,
      data: matchesWithoutHighlights,
      count: matchesWithoutHighlights.length,
      message: `Found ${matchesWithoutHighlights.length} matches without highlights`
    });
  } catch (error) {
    console.error('Error getting matches without highlights:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get matches without highlights',
      message: error.message
    });
  }
});

module.exports = router;
