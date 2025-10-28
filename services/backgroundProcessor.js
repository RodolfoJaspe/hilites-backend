const MatchDataService = require('./matchDataService');
const { createClient } = require('@supabase/supabase-js');
const { format } = require('date-fns');
const { utcToZonedTime } = require('date-fns-tz');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

class BackgroundProcessor {
  constructor() {
    this.matchDataService = new MatchDataService();
    this.isProcessing = false;
    this.leaguesToFetch = [
      { id: 'PL', name: 'Premier League' },
      { id: 'PD', name: 'La Liga' },
      { id: 'SA', name: 'Serie A' },
      { id: 'BL1', name: 'Bundesliga' },
      { id: 'FL1', name: 'Ligue 1' },
      { id: 'CL', name: 'Champions League' },
      { id: 'EL', name: 'Europa League' },
    ];
  }

  /**
   * Fetch and process matches for all configured leagues
   */
  async fetchAndProcessMatches() {
    if (this.isProcessing) {
      console.log('⏳ Match fetching already in progress, skipping...');
      return;
    }

    this.isProcessing = true;
    const startTime = new Date();
    console.log('🚀 Starting match fetching process...');

    try {
      // Process each league one by one to avoid rate limiting
      for (const league of this.leaguesToFetch) {
        try {
          console.log(`📊 Fetching matches for ${league.name} (${league.id})`);
          await this.processLeagueMatches(league.id);
        } catch (error) {
          console.error(`❌ Error processing ${league.name}:`, error.message);
          // Continue with next league even if one fails
        }
      }

      this.lastProcessed = new Date().toISOString();
      console.log(`✅ Match fetching completed in ${(new Date() - startTime) / 1000} seconds`);
    } catch (error) {
      console.error('❌ Error in match fetching process:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process matches for a specific league
   * @param {string} leagueId - The ID of the league to process
   * @returns {Promise<Array>} - Array of successfully processed matches
   */
  async processLeagueMatches(leagueId) {
    const leagueInfo = this.leaguesToFetch.find(l => l.id === leagueId) || { id: leagueId, name: leagueId };
    const processedMatches = [];
    
    try {
      // Focus on today's matches
      const today = new Date();
      const dateFrom = new Date(today);
      dateFrom.setHours(0, 0, 0, 0); // Start of today
      
      const dateTo = new Date(today);
      dateTo.setHours(23, 59, 59, 999); // End of today

      console.log(`🔍 [${leagueInfo.name}] Fetching matches for ${dateFrom.toISOString().split('T')[0]}`);
      
      try {
        const matches = await this.matchDataService.fetchMatches(leagueId, dateFrom, dateTo);
        
        if (!matches || matches.length === 0) {
          console.log(`ℹ️ [${leagueInfo.name}] No matches found for today`);
          return [];
        }

        console.log(`📥 [${leagueInfo.name}] Found ${matches.length} matches`);
        
        // Process each match
        for (const match of matches) {
          try {
            const result = await this.processMatch(match);
            if (result) {
              processedMatches.push(result);
            }
          } catch (error) {
            console.error(`❌ [${leagueInfo.name}] Error processing match ${match.id || 'unknown'}:`, error.message);
            // Continue with next match even if one fails
          }
        }
        
        return processedMatches;
        
      } catch (error) {
        // Handle API errors (like 403 for unauthorized competitions)
        if (error.response?.status === 403) {
          console.warn(`⚠️ [${leagueInfo.name}] Access denied. This league may require a different subscription plan.`);
          return [];
        }
        throw error; // Re-throw other errors
      }
      
    } catch (error) {
      console.error(`❌ [${leagueInfo.name}] Error:`, error.message);
      return []; // Return empty array on error to continue with other leagues
    }
  }

  /**
   * Process a single match and store it in the database
   * @param {Object} match - The match data to process
   * @returns {Promise<Object|null>} - The processed match or null if not processed
   */
  async processMatch(match) {
    if (!match || !match.id) {
      console.warn('⚠️ Invalid match data received:', match);
      return null;
    }

    try {
      // Process home team
      const homeTeam = await this.processTeam(match.homeTeam);
      if (!homeTeam) {
        console.warn(`⚠️ Failed to process home team for match ${match.id}`);
        return null;
      }

      // Process away team
      const awayTeam = await this.processTeam(match.awayTeam);
      if (!awayTeam) {
        console.warn(`⚠️ Failed to process away team for match ${match.id}`);
        return null;
      }

      // Check if match already exists
      const { data: existingMatch, error: fetchError } = await supabase
        .from('matches')
        .select('id, status, is_highlight_processed')
        .eq('external_id', match.id)
        .single();

      // Determine match status based on the API response
      let status = 'SCHEDULED';
      if (match.status === 'FINISHED') {
        status = 'COMPLETED';
      } else if (match.status === 'IN_PLAY' || match.status === 'PAUSED') {
        status = 'LIVE';
      } else if (match.status === 'POSTPONED' || match.status === 'SUSPENDED') {
        status = 'POSTPONED';
      } else if (match.status === 'CANCELLED') {
        status = 'CANCELLED';
      }

      const matchData = {
        external_id: match.id,
        home_team_id: homeTeam.id,
        home_team_name: homeTeam.name,
        away_team_id: awayTeam.id,
        away_team_name: awayTeam.name,
        home_score: match.score?.fullTime?.home ?? null,
        away_score: match.score?.fullTime?.away ?? null,
        match_date: new Date(match.utcDate).toISOString(),
        status: status,
        competition: match.competition?.name || 'Unknown',
        competition_id: match.competition?.id || null,
        external_competition_id: match.competition?.id?.toString() || null,
        matchday: match.matchday || null,
        last_updated: new Date().toISOString(),
        venue: match.venue || null,
        referee: match.referees?.[0]?.name || null,
        is_highlight_processed: existingMatch?.is_highlight_processed || false
      };

      if (existingMatch) {
        // Only update if there are changes
        const { data: updatedMatch, error: updateError } = await supabase
          .from('matches')
          .update(matchData)
          .eq('id', existingMatch.id)
          .select()
          .single();

        if (updateError) throw updateError;
        
        // Only log if status changed
        if (existingMatch.status !== match.status) {
          console.log(`🔄 Updated match ${match.id} (${matchData.home_team} vs ${matchData.away_team}) - Status: ${match.status}`);
        }
        return updatedMatch;
      } else {
        // Insert new match
        const { data: newMatch, error: insertError } = await supabase
          .from('matches')
          .insert([matchData])
          .select()
          .single();

        if (insertError) throw insertError;
        
        console.log(`✅ Added new match: ${matchData.home_team} vs ${matchData.away_team} (${match.status})`);
        return newMatch;
      }
    } catch (error) {
      console.error('❌ Error in processMatch:', error.message);
      console.error('Match data:', JSON.stringify(match, null, 2));
      return null;
    }
  }

  /**
   * Process a team and store it in the database if it doesn't exist
   */
  /**
   * Process a team and store it in the database if it doesn't exist
   * @param {Object} teamData - The team data to process
   * @returns {Promise<Object>} - The processed team data
   */
  async processTeam(teamData) {
    if (!teamData || !teamData.id) {
      console.warn('⚠️ Invalid team data received:', teamData);
      return null;
    }

    try {
      // Normalize team data
      const teamName = teamData.name || 'Unknown Team';
      const shortName = teamData.shortName || teamData.tla || teamName.substring(0, 3).toUpperCase();
      const tla = teamData.tla || teamData.shortName || teamName.substring(0, 3).toUpperCase();
      const crestUrl = teamData.crest || teamData.crestUrl || teamData.crestUrl || null;

      // Check if team already exists
      let { data: existingTeam, error: fetchError } = await supabase
        .from('teams')
        .select('id, name, short_name, tla')
        .eq('external_id', teamData.id.toString())
        .single();

      if (!existingTeam) {
        // Team doesn't exist, create it
        const { data: newTeam, error: insertError } = await supabase
          .from('teams')
          .insert([{
            external_id: teamData.id.toString(),
            name: teamName,
            short_name: shortName,
            tla: tla,
            crest_url: crestUrl,
            website: teamData.website || null,
            founded: teamData.founded || null,
            club_colors: teamData.clubColors || null,
            venue: teamData.venue || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]);

        if (error) throw error;
        console.log(`✅ Added new team: ${teamData.name}`);
      }
    } catch (error) {
      console.error(`❌ Error processing team ${teamData.id || 'unknown'}:`, error.message);
    }
  }
}

module.exports = BackgroundProcessor;
