const express = require('express');
const { supabase } = require('../config/supabase');
const { authenticateUser } = require('../middleware/auth');
const { validateRequest, schemas } = require('../middleware/validation');

const router = express.Router();

// Get all teams with optional filtering
router.get('/', async (req, res) => {
  try {
    const { 
      country, 
      league, 
      continental_confederation, 
      is_active = 'true',
      page = 1,
      limit = 50,
      search
    } = req.query;

    let query = supabase
      .from('teams')
      .select('*');

    // Apply filters
    if (country) {
      query = query.eq('country', country);
    }
    
    if (league) {
      query = query.eq('league', league);
    }
    
    if (continental_confederation) {
      query = query.eq('continental_confederation', continental_confederation);
    }
    
    if (is_active !== undefined) {
      query = query.eq('is_active', is_active === 'true');
    }
    
    if (search) {
      query = query.or(`name.ilike.%${search}%,short_name.ilike.%${search}%,code.ilike.%${search}%`);
    }

    // Apply pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query = query
      .order('name', { ascending: true })
      .range(offset, offset + parseInt(limit) - 1);

    const { data, error, count } = await query;

    if (error) {
      return res.status(400).json({
        error: 'Failed to fetch teams',
        message: error.message
      });
    }

    res.json({
      teams: data || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get teams error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred while fetching teams'
    });
  }
});

// Get team by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          error: 'Team not found',
          message: 'The requested team does not exist'
        });
      }
      return res.status(400).json({
        error: 'Failed to fetch team',
        message: error.message
      });
    }

    res.json({ team: data });
  } catch (error) {
    console.error('Get team error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred while fetching team'
    });
  }
});

// Get team by external ID
router.get('/external/:externalId', async (req, res) => {
  try {
    const { externalId } = req.params;

    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('external_id', externalId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          error: 'Team not found',
          message: 'The requested team does not exist'
        });
      }
      return res.status(400).json({
        error: 'Failed to fetch team',
        message: error.message
      });
    }

    res.json({ team: data });
  } catch (error) {
    console.error('Get team by external ID error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred while fetching team'
    });
  }
});

// Get teams by country
router.get('/country/:country', async (req, res) => {
  try {
    const { country } = req.params;
    const { league, is_active = 'true' } = req.query;

    let query = supabase
      .from('teams')
      .select('*')
      .eq('country', country);

    if (league) {
      query = query.eq('league', league);
    }
    
    if (is_active !== undefined) {
      query = query.eq('is_active', is_active === 'true');
    }

    const { data, error } = await query.order('name', { ascending: true });

    if (error) {
      return res.status(400).json({
        error: 'Failed to fetch teams by country',
        message: error.message
      });
    }

    res.json({ teams: data || [] });
  } catch (error) {
    console.error('Get teams by country error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred while fetching teams by country'
    });
  }
});

// Get teams by league
router.get('/league/:league', async (req, res) => {
  try {
    const { league } = req.params;
    const { is_active = 'true' } = req.query;

    let query = supabase
      .from('teams')
      .select('*')
      .eq('league', league);

    if (is_active !== undefined) {
      query = query.eq('is_active', is_active === 'true');
    }

    const { data, error } = await query.order('name', { ascending: true });

    if (error) {
      return res.status(400).json({
        error: 'Failed to fetch teams by league',
        message: error.message
      });
    }

    res.json({ teams: data || [] });
  } catch (error) {
    console.error('Get teams by league error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred while fetching teams by league'
    });
  }
});

// Get teams by continental confederation
router.get('/confederation/:confederation', async (req, res) => {
  try {
    const { confederation } = req.params;
    const { country, is_active = 'true' } = req.query;

    let query = supabase
      .from('teams')
      .select('*')
      .eq('continental_confederation', confederation);

    if (country) {
      query = query.eq('country', country);
    }
    
    if (is_active !== undefined) {
      query = query.eq('is_active', is_active === 'true');
    }

    const { data, error } = await query.order('name', { ascending: true });

    if (error) {
      return res.status(400).json({
        error: 'Failed to fetch teams by confederation',
        message: error.message
      });
    }

    res.json({ teams: data || [] });
  } catch (error) {
    console.error('Get teams by confederation error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred while fetching teams by confederation'
    });
  }
});

// Get unique countries
router.get('/meta/countries', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('teams')
      .select('country')
      .eq('is_active', true);

    if (error) {
      return res.status(400).json({
        error: 'Failed to fetch countries',
        message: error.message
      });
    }

    const countries = [...new Set(data.map(team => team.country))].sort();
    
    res.json({ countries });
  } catch (error) {
    console.error('Get countries error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred while fetching countries'
    });
  }
});

// Get unique leagues
router.get('/meta/leagues', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('teams')
      .select('league')
      .eq('is_active', true);

    if (error) {
      return res.status(400).json({
        error: 'Failed to fetch leagues',
        message: error.message
      });
    }

    const leagues = [...new Set(data.map(team => team.league))].sort();
    
    res.json({ leagues });
  } catch (error) {
    console.error('Get leagues error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred while fetching leagues'
    });
  }
});

// Get unique continental confederations
router.get('/meta/confederations', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('teams')
      .select('continental_confederation')
      .eq('is_active', true)
      .not('continental_confederation', 'is', null);

    if (error) {
      return res.status(400).json({
        error: 'Failed to fetch confederations',
        message: error.message
      });
    }

    const confederations = [...new Set(data.map(team => team.continental_confederation))].sort();
    
    res.json({ confederations });
  } catch (error) {
    console.error('Get confederations error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred while fetching confederations'
    });
  }
});

module.exports = router;






