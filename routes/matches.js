const express = require('express');
const MatchDataService = require('../services/matchDataService');

const router = express.Router();
const matchDataService = new MatchDataService();

// GET /api/matches - Get all matches with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      competition_id, 
      status, 
      date_from, 
      date_to,
      team_id 
    } = req.query;

    console.log('📊 Matches request received:', { page, limit, competition_id, status });

    let query = matchDataService.supabase
      .from('matches')
      .select(`
        id,
        external_id,
        competition_id,
        competition_name,
        match_date,
        status,
        home_score,
        away_score,
        venue,
        referee,
        match_week,
        season,
        created_at,
        home_team:teams!matches_home_team_id_fkey(id, name, short_name, logo_url),
        away_team:teams!matches_away_team_id_fkey(id, name, short_name, logo_url)
      `)
      .order('match_date', { ascending: false });

    // Apply filters
    if (competition_id) {
      query = query.eq('competition_id', competition_id);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (date_from) {
      query = query.gte('match_date', date_from);
    }

    if (date_to) {
      query = query.lte('match_date', date_to);
    }

    if (team_id) {
      query = query.or(`home_team_id.eq.${team_id},away_team_id.eq.${team_id}`);
    }

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: matches, error, count } = await query;

    if (error) {
      console.error('❌ Error fetching matches:', error);
      throw error;
    }

    res.json({
      success: true,
      data: matches || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      },
      filters: {
        competition_id,
        status,
        date_from,
        date_to,
        team_id
      }
    });

  } catch (error) {
    console.error('❌ Matches fetch error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch matches',
      message: 'Unable to retrieve match data at this time',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/matches/refresh-all-sources - Backfill from all sources for the last N days
router.post('/refresh-all-sources', async (req, res) => {
  try {
    console.log('🔄 Multi-source match data backfill requested');

    const { date_range = 7 } = req.body; // Default to 7 days (including today)

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - Number(date_range));

    const dateFrom = startDate.toISOString().split('T')[0];
    const dateTo = endDate.toISOString().split('T')[0];

    console.log(`📅 [All Sources] Backfilling from ${dateFrom} to ${dateTo}`);

    let totalProcessed = 0;
    const perDay = [];

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      console.log(`📆 [All Sources] Processing ${dateStr}`);
      try {
        const matches = await matchDataService.fetchMatchesByDateAllSources(dateStr);
        await matchDataService.storeMatches(matches);
        perDay.push({ date: dateStr, count: matches.length });
        totalProcessed += matches.length;
        await new Promise(r => setTimeout(r, 500));
      } catch (e) {
        console.error(`❌ [All Sources] Failed ${dateStr}:`, e.message);
        perDay.push({ date: dateStr, error: e.message });
      }
    }

    res.json({
      success: true,
      message: 'Multi-source match data backfill completed',
      data: {
        date_range: `${dateFrom} to ${dateTo}`,
        matches_processed: totalProcessed,
        per_day: perDay
      }
    });

  } catch (error) {
    console.error('❌ Multi-source backfill error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to backfill matches from all sources',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Unable to backfill at this time'
    });
  }
});

// GET /api/matches/upcoming - Get upcoming matches
router.get('/upcoming', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    console.log('📅 Fetching upcoming matches...');

    const now = new Date().toISOString();
    
    const { data: matches, error } = await matchDataService.supabase
      .from('matches')
      .select(`
        *,
        home_team:teams!matches_home_team_id_fkey(name, short_name, logo_url),
        away_team:teams!matches_away_team_id_fkey(name, short_name, logo_url)
      `)
      .gte('match_date', now)
      .eq('status', 'scheduled')
      .order('match_date', { ascending: true })
      .limit(parseInt(limit));

    if (error) throw error;

    res.json({
      success: true,
      data: matches,
      count: matches.length,
      message: `Found ${matches.length} upcoming matches`
    });

  } catch (error) {
    console.error('❌ Upcoming matches fetch error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch upcoming matches',
      message: 'Unable to retrieve upcoming match data at this time',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/matches/:id - Get specific match with highlights
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`⚽ Match request for ID: ${id}`);

    const { data: match, error } = await matchDataService.supabase
      .from('matches')
      .select(`
        *,
        home_team:teams!matches_home_team_id_fkey(*),
        away_team:teams!matches_away_team_id_fkey(*),
        highlights:match_highlights(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('❌ Error fetching match:', error);
      throw error;
    }

    if (!match) {
      return res.status(404).json({
        success: false,
        error: 'Match not found',
        message: 'The requested match does not exist'
      });
    }

    res.json({
      success: true,
      data: match
    });

  } catch (error) {
    console.error('❌ Match fetch error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch match',
      message: 'Unable to retrieve match data at this time',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/matches/:id/highlights - Get highlights for a specific match
router.get('/:id/highlights', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🎥 Highlights request for match ID: ${id}`);

    const { data: highlights, error } = await matchDataService.supabase
      .from('match_highlights')
      .select('*')
      .eq('match_id', id)
      .eq('is_available', true)
      .order('quality_score', { ascending: false });

    if (error) {
      console.error('❌ Error fetching highlights:', error);
      throw error;
    }

    res.json({
      success: true,
      data: highlights || [],
      count: highlights?.length || 0
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

// GET /api/matches/today - Get today's matches
router.get('/today', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    console.log(`📅 Today's matches request for: ${today}`);

    const { data: matches, error } = await matchDataService.supabase
      .from('matches')
      .select(`
        id,
        external_id,
        competition_id,
        competition_name,
        match_date,
        status,
        home_score,
        away_score,
        venue,
        home_team:teams!matches_home_team_id_fkey(id, name, short_name, logo_url),
        away_team:teams!matches_away_team_id_fkey(id, name, short_name, logo_url)
      `)
      .gte('match_date', `${today}T00:00:00.000Z`)
      .lt('match_date', `${today}T23:59:59.999Z`)
      .order('match_date', { ascending: true });

    if (error) {
      console.error('❌ Error fetching today\'s matches:', error);
      throw error;
    }

    res.json({
      success: true,
      data: matches || [],
      date: today,
      count: matches?.length || 0
    });

  } catch (error) {
    console.error('❌ Today\'s matches fetch error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch today\'s matches',
      message: 'Unable to retrieve today\'s match data at this time',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/matches/upcoming - Get upcoming matches
router.get('/upcoming', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    console.log(`🔮 Upcoming matches request (limit: ${limit})`);

    const now = new Date().toISOString();

    const { data: matches, error } = await matchDataService.supabase
      .from('matches')
      .select(`
        id,
        external_id,
        competition_id,
        competition_name,
        match_date,
        status,
        venue,
        home_team:teams!matches_home_team_id_fkey(id, name, short_name, logo_url),
        away_team:teams!matches_away_team_id_fkey(id, name, short_name, logo_url)
      `)
      .gte('match_date', now)
      .eq('status', 'scheduled')
      .order('match_date', { ascending: true })
      .limit(parseInt(limit));

    if (error) {
      console.error('❌ Error fetching upcoming matches:', error);
      throw error;
    }

    res.json({
      success: true,
      data: matches || [],
      count: matches?.length || 0
    });

  } catch (error) {
    console.error('❌ Upcoming matches fetch error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch upcoming matches',
      message: 'Unable to retrieve upcoming match data at this time',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/matches/refresh - Manually refresh match data
router.post('/refresh', async (req, res) => {
  try {
    console.log('🔄 Manual match data refresh requested');
    
    const { date_range = 7 } = req.body; // Default to 7 days backfill (including today)

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - Number(date_range));

    const dateFrom = startDate.toISOString().split('T')[0];
    const dateTo = endDate.toISOString().split('T')[0];

    console.log(`📅 Backfilling matches from ${dateFrom} to ${dateTo}`);

    let totalProcessed = 0;
    const perDay = [];

    // Iterate each day from startDate to endDate inclusive
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      console.log(`📆 Processing date ${dateStr}`);
      try {
        const matches = await matchDataService.fetchMatchesByDate(dateStr);
        await matchDataService.storeMatches(matches);
        perDay.push({ date: dateStr, count: matches.length });
        totalProcessed += matches.length;
        // small delay to be nice to the upstream API
        await new Promise(r => setTimeout(r, 500));
      } catch (e) {
        console.error(`❌ Failed processing date ${dateStr}:`, e.message);
        perDay.push({ date: dateStr, error: e.message });
      }
    }

    res.json({
      success: true,
      message: 'Match data backfill completed',
      data: {
        date_range: `${dateFrom} to ${dateTo}`,
        matches_processed: totalProcessed,
        per_day: perDay
      }
    });

  } catch (error) {
    console.error('❌ Match refresh error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to refresh match data',
      message: 'Unable to refresh match data at this time',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/matches/refresh-competition - Backfill a specific competition in a date range
router.post('/refresh-competition', async (req, res) => {
  try {
    const { competition_id, date_from, date_to } = req.body || {};

    if (!competition_id || !date_from || !date_to) {
      return res.status(400).json({
        success: false,
        error: 'Bad request',
        message: 'competition_id, date_from (YYYY-MM-DD), and date_to (YYYY-MM-DD) are required'
      });
    }

    console.log(`🎯 Backfilling competition ${competition_id} from ${date_from} to ${date_to}`);

    // Fetch from upstream
    const matches = await matchDataService.fetchMatches(competition_id, date_from, date_to);
    // Store to DB (upsert by external_id)
    await matchDataService.storeMatches(matches);

    res.json({
      success: true,
      message: `Backfill completed for competition ${competition_id}`,
      data: {
        competition_id,
        date_range: `${date_from} to ${date_to}`,
        matches_processed: matches.length
      }
    });

  } catch (error) {
    console.error('❌ Competition backfill error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to backfill competition matches',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Unable to backfill at this time'
    });
  }
});

// GET /api/matches/stats - Get match statistics
router.get('/stats', async (req, res) => {
  try {
    console.log('📊 Match statistics request');

    const { data: stats, error } = await matchDataService.supabase
      .rpc('get_match_stats_summary');

    if (error) {
      // If the function doesn't exist, calculate stats manually
      const { data: totalMatches } = await matchDataService.supabase
        .from('matches')
        .select('id', { count: 'exact' });

      const { data: finishedMatches } = await matchDataService.supabase
        .from('matches')
        .select('id', { count: 'exact' })
        .eq('status', 'finished');

      const { data: upcomingMatches } = await matchDataService.supabase
        .from('matches')
        .select('id', { count: 'exact' })
        .eq('status', 'scheduled')
        .gte('match_date', new Date().toISOString());

      const { data: competitions } = await matchDataService.supabase
        .from('competitions')
        .select('id', { count: 'exact' })
        .eq('is_active', true);

      res.json({
        success: true,
        stats: {
          total_matches: totalMatches?.length || 0,
          finished_matches: finishedMatches?.length || 0,
          upcoming_matches: upcomingMatches?.length || 0,
          active_competitions: competitions?.length || 0,
          last_updated: new Date().toISOString()
        }
      });
    } else {
      res.json({
        success: true,
        stats
      });
    }

  } catch (error) {
    console.error('❌ Match stats error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch match statistics',
      message: 'Unable to retrieve match statistics at this time',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
