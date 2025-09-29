const express = require('express');
const axios = require('axios');

const router = express.Router();

// Scorebat API configuration
const SCOREBAT_API_URL = `https://www.scorebat.com/video-api/v3/feed/?token=${process.env.VIDEO_API_ACCESS_TOKEN}`;

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

    if (response.status === 200) {
      // Handle different response formats from Scorebat API
      let highlightsData;
      
      // Check if response.data is directly an array (Scorebat v3 format)
      if (Array.isArray(response.data)) {
        // Direct array format (v3)
        highlightsData = response.data;
        console.log('📋 Using direct array format (v3)');
      } else if (response.data && Array.isArray(response.data.response)) {
        // Scorebat v3 format with response property
        highlightsData = response.data.response;
        console.log('📋 Using Scorebat v3 format - data.response');
      } else if (response.data && Array.isArray(response.data.data)) {
        // Wrapped format (v1 or alternative)
        highlightsData = response.data.data;
        console.log('📋 Using wrapped format - data.data');
      } else if (response.data && Array.isArray(response.data.matches)) {
        // Alternative wrapped format
        highlightsData = response.data.matches;
        console.log('📋 Using alternative wrapped format - data.matches');
      } else {
        console.log('📋 API Response structure:', JSON.stringify(response.data, null, 2));
        console.log('📋 Response data type:', typeof response.data);
        console.log('📋 Response data keys:', response.data ? Object.keys(response.data) : 'No data object');
        console.log('📋 Is response.data array?', Array.isArray(response.data));
        console.log('📋 Response.data.response exists?', response.data && response.data.response);
        console.log('📋 Response.data.data exists?', response.data && response.data.data);
        console.log('📋 Response.data.matches exists?', response.data && response.data.matches);
        throw new Error(`Unexpected response format from Scorebat API`);
      }
      
      console.log(`✅ Successfully fetched ${highlightsData.length} highlights from Scorebat`);
      return highlightsData;
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
// Helper function to extract unique leagues/competitions
const extractUniqueLeagues = (highlights) => {
  const allLeagues = highlights.map(match => match.competition);
  const uniqueLeagues = [...new Set(allLeagues)]; // Remove duplicates
  
  // Convert string competitions to objects with generated IDs
  return uniqueLeagues.map((competitionName, index) => ({
    id: index + 1, // Generate sequential ID
    name: competitionName,
    url: `https://www.scorebat.com/${competitionName.toLowerCase().replace(/[:\s]/g, '-')}/`
  }));
};

const transformHighlightsData = (highlights) => {
  // First, get the unique leagues to create the mapping
  const leagues = extractUniqueLeagues(highlights);
  
  return highlights.map(match => {
    // Find the league object for this match's competition
    const league = leagues.find(l => l.name === match.competition);
    
    return {
      id: match.title?.replace(/\s+/g, '-').toLowerCase() || `match-${Date.now()}`,
      title: match.title || 'Match Highlights',
      embed: match.embed || (match.videos && match.videos[0] ? match.videos[0].embed : ''),
      thumbnail: match.thumbnail || extractThumbnailFromEmbed(match.embed || (match.videos && match.videos[0] ? match.videos[0].embed : '')),
      date: match.date || new Date().toISOString(),
      competition: league || { id: 0, name: match.competition, url: '' }, // Convert to object format
      teams: extractTeams(match.title),
      duration: extractDuration(match.embed || (match.videos && match.videos[0] ? match.videos[0].embed : '')),
      views: match.views || 0,
      likes: match.likes || 0
    };
  });
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

// Helper function to extract competition from match data
const extractCompetition = (match) => {
  if (!match) return 'Unknown Competition';
  
  const title = match.title || '';
  const embed = match.embed || '';
  const date = match.date || '';
  
  // Competition patterns with more specific matching (ordered by specificity)
  const competitionPatterns = [
    // MOST SPECIFIC: Women's Football (must come before team-based patterns)
    { pattern: /\b\w+\s+W\b/i, competition: 'Women\'s Football' },
    
    // Youth Football (must come before team-based patterns)
    { pattern: /\b\w+\s+U-\d+\b/i, competition: 'Youth Football' },
    
    // Direct competition mentions in title (most specific)
    { pattern: /\b(Premier League|La Liga|Serie A|Bundesliga|Ligue 1)\b/i, competition: (match) => {
      const title = match.title || '';
      if (title.includes('Premier League')) return 'Premier League';
      if (title.includes('La Liga')) return 'La Liga';
      if (title.includes('Serie A')) return 'Serie A';
      if (title.includes('Bundesliga')) return 'Bundesliga';
      if (title.includes('Ligue 1')) return 'Ligue 1';
      return null;
    }},
    
    // European competitions (high priority)
    { pattern: /\b(Champions League|UEFA Champions League|Champions|UCL)\b/i, competition: 'Champions League' },
    { pattern: /\b(Europa League|UEFA Europa League|Europa)\b/i, competition: 'Europa League' },
    { pattern: /\b(Conference League|UEFA Conference League|Conference)\b/i, competition: 'Europa Conference League' },
    
    // National Cups (high priority)
    { pattern: /\b(FA Cup|Copa del Rey|Coppa Italia|DFB-Pokal|Coupe de France)\b/i, competition: 'National Cup' },
    
    // Cup matches with mixed divisions (Premier League vs Lower Division)
    { pattern: /\b(Tottenham Hotspur|Arsenal|Chelsea|Liverpool|Manchester United|Manchester City|Newcastle|Brighton|West Ham|Aston Villa|Brentford|Burnley|Fulham|Everton|Wolves|Sheffield United|Luton|Nottingham Forest|Norwich|Crystal Palace)\s+-\s+(Doncaster|Port Vale|Lincoln City|Huddersfield|Reading|Stockport|Wimbledon|Wycombe|Oxford United|Stoke City|Birmingham|Blackburn|Bristol|Cardiff|Coventry|Derby|Hull|Ipswich|Leeds|Middlesbrough|Millwall|Preston|QPR|Rotherham|Sheffield Wednesday|Sunderland|Swansea|Watford|West Brom|Wigan|Charlton|Barnsley|Bolton|Burton|Cambridge|Cheltenham|Crewe|Exeter|Fleetwood|Forest Green|Gillingham|Harrogate|Leyton Orient|Mansfield|MK Dons|Morecambe|Newport|Northampton|Peterborough|Plymouth|Rochdale|Salford|Shrewsbury|Stevenage|Swindon|Tranmere|Walsall|Accrington|AFC Wimbledon|Barrow|Bradford|Colchester|Crawley|Grimsby|Hartlepool|Oldham|Scunthorpe|Southend|Sutton)\b/i, competition: 'National Cup' },
    
    // Cup matches with mixed divisions (Lower Division vs Premier League)
    { pattern: /\b(Doncaster|Port Vale|Lincoln City|Huddersfield|Reading|Stockport|Wimbledon|Wycombe|Oxford United|Stoke City|Birmingham|Blackburn|Bristol|Cardiff|Coventry|Derby|Hull|Ipswich|Leeds|Middlesbrough|Millwall|Preston|QPR|Rotherham|Sheffield Wednesday|Sunderland|Swansea|Watford|West Brom|Wigan|Charlton|Barnsley|Bolton|Burton|Cambridge|Cheltenham|Crewe|Exeter|Fleetwood|Forest Green|Gillingham|Harrogate|Leyton Orient|Mansfield|MK Dons|Morecambe|Newport|Northampton|Peterborough|Plymouth|Rochdale|Salford|Shrewsbury|Stevenage|Swindon|Tranmere|Walsall|Accrington|AFC Wimbledon|Barrow|Bradford|Colchester|Crawley|Grimsby|Hartlepool|Oldham|Scunthorpe|Southend|Sutton)\s+-\s+(Tottenham Hotspur|Arsenal|Chelsea|Liverpool|Manchester United|Manchester City|Newcastle|Brighton|West Ham|Aston Villa|Brentford|Burnley|Fulham|Everton|Wolves|Sheffield United|Luton|Nottingham Forest|Norwich|Crystal Palace)\b/i, competition: 'National Cup' },
    
    // International competitions
    { pattern: /\b(World Cup|Euro|Copa America|Nations League)\b/i, competition: 'International' },
    
    // Lower-tier leagues and competitions (before major leagues)
    { pattern: /\b(Championship|League One|League Two|Segunda Division|Serie B|2\. Bundesliga|Ligue 2)\b/i, competition: 'Second Division' },
    { pattern: /\b(Eredivisie|Primeira Liga|Belgian Pro League|Austrian Bundesliga|Swiss Super League)\b/i, competition: 'European Leagues' },
    { pattern: /\b(MLS|Brasileirao|Liga MX|Argentine Primera)\b/i, competition: 'Americas Leagues' },
    { pattern: /\b(Asian Champions League|AFC Champions League|CONCACAF)\b/i, competition: 'Continental Cups' },
    
    // Regional/Country-specific lower divisions (before major leagues)
    { pattern: /\b(Waldhof|RW Essen|Duisburg|Aachen|Osnabrück|Paderborn|Sandhausen|Kaiserslautern|Karlsruhe|Darmstadt|Fürth|Heidenheim|Greuther|1860|St Pauli|Hannover|Bochum|Aue|Magdeburg|Dresden|Rostock|Hansa|Jahn|Regensburg|Würzburg|Meppen|Verl|Lübeck|Havelse|Bayreuth|Viktoria|Lokomotive|Chemnitz|Zwickau|Hallescher|VfL|Eintracht|Dynamo|Energie|Union|Hertha|BSC|FC|SV|SC|TSV|VfB|SpVgg|FSV|FC|1\.|2\.|3\.)\b/i, competition: 'German Football' },
    
    { pattern: /\b(Venezia|Spezia|Sudtirol|Reggiana|Avellino|Virtus Entella|Cesena|Palermo|Bra|Guidonia|Sambenedettese|Sassari Torres|Ascoli|Livorno|Campobasso|Ravenna|Ternana|Pisa|Lecce|Sassuolo|Cagliari|Verona|Salernitana|Monza|Empoli|Frosinone|Genoa|Torino|Bologna|Fiorentina|Lazio|Atalanta|Udinese|Sampdoria|Cremonese|Benevento|Pescara|Trapani|Juve Stabia|Virtus Francavilla|Potenza|Monopoli|Catania|Siracusa|Messina|Taranto|Catanzaro|Foggia|Bari|Brindisi|Lecce|Cosenza|Reggio|Calabria|Vibonese|Paganese|Gelbison|Viterbese|Latina|Frosinone|Ternana|Perugia|Gubbio|Arezzo|Siena|Pistoiese|Carrarese|Lucchese|Piacenza|Pro Patria|Pro Vercelli|Alessandria|Novara|Como|Renate|Giana|AlbinoLeffe|Pro Sesto|Lecco|Mantova|Trento|Feralpisalò|Pergolettese|Pro Piacenza|Fiorenzuola|Imolese|Rimini|Cesena|San Marino|Recanatese|Fermana|Ancona|Matelica|Vis Pesaro|Olbia|Grosseto|Montevarchi|Poggibonsi|Sangiovannese|Siena|Pianese|Gavorrano|Orbetello|Follonica|Gavorrano|San Donato|Aglianese|Poggibonsi|Sangiovannese|Siena|Pianese|Gavorrano|Orbetello|Follonica|Gavorrano|San Donato|Aglianese)\b/i, competition: 'Italian Football' },
    
    // English lower divisions (Championship, League One, League Two teams)
    { pattern: /\b(Stockport|Reading|Wimbledon|Wycombe|Penybont|Colwyn|Barry Town|Connahs|Lincoln City|Port Vale|Huddersfield|Doncaster|Oxford United|Norwich City|Stoke City|Birmingham|Blackburn|Bristol|Cardiff|Coventry|Derby|Hull|Ipswich|Leeds|Middlesbrough|Millwall|Nottingham|Preston|QPR|Rotherham|Sheffield Wednesday|Sunderland|Swansea|Watford|West Brom|Wigan|Charlton|Barnsley|Bolton|Burton|Cambridge|Cheltenham|Crewe|Exeter|Fleetwood|Forest Green|Gillingham|Harrogate|Leyton Orient|Mansfield|MK Dons|Morecambe|Newport|Northampton|Oxford|Peterborough|Plymouth|Rochdale|Salford|Shrewsbury|Stevenage|Swindon|Tranmere|Walsall|Accrington|AFC Wimbledon|Barrow|Bradford|Colchester|Crawley|Grimsby|Hartlepool|Oldham|Scunthorpe|Southend|Sutton)\b/i, competition: 'English Football' },
    
    { pattern: /\b(Vitesse|Willem II|Ajax|PSV|Feyenoord|AZ|Utrecht|Groningen|Heerenveen|Twente|Sparta|NEC|Cambuur|Go Ahead|Heracles|RKC|Volendam|Excelsior|Fortuna|Emmen|Almere|Helmond|Den Bosch|Dordrecht|Eindhoven|Maastricht|Oss|Telstar|Venlo|De Graafschap|Jong Ajax|Jong PSV|Jong AZ|Jong Utrecht|Jong Feyenoord)\b/i, competition: 'Dutch Football' },
    
    { pattern: /\b(Academico Viseu|Portimonense|Benfica|Porto|Sporting|Braga|Vitoria|Rio Ave|Famalicao|Boavista|Maritimo|Tondela|Aves|Moreirense|Santa Clara|Pacos|Gil Vicente|Chaves|Porto|Academica|Leiria|Beira-Mar|Uniao|Olhanense|Estoril|Setubal|Nacional|Arouca|Feirense|Penafiel|Trofense|Varzim|Leixoes|Farense|Academico|Viseu|Covilha|Vizela|Mafra|Casa Pia|B SAD|Estrela|Amadora|Torreense|Farense|Academico|Viseu|Covilha|Vizela|Mafra|Casa Pia|B SAD|Estrela|Amadora|Torreense)\b/i, competition: 'Portuguese Football' },
    
    { pattern: /\b(Dinamo Brest|BATE|Osipovichi|Gomel|Orsha|Belarus|Dnepr Mogilev|FC Minsk|Torpedo|Dinamo Tb|Zorya|Obolon Kyiv|Korona|Lechia Gdansk|Siauliai|Riteriai|Khoromkhon|Khangarid|Hunters|Ulaanbaatar|Mongolia)\b/i, competition: 'Eastern European Football' },
    
    { pattern: /\b(Kuala Lumpur|Terengganu|PWD Sports Club|Bashundhara Kings|Ispe|Hantharwady United|Consadole Sapporo|Vegalta Sendai|Machida Zelvia|Fagiano Okayama|Sanfrecce Hiroshima|Cerezo Osaka|Vegalta Sendai|Nojima Stella|JEF United|Elfen Saitama|Albirex Niigata|NTV Beleza|Taicheng Blue|Valkyrie|Don Bosco Garelli|Maharlika|Yokohama Seagulls|Iga Kunoichi|Yeoju Citizen|Paju Citizen|Jeonbuk Motors|Pocheon|Chuncheon|Changwon|Yeoncheon|Pyeongchang United|Setagaya Sfida|Harima Albion|Reinmeer Aomori|Atletico Suzuka|NGU Nagoya|Yunogo Belle)\b/i, competition: 'Asian Football' },
    
    { pattern: /\b(ZED|Haras El Hedood|Ol\. Dcheira|Kawkab Marrakech|Telavi|Gagra|Gandzasar|Pyunik)\b/i, competition: 'African Football' },
    
    { pattern: /\b(Navbahor Namangan|Qizilqum|Egersund|Start)\b/i, competition: 'South American Football' },
    
    // MAJOR LEAGUES (least specific, should come last)
    // Premier League teams (only actual Premier League teams)
    { pattern: /\b(Arsenal|Chelsea|Liverpool|Manchester United|Manchester City|Tottenham Hotspur|Newcastle|Brighton|West Ham|Aston Villa|Brentford|Burnley|Fulham|Everton|Wolves|Sheffield United|Luton|Nottingham Forest|Norwich|Crystal Palace)\b/i, competition: 'Premier League' },
    
    // La Liga teams
    { pattern: /\b(Real Madrid|Barcelona|Atletico Madrid|Sevilla|Villarreal|Real Betis|Athletic Bilbao|Real Sociedad|Valencia|Celta Vigo|Getafe|Osasuna|Rayo Vallecano|Mallorca|Las Palmas|Cadiz|Alaves|Granada|Almeria)\b/i, competition: 'La Liga' },
    
    // Serie A teams
    { pattern: /\b(Juventus|AC Milan|Inter Milan|Napoli|AS Roma|Atalanta|Lazio|Fiorentina|Torino|Bologna|Genoa|Monza|Lecce|Frosinone|Empoli|Sassuolo|Cagliari|Verona|Salernitana)\b/i, competition: 'Serie A' },
    
    // Bundesliga teams
    { pattern: /\b(Bayern Munich|Borussia Dortmund|RB Leipzig|Bayer Leverkusen|Borussia Monchengladbach|Eintracht Frankfurt|Union Berlin|Freiburg|Hoffenheim|Augsburg|Mainz|Wolfsburg|Bochum|Stuttgart|Heidenheim|Darmstadt|Cologne)\b/i, competition: 'Bundesliga' },
    
    // Ligue 1 teams
    { pattern: /\b(PSG|Paris Saint-Germain|Marseille|Lyon|Monaco|Lille|Rennes|Nice|Lorient|Reims|Toulouse|Montpellier|Strasbourg|Brest|Nantes|Metz|Clermont|Le Havre)\b/i, competition: 'Ligue 1' }
  ];
  
  // First, try to find competition by team patterns
  for (const { pattern, competition } of competitionPatterns) {
    if (typeof competition === 'function') {
      const result = competition(match);
      if (result) return result;
    } else if (pattern.test(title)) {
      return competition;
    }
  }
  
  // If no pattern matches, try to infer from embed URL or other data
  if (embed) {
    if (embed.includes('champions') || embed.includes('ucl')) return 'Champions League';
    if (embed.includes('europa')) return 'Europa League';
    if (embed.includes('conference')) return 'Europa Conference League';
  }
  
  // Default fallback
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
      const transformedData = transformHighlightsData(highlightsCache.data);
      const leagues = extractUniqueLeagues(highlightsCache.data);
      return res.json({
        success: true,
        data: transformedData,
        leagues: leagues,
        embedToken: process.env.EMBED_TOKEN,
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
    
    const transformedData = transformHighlightsData(highlights);
    const leagues = extractUniqueLeagues(highlights);
    
    res.json({
      success: true,
      data: transformedData,
      leagues: leagues,
      embedToken: process.env.EMBED_TOKEN,
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
    
    const transformedData = transformHighlightsData(highlights);
    const leagues = extractUniqueLeagues(highlights);
    
    res.json({
      success: true,
      message: 'Highlights cache refreshed successfully',
      data: transformedData,
      leagues: leagues,
      embedToken: process.env.EMBED_TOKEN,
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
      const competition = extractCompetition(match);
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
