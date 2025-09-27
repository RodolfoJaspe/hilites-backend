const express = require('express');
const { supabase } = require('../config/supabase');
const { authenticateUser } = require('../middleware/auth');
const { validateRequest, schemas } = require('../middleware/validation');

const router = express.Router();

// Get user's favorite teams
router.get('/teams', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('user_favorite_teams')
      .select(`
        *,
        teams:team_id (
          id,
          external_id,
          name,
          short_name,
          code,
          country,
          country_code,
          league,
          league_id,
          continental_confederation,
          founded_year,
          venue_name,
          venue_city,
          venue_capacity,
          logo_url,
          website_url,
          is_active
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({
        error: 'Failed to fetch favorite teams',
        message: error.message
      });
    }

    res.json({
      teams: data || []
    });
  } catch (error) {
    console.error('Get favorite teams error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred while fetching favorite teams'
    });
  }
});

// Add favorite team
router.post('/teams', authenticateUser, validateRequest(schemas.favoriteTeam), async (req, res) => {
  try {
    const userId = req.user.id;
    const { team_id } = req.body;

    // First, verify that the team exists in the teams table
    const { data: teamExists, error: teamError } = await supabase
      .from('teams')
      .select('id, name')
      .eq('id', team_id)
      .single();

    if (teamError || !teamExists) {
      return res.status(404).json({
        error: 'Team not found',
        message: 'The specified team does not exist'
      });
    }

    // Check if team is already favorited
    const { data: existingTeam } = await supabase
      .from('user_favorite_teams')
      .select('id')
      .eq('user_id', userId)
      .eq('team_id', team_id)
      .single();

    if (existingTeam) {
      return res.status(400).json({
        error: 'Team already favorited',
        message: 'This team is already in your favorites'
      });
    }

    const { data, error } = await supabase
      .from('user_favorite_teams')
      .insert({
        user_id: userId,
        team_id
      })
      .select(`
        *,
        teams:team_id (
          id,
          external_id,
          name,
          short_name,
          code,
          country,
          country_code,
          league,
          league_id,
          continental_confederation,
          founded_year,
          venue_name,
          venue_city,
          venue_capacity,
          logo_url,
          website_url,
          is_active
        )
      `)
      .single();

    if (error) {
      return res.status(400).json({
        error: 'Failed to add favorite team',
        message: error.message
      });
    }

    res.status(201).json({
      message: 'Team added to favorites successfully',
      team: data
    });
  } catch (error) {
    console.error('Add favorite team error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred while adding favorite team'
    });
  }
});

// Remove favorite team
router.delete('/teams/:teamId', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const { teamId } = req.params;

    // Validate that teamId is a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(teamId)) {
      return res.status(400).json({
        error: 'Invalid team ID',
        message: 'Team ID must be a valid UUID'
      });
    }

    const { error } = await supabase
      .from('user_favorite_teams')
      .delete()
      .eq('user_id', userId)
      .eq('team_id', teamId);

    if (error) {
      return res.status(400).json({
        error: 'Failed to remove favorite team',
        message: error.message
      });
    }

    res.json({
      message: 'Team removed from favorites successfully'
    });
  } catch (error) {
    console.error('Remove favorite team error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred while removing favorite team'
    });
  }
});

// Get user's favorite players
router.get('/players', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('user_favorite_players')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({
        error: 'Failed to fetch favorite players',
        message: error.message
      });
    }

    res.json({
      players: data || []
    });
  } catch (error) {
    console.error('Get favorite players error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred while fetching favorite players'
    });
  }
});

// Add favorite player
router.post('/players', authenticateUser, validateRequest(schemas.favoritePlayer), async (req, res) => {
  try {
    const userId = req.user.id;
    const { player_id, player_name, player_image, team_name } = req.body;

    // Check if player is already favorited
    const { data: existingPlayer } = await supabase
      .from('user_favorite_players')
      .select('id')
      .eq('user_id', userId)
      .eq('player_id', player_id)
      .single();

    if (existingPlayer) {
      return res.status(400).json({
        error: 'Player already favorited',
        message: 'This player is already in your favorites'
      });
    }

    const { data, error } = await supabase
      .from('user_favorite_players')
      .insert({
        user_id: userId,
        player_id,
        player_name,
        player_image,
        team_name
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        error: 'Failed to add favorite player',
        message: error.message
      });
    }

    res.status(201).json({
      message: 'Player added to favorites successfully',
      player: data
    });
  } catch (error) {
    console.error('Add favorite player error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred while adding favorite player'
    });
  }
});

// Remove favorite player
router.delete('/players/:playerId', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const { playerId } = req.params;

    const { error } = await supabase
      .from('user_favorite_players')
      .delete()
      .eq('user_id', userId)
      .eq('player_id', playerId);

    if (error) {
      return res.status(400).json({
        error: 'Failed to remove favorite player',
        message: error.message
      });
    }

    res.json({
      message: 'Player removed from favorites successfully'
    });
  } catch (error) {
    console.error('Remove favorite player error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred while removing favorite player'
    });
  }
});

// Get all user preferences (teams and players)
router.get('/', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch both teams and players in parallel
    const [teamsResult, playersResult] = await Promise.all([
      supabase
        .from('user_favorite_teams')
        .select(`
          *,
          teams:team_id (
            id,
            external_id,
            name,
            short_name,
            code,
            country,
            country_code,
            league,
            league_id,
            continental_confederation,
            founded_year,
            venue_name,
            venue_city,
            venue_capacity,
            logo_url,
            website_url,
            is_active
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      supabase
        .from('user_favorite_players')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
    ]);

    if (teamsResult.error) {
      return res.status(400).json({
        error: 'Failed to fetch favorite teams',
        message: teamsResult.error.message
      });
    }

    if (playersResult.error) {
      return res.status(400).json({
        error: 'Failed to fetch favorite players',
        message: playersResult.error.message
      });
    }

    res.json({
      teams: teamsResult.data || [],
      players: playersResult.data || []
    });
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred while fetching preferences'
    });
  }
});

module.exports = router;
