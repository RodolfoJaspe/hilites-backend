const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

class MatchDataService {
  constructor() {
    this.footballDataApiKey = process.env.FOOTBALL_DATA_API_KEY;
    this.apiFootballKey = process.env.API_FOOTBALL_KEY;
    this.baseUrl = 'https://api.football-data.org/v4';
    this.apiFootballUrl = 'https://v3.football.api-sports.io';
    
    // Initialize Supabase client
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Rate limiting
    this.requestCount = 0;
    this.lastReset = Date.now();
    this.maxRequestsPerMinute = 10; // Football-Data.org free tier limit
  }

  /**
   * Check if we can make a request based on rate limits
   */
  canMakeRequest() {
    const now = Date.now();
    const timeSinceReset = now - this.lastReset;
    
    // Reset counter every minute
    if (timeSinceReset >= 60000) {
      this.requestCount = 0;
      this.lastReset = now;
    }
    
    return this.requestCount < this.maxRequestsPerMinute;
  }

  /**
   * Make a request to Football-Data.org API with rate limiting
   */
  async makeFootballDataRequest(endpoint) {
    if (!this.canMakeRequest()) {
      throw new Error('Rate limit exceeded. Please wait before making more requests.');
    }

    try {
      const response = await axios.get(`${this.baseUrl}${endpoint}`, {
        headers: {
          'X-Auth-Token': this.footballDataApiKey,
          'User-Agent': 'Hilites-App/1.0'
        },
        timeout: 10000
      });

      this.requestCount++;
      return response.data;
    } catch (error) {
      console.error('Football-Data.org API error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Make a request to API-Football with rate limiting
   */
  async makeApiFootballRequest(endpoint, params = {}) {
    try {
      const response = await axios.get(`${this.apiFootballUrl}${endpoint}`, {
        headers: {
          'X-RapidAPI-Key': this.apiFootballKey,
          'X-RapidAPI-Host': 'v3.football.api-sports.io'
        },
        params,
        timeout: 10000
      });

      return response.data;
    } catch (error) {
      console.error('API-Football error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Fetch competitions from Football-Data.org
   */
  async fetchCompetitions() {
    try {
      console.log('🏆 Fetching competitions from Football-Data.org...');
      const data = await this.makeFootballDataRequest('/competitions');
      
      const competitions = data.competitions.map(comp => ({
        id: comp.code || comp.id.toString(),
        name: comp.name,
        type: this.mapCompetitionType(comp.type),
        country: comp.area?.name || 'Unknown',
        country_code: comp.area?.code || null,
        logo_url: comp.emblem || null,
        website_url: comp.website || null,
        is_active: true,
        current_season: comp.currentSeason?.startDate ? 
          this.extractSeason(comp.currentSeason.startDate) : null,
        start_date: comp.currentSeason?.startDate || null,
        end_date: comp.currentSeason?.endDate || null
      }));

      console.log(`✅ Fetched ${competitions.length} competitions`);
      return competitions;
    } catch (error) {
      console.error('❌ Error fetching competitions:', error.message);
      throw error;
    }
  }

  /**
   * Fetch matches for a specific competition and date range
   */
  async fetchMatches(competitionId, dateFrom, dateTo) {
    try {
      console.log(`⚽ Fetching matches for competition ${competitionId} from ${dateFrom} to ${dateTo}...`);
      
      const data = await this.makeFootballDataRequest(
        `/competitions/${competitionId}/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`
      );

      const matches = await Promise.all(
        data.matches.map(async (match) => ({
          external_id: match.id.toString(),
          home_team_id: await this.getOrCreateTeam(match.homeTeam),
          away_team_id: await this.getOrCreateTeam(match.awayTeam),
          competition_id: competitionId,
          competition_name: match.competition?.name || 'Unknown',
          match_date: new Date(match.utcDate).toISOString(),
          status: this.mapMatchStatus(match.status),
          home_score: match.score?.fullTime?.home || null,
          away_score: match.score?.fullTime?.away || null,
          venue: match.venue || null,
          referee: match.referees?.[0]?.name || null,
          weather_conditions: null, // Not available in Football-Data.org
          attendance: match.attendance || null,
          match_week: match.matchday || null,
          season: this.extractSeason(match.season?.startDate)
        }))
      );

      console.log(`✅ Fetched ${matches.length} matches`);
      return matches;
    } catch (error) {
      console.error('❌ Error fetching matches:', error.message);
      throw error;
    }
  }

  /**
   * Fetch today's matches across all competitions
   */
  async fetchTodaysMatches() {
    try {
      const today = new Date().toISOString().split('T')[0];
      console.log(`📅 Fetching today's matches (${today})...`);

      const data = await this.makeFootballDataRequest(`/matches?date=${today}`);
      
      const matches = await Promise.all(
        data.matches.map(async (match) => ({
          external_id: match.id.toString(),
          home_team_id: await this.getOrCreateTeam(match.homeTeam),
          away_team_id: await this.getOrCreateTeam(match.awayTeam),
          competition_id: match.competition?.code || match.competition?.id?.toString(),
          competition_name: match.competition?.name || 'Unknown',
          match_date: new Date(match.utcDate).toISOString(),
          status: this.mapMatchStatus(match.status),
          home_score: match.score?.fullTime?.home || null,
          away_score: match.score?.fullTime?.away || null,
          venue: match.venue || null,
          referee: match.referees?.[0]?.name || null,
          weather_conditions: null,
          attendance: match.attendance || null,
          match_week: match.matchday || null,
          season: this.extractSeason(match.season?.startDate)
        }))
      );

      console.log(`✅ Fetched ${matches.length} matches for today`);
      return matches;
    } catch (error) {
      console.error('❌ Error fetching today\'s matches:', error.message);
      throw error;
    }
  }

  /**
   * Get or create a team in the database
   */
  async getOrCreateTeam(teamData) {
    if (!teamData || !teamData.id) {
      console.error('Invalid team data provided:', teamData);
      return null;
    }

    const externalId = teamData.id.toString();
    const teamName = teamData.name || 'Unknown Team';

    try {
      // First, try to find existing team by external_id
      const { data: existingTeam, error: findError } = await this.supabase
        .from('teams')
        .select('id')
        .eq('external_id', externalId)
        .maybeSingle();

      if (findError) {
        console.error(`Error finding team ${teamName}:`, findError.message);
        // Continue to try creating the team
      }

      if (existingTeam) {
        return existingTeam.id;
      }

      // Team not found, create new team
      const newTeamData = {
        external_id: externalId,
        name: teamName,
        short_name: teamData.shortName || teamData.name || teamName,
        code: teamData.tla || null,
        country: teamData.area?.name || 'Unknown',
        country_code: teamData.area?.code || null,
        league: 'Unknown', // Will be updated when we have more context
        logo_url: teamData.crest || null,
        website_url: teamData.website || null,
        is_active: true
      };

      const { data: newTeam, error: createError } = await this.supabase
        .from('teams')
        .insert(newTeamData)
        .select('id')
        .maybeSingle();

      if (createError) {
        console.error(`Error creating team ${teamName}:`, createError);
        
        // If it's a unique constraint error, try to find the team again
        // (it might have been created by another process)
        if (createError.code === '23505') {
          console.log(`Team ${teamName} already exists, fetching...`);
          const { data: retryTeam, error: retryError } = await this.supabase
            .from('teams')
            .select('id')
            .eq('external_id', externalId)
            .maybeSingle();
          
          if (retryError) {
            console.error(`Error retrying team fetch for ${teamName}:`, retryError.message);
            return null;
          }
          
          if (retryTeam) {
            return retryTeam.id;
          }
        }
        
        return null;
      }

      if (!newTeam) {
        console.error(`Failed to create team ${teamName}: no data returned`);
        return null;
      }

      console.log(`✅ Created new team: ${teamName} (ID: ${newTeam.id})`);
      return newTeam.id;
    } catch (error) {
      console.error(`Error in getOrCreateTeam for ${teamName}:`, error);
      return null;
    }
  }

  /**
   * Store matches in the database
   */
  async storeMatches(matches) {
    if (!matches || matches.length === 0) {
      console.log('No matches to store');
      return;
    }

    try {
      console.log(`💾 Storing ${matches.length} matches in database...`);

      const { data, error } = await this.supabase
        .from('matches')
        .upsert(matches, { 
          onConflict: 'external_id',
          ignoreDuplicates: false 
        })
        .select('id, external_id');

      if (error) {
        console.error('❌ Error storing matches:', error);
        throw error;
      }

      console.log(`✅ Successfully stored ${data.length} matches`);
      return data;
    } catch (error) {
      console.error('❌ Error in storeMatches:', error);
      throw error;
    }
  }

  /**
   * Store competitions in the database
   */
  async storeCompetitions(competitions) {
    if (!competitions || competitions.length === 0) {
      console.log('No competitions to store');
      return;
    }

    try {
      console.log(`💾 Storing ${competitions.length} competitions in database...`);

      const { data, error } = await this.supabase
        .from('competitions')
        .upsert(competitions, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        })
        .select('id, name');

      if (error) {
        console.error('❌ Error storing competitions:', error);
        throw error;
      }

      console.log(`✅ Successfully stored ${data.length} competitions`);
      return data;
    } catch (error) {
      console.error('❌ Error in storeCompetitions:', error);
      throw error;
    }
  }

  /**
   * Map Football-Data.org competition type to our schema
   */
  mapCompetitionType(type) {
    const typeMap = {
      'LEAGUE': 'league',
      'CUP': 'cup',
      'INTERNATIONAL': 'international',
      'FRIENDLY': 'friendly'
    };
    return typeMap[type] || 'league';
  }

  /**
   * Map Football-Data.org match status to our schema
   */
  mapMatchStatus(status) {
    const statusMap = {
      'SCHEDULED': 'scheduled',
      'TIMED': 'scheduled',
      'IN_PLAY': 'live',
      'PAUSED': 'live',
      'FINISHED': 'finished',
      'POSTPONED': 'postponed',
      'CANCELLED': 'cancelled',
      'SUSPENDED': 'postponed'
    };
    return statusMap[status] || 'scheduled';
  }

  /**
   * Extract season from date (e.g., "2023-24")
   */
  extractSeason(startDate) {
    if (!startDate) return null;
    
    const year = new Date(startDate).getFullYear();
    const nextYear = year + 1;
    return `${year}-${nextYear.toString().slice(-2)}`;
  }

  /**
   * Get matches without highlights for AI processing
   */
  async getMatchesWithoutHighlights(limit = 50) {
    try {
      const { data, error } = await this.supabase
        .from('matches')
        .select(`
          id,
          external_id,
          home_team_id,
          away_team_id,
          competition_name,
          match_date,
          status,
          home_score,
          away_score,
          home_team:teams!matches_home_team_id_fkey(name),
          away_team:teams!matches_away_team_id_fkey(name)
        `)
        .eq('status', 'finished')
        .not('home_score', 'is', null)
        .not('away_score', 'is', null)
        .order('match_date', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching matches without highlights:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getMatchesWithoutHighlights:', error);
      throw error;
    }
  }
}

module.exports = MatchDataService;
