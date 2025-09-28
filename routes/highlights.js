const express = require('express');
const axios = require('axios');

const router = express.Router();

// Scorebat API configuration
const SCOREBAT_API_URL = 'https://www.scorebat.com/video-api/v1/';

// Cache configuration
let highlightsCache = {
  data: null,
  lastFetched: null,
  cacheExpiry: 15 * 60 * 1000, // 15 minutes in milliseconds
};

// Helper function to check if cache is valid
const isCacheValid = () => {
  if (!highlightsCache.data || !highlightsCache.lastFetched) {
    return false;
  }
  const now = Date.now();
  return (now - highlightsCache.lastFetched) < highlightsCache.cacheExpiry;
};

// Helper function to fetch highlights from Scorebat API
const fetchHighlightsFromAPI = async () => {
  try {
    console.log('🌐 Fetching highlights from Scorebat API...');
    
    const response = await axios.get(SCOREBAT_API_URL, {
      timeout: 10000, // 10 second timeout
      headers: {
        'User-Agent': 'Hilites-App/1.0',
        'Accept': 'application/json'
      }
    });

    if (response.status === 200 && Array.isArray(response.data)) {
      console.log(`✅ Successfully fetched ${response.data.length} highlights from Scorebat`);
      return response.data;
    } else {
      throw new Error(`Invalid response from Scorebat API: ${response.status}`);
    }
  } catch (error) {
    console.error('❌ Error fetching from Scorebat API:', error.message);
    
    // Return cached data if API fails and we have cached data
    if (highlightsCache.data) {
      console.log('🔄 Falling back to cached highlights data');
      return highlightsCache.data;
    }
    
    throw error;
  }
};

// Helper function to transform highlights data for frontend
const transformHighlightsData = (highlights) => {
  return highlights.map(match => ({
    id: match.title?.replace(/\s+/g, '-').toLowerCase() || `match-${Date.now()}`,
    title: match.title || 'Match Highlights',
    embed: match.embed || '',
    thumbnail: extractThumbnailFromEmbed(match.embed),
    date: match.date || new Date().toISOString(),
    competition: extractCompetition(match.title),
    teams: extractTeams(match.title),
    duration: extractDuration(match.embed),
    views: match.views || 0,
    likes: match.likes || 0
  }));
};

// Helper function to extract thumbnail from embed code
const extractThumbnailFromEmbed = (embed) => {
  if (!embed) return null;
  
  // Try to extract thumbnail from various embed formats
  const thumbnailRegex = /(?:thumbnail|poster|image)["\s]*[:=]["\s]*["']([^"']+)["']/i;
  const match = embed.match(thumbnailRegex);
  
  if (match && match[1]) {
    return match[1];
  }
  
  // Fallback: try to extract from src or data attributes
  const srcRegex = /(?:src|data-src)["\s]*[:=]["\s]*["']([^"']+)["']/i;
  const srcMatch = embed.match(srcRegex);
  
  return srcMatch ? srcMatch[1] : null;
};

// Helper function to extract competition from title
const extractCompetition = (title) => {
  if (!title) return 'Unknown Competition';
  
  // Common competition patterns
  const competitions = [
    'Premier League', 'La Liga', 'Serie A', 'Bundesliga', 'Ligue 1',
    'Champions League', 'Europa League', 'Europa Conference League',
    'FA Cup', 'Copa del Rey', 'Coppa Italia', 'DFB-Pokal', 'Coupe de France',
    'World Cup', 'Euro', 'Copa America', 'Nations League'
  ];
  
  for (const competition of competitions) {
    if (title.toLowerCase().includes(competition.toLowerCase())) {
      return competition;
    }
  }
  
  return 'Other';
};

// Helper function to extract teams from title
const extractTeams = (title) => {
  if (!title) return { home: 'Unknown', away: 'Unknown' };
  
  // Split title by common separators
  const separators = [' - ', ' vs ', ' v ', ' against '];
  let teams = [title];
  
  for (const separator of separators) {
    if (title.includes(separator)) {
      teams = title.split(separator);
      break;
    }
  }
  
  if (teams.length >= 2) {
    return {
      home: teams[0].trim(),
      away: teams[1].trim()
    };
  }
  
  return { home: 'Team A', away: 'Team B' };
};

// Helper function to extract duration from embed
const extractDuration = (embed) => {
  if (!embed) return null;
  
  // Look for duration patterns in embed code
  const durationRegex = /(?:duration|length)["\s]*[:=]["\s]*["']?(\d+)(?::(\d+))?["']?/i;
  const match = embed.match(durationRegex);
  
  if (match) {
    const minutes = parseInt(match[1]) || 0;
    const seconds = parseInt(match[2]) || 0;
    return minutes * 60 + seconds;
  }
  
  return null;
};

// GET /api/highlights - Get all match highlights
router.get('/', async (req, res) => {
  try {
    console.log('📺 Highlights request received');
    
    // Check if we have valid cached data
    if (isCacheValid()) {
      console.log('📦 Returning cached highlights data');
      return res.json({
        success: true,
        data: transformHighlightsData(highlightsCache.data),
        cached: true,
        lastUpdated: new Date(highlightsCache.lastFetched).toISOString(),
        count: highlightsCache.data.length
      });
    }

    // Fetch fresh data from API
    const highlights = await fetchHighlightsFromAPI();
    
    // Update cache
    highlightsCache.data = highlights;
    highlightsCache.lastFetched = Date.now();
    
    console.log(`🎉 Successfully processed ${highlights.length} highlights`);
    
    res.json({
      success: true,
      data: transformHighlightsData(highlights),
      cached: false,
      lastUpdated: new Date().toISOString(),
      count: highlights.length
    });

  } catch (error) {
    console.error('❌ Highlights fetch error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch highlights',
      message: 'Unable to retrieve match highlights at this time',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/highlights/refresh - Force refresh highlights cache
router.get('/refresh', async (req, res) => {
  try {
    console.log('🔄 Force refresh requested');
    
    // Clear cache and fetch fresh data
    highlightsCache.data = null;
    highlightsCache.lastFetched = null;
    
    const highlights = await fetchHighlightsFromAPI();
    
    // Update cache
    highlightsCache.data = highlights;
    highlightsCache.lastFetched = Date.now();
    
    console.log(`🔄 Cache refreshed with ${highlights.length} highlights`);
    
    res.json({
      success: true,
      message: 'Highlights cache refreshed successfully',
      data: transformHighlightsData(highlights),
      count: highlights.length,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Cache refresh error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to refresh highlights',
      message: 'Unable to refresh highlights cache',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/highlights/competition/:competition - Get highlights by competition
router.get('/competition/:competition', async (req, res) => {
  try {
    const { competition } = req.params;
    console.log(`🏆 Highlights request for competition: ${competition}`);
    
    // Get highlights data (from cache or API)
    let highlights;
    if (isCacheValid()) {
      highlights = highlightsCache.data;
    } else {
      highlights = await fetchHighlightsFromAPI();
      highlightsCache.data = highlights;
      highlightsCache.lastFetched = Date.now();
    }
    
    // Filter by competition
    const filteredHighlights = highlights.filter(match => {
      const matchCompetition = extractCompetition(match.title);
      return matchCompetition.toLowerCase() === competition.toLowerCase();
    });
    
    res.json({
      success: true,
      data: transformHighlightsData(filteredHighlights),
      competition: competition,
      count: filteredHighlights.length,
      lastUpdated: new Date(highlightsCache.lastFetched).toISOString()
    });

  } catch (error) {
    console.error('❌ Competition highlights error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch competition highlights',
      message: 'Unable to retrieve highlights for this competition',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/highlights/search - Search highlights by team name
router.get('/search', async (req, res) => {
  try {
    const { q: query } = req.query;
    
    // Decode URL-encoded query and validate
    const decodedQuery = query ? decodeURIComponent(query).trim() : '';
    
    if (!decodedQuery || decodedQuery.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Invalid search query',
        message: 'Search query must be at least 2 characters long',
        received: query
      });
    }
    
    console.log(`🔍 Highlights search for: ${decodedQuery}`);
    
    // Get highlights data (from cache or API)
    let highlights;
    if (isCacheValid()) {
      highlights = highlightsCache.data;
    } else {
      highlights = await fetchHighlightsFromAPI();
      highlightsCache.data = highlights;
      highlightsCache.lastFetched = Date.now();
    }
    
    // Search in titles
    const searchTerm = decodedQuery.toLowerCase();
    const filteredHighlights = highlights.filter(match => {
      return match.title && match.title.toLowerCase().includes(searchTerm);
    });
    
    res.json({
      success: true,
      data: transformHighlightsData(filteredHighlights),
      query: decodedQuery,
      count: filteredHighlights.length,
      lastUpdated: new Date(highlightsCache.lastFetched).toISOString()
    });

  } catch (error) {
    console.error('❌ Highlights search error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to search highlights',
      message: 'Unable to search highlights at this time',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/highlights/stats - Get highlights statistics
router.get('/stats', async (req, res) => {
  try {
    console.log('📊 Highlights stats requested');
    
    // Get highlights data (from cache or API)
    let highlights;
    if (isCacheValid()) {
      highlights = highlightsCache.data;
    } else {
      highlights = await fetchHighlightsFromAPI();
      highlightsCache.data = highlights;
      highlightsCache.lastFetched = Date.now();
    }
    
    // Calculate statistics
    const competitions = {};
    const teams = {};
    
    highlights.forEach(match => {
      const competition = extractCompetition(match.title);
      const teamData = extractTeams(match.title);
      
      competitions[competition] = (competitions[competition] || 0) + 1;
      teams[teamData.home] = (teams[teamData.home] || 0) + 1;
      teams[teamData.away] = (teams[teamData.away] || 0) + 1;
    });
    
    res.json({
      success: true,
      stats: {
        totalMatches: highlights.length,
        competitions: Object.keys(competitions).length,
        topCompetitions: Object.entries(competitions)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5)
          .map(([name, count]) => ({ name, count })),
        topTeams: Object.entries(teams)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10)
          .map(([name, count]) => ({ name, count })),
        lastUpdated: new Date(highlightsCache.lastFetched).toISOString(),
        cacheAge: highlightsCache.lastFetched ? 
          Math.floor((Date.now() - highlightsCache.lastFetched) / 1000) : null
      }
    });

  } catch (error) {
    console.error('❌ Highlights stats error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch highlights statistics',
      message: 'Unable to retrieve statistics at this time',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
