const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { authenticateUser } = require('../middleware/auth');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * GET /api/favorite-teams
 * Get all favorite teams for the authenticated user
 */
router.get('/', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('user_favorite_teams')
      .select(`
        id,
        created_at,
        team:teams (
          id,
          name,
          short_name,
          code,
          country,
          league,
          logo_url
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching favorite teams:', error);
      return res.status(500).json({ error: 'Failed to fetch favorite teams' });
    }

    // Flatten the team data
    const favoriteTeams = data.map(item => ({
      favoriteId: item.id,
      createdAt: item.created_at,
      ...item.team
    }));

    res.json(favoriteTeams);
  } catch (error) {
    console.error('Error in GET /favorite-teams:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/favorite-teams
 * Add a team to user's favorites
 */
router.post('/', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const { teamId } = req.body;

    if (!teamId) {
      return res.status(400).json({ error: 'teamId is required' });
    }

    // Check if team exists
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id, name')
      .eq('id', teamId)
      .single();

    if (teamError || !team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Add to favorites
    const { data, error } = await supabase
      .from('user_favorite_teams')
      .insert({
        user_id: userId,
        team_id: teamId
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return res.status(409).json({ error: 'Team is already in favorites' });
      }
      console.error('Error adding favorite team:', error);
      return res.status(500).json({ error: 'Failed to add favorite team' });
    }

    res.status(201).json({ message: 'Team added to favorites', data });
  } catch (error) {
    console.error('Error in POST /favorite-teams:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/favorite-teams/:teamId
 * Remove a team from user's favorites
 */
router.delete('/:teamId', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const { teamId } = req.params;

    const { error } = await supabase
      .from('user_favorite_teams')
      .delete()
      .eq('user_id', userId)
      .eq('team_id', teamId);

    if (error) {
      console.error('Error removing favorite team:', error);
      return res.status(500).json({ error: 'Failed to remove favorite team' });
    }

    res.json({ message: 'Team removed from favorites' });
  } catch (error) {
    console.error('Error in DELETE /favorite-teams/:teamId:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/favorite-teams/matches
 * Get recent matches for user's favorite teams
 */
router.get('/matches', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;

    // First, get user's favorite team IDs
    const { data: favorites, error: favError } = await supabase
      .from('user_favorite_teams')
      .select('team_id')
      .eq('user_id', userId);

    if (favError) {
      console.error('Error fetching favorite teams:', favError);
      return res.status(500).json({ error: 'Failed to fetch favorite teams' });
    }

    if (!favorites || favorites.length === 0) {
      return res.json([]); // No favorites, return empty array
    }

    const teamIds = favorites.map(f => f.team_id);

    // Fetch matches where either home or away team is in favorites
    const { data: matches, error: matchError } = await supabase
      .from('matches')
      .select(`
        id,
        external_id,
        competition_name,
        match_date,
        status,
        home_score,
        away_score,
        venue,
        home_team:teams!matches_home_team_id_fkey (
          id,
          name,
          short_name,
          logo_url
        ),
        away_team:teams!matches_away_team_id_fkey (
          id,
          name,
          short_name,
          logo_url
        )
      `)
      .or(`home_team_id.in.(${teamIds.join(',')}),away_team_id.in.(${teamIds.join(',')})`)
      .eq('status', 'finished')
      .order('match_date', { ascending: false })
      .limit(limit);

    if (matchError) {
      console.error('Error fetching favorite team matches:', matchError);
      return res.status(500).json({ error: 'Failed to fetch matches' });
    }

    res.json(matches);
  } catch (error) {
    console.error('Error in GET /favorite-teams/matches:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;


