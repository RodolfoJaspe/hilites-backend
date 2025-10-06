const express = require('express');
const MultiSourceMatchService = require('../services/multiSourceMatchService');

const router = express.Router();
const multiSourceService = new MultiSourceMatchService();

/**
 * GET /api/multi-source-matches/fetch
 * Fetch matches from multiple sources and store them
 */
router.get('/fetch', async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    
    if (!dateFrom || !dateTo) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters',
        message: 'dateFrom and dateTo are required (format: YYYY-MM-DD)'
      });
    }

    console.log(`🔄 Fetching matches from ${dateFrom} to ${dateTo} using multiple sources...`);
    
    const storedMatches = await multiSourceService.fetchAndStoreMatches(dateFrom, dateTo);
    
    res.json({
      success: true,
      data: {
        matchesStored: storedMatches.length,
        matches: storedMatches,
        dateRange: { dateFrom, dateTo },
        sources: ['football-data.org', 'api-football']
      },
      message: `Successfully fetched and stored ${storedMatches.length} matches from multiple sources`
    });
  } catch (error) {
    console.error('Error in multi-source match fetch:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch matches from multiple sources',
      message: error.message
    });
  }
});

/**
 * GET /api/multi-source-matches/validate-teams
 * Validate current teams in database against Premier League teams list
 */
router.get('/validate-teams', async (req, res) => {
  try {
    const { data: teams, error } = await multiSourceService.supabase
      .from('teams')
      .select('id, name, league, country')
      .order('name');

    if (error) throw error;

    const validationResults = {
      totalTeams: teams.length,
      premierLeagueTeams: [],
      nonPremierLeagueTeams: [],
      missingTeams: []
    };

    // Check existing teams
    for (const team of teams) {
      const normalizedName = multiSourceService.normalizeTeamName(team.name);
      if (normalizedName) {
        validationResults.premierLeagueTeams.push({
          id: team.id,
          name: team.name,
          normalizedName,
          league: team.league,
          country: team.country
        });
      } else {
        validationResults.nonPremierLeagueTeams.push({
          id: team.id,
          name: team.name,
          league: team.league,
          country: team.country
        });
      }
    }

    // Check for missing Premier League teams
    for (const plTeam of multiSourceService.PREMIER_LEAGUE_TEAMS) {
      const exists = teams.some(team => 
        multiSourceService.normalizeTeamName(team.name) === plTeam
      );
      if (!exists) {
        validationResults.missingTeams.push(plTeam);
      }
    }

    res.json({
      success: true,
      data: validationResults,
      message: `Validation complete: ${validationResults.premierLeagueTeams.length} PL teams, ${validationResults.nonPremierLeagueTeams.length} non-PL teams, ${validationResults.missingTeams.length} missing teams`
    });
  } catch (error) {
    console.error('Error validating teams:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to validate teams',
      message: error.message
    });
  }
});

/**
 * GET /api/multi-source-matches/cleanup
 * Remove non-Premier League teams from database
 */
router.post('/cleanup', async (req, res) => {
  try {
    const { data: teams, error: fetchError } = await multiSourceService.supabase
      .from('teams')
      .select('id, name');

    if (fetchError) throw fetchError;

    const teamsToDelete = [];
    for (const team of teams) {
      const normalizedName = multiSourceService.normalizeTeamName(team.name);
      if (!normalizedName) {
        teamsToDelete.push(team.id);
      }
    }

    if (teamsToDelete.length === 0) {
      return res.json({
        success: true,
        data: { deletedCount: 0 },
        message: 'No non-Premier League teams found to delete'
      });
    }

    // Delete non-Premier League teams
    const { error: deleteError } = await multiSourceService.supabase
      .from('teams')
      .delete()
      .in('id', teamsToDelete);

    if (deleteError) throw deleteError;

    res.json({
      success: true,
      data: { 
        deletedCount: teamsToDelete.length,
        deletedTeams: teams.filter(t => teamsToDelete.includes(t.id)).map(t => t.name)
      },
      message: `Successfully deleted ${teamsToDelete.length} non-Premier League teams`
    });
  } catch (error) {
    console.error('Error cleaning up teams:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup teams',
      message: error.message
    });
  }
});

/**
 * GET /api/multi-source-matches/status
 * Get status of multi-source service
 */
router.get('/status', async (req, res) => {
  try {
    const status = {
      service: 'Multi-Source Match Service',
      premierLeagueTeams: multiSourceService.PREMIER_LEAGUE_TEAMS.length,
      availableSources: Object.keys(multiSourceService.apis).map(key => ({
        name: multiSourceService.apis[key].name,
        priority: multiSourceService.apis[key].priority,
        rateLimit: multiSourceService.apis[key].rateLimit
      })),
      requestCounts: multiSourceService.requestCounts,
      lastReset: multiSourceService.lastReset
    };

    res.json({
      success: true,
      data: status,
      message: 'Multi-source service status retrieved'
    });
  } catch (error) {
    console.error('Error getting service status:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get service status',
      message: error.message
    });
  }
});

module.exports = router;
