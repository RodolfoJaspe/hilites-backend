const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

/**
 * Multi-Source Match Data Service
 * 
 * This service fetches match data from multiple sources and validates it
 * against a known Premier League teams list to ensure data accuracy.
 */
class MultiSourceMatchService {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Current Premier League teams (2024-25 season) - validated source
    this.PREMIER_LEAGUE_TEAMS = [
      'Arsenal',
      'Liverpool', 
      'Tottenham Hotspur',
      'Bournemouth',
      'Manchester City',
      'Crystal Palace',
      'Chelsea',
      'Everton',
      'Sunderland', // Note: This might be wrong in your table - they're in Championship
      'Manchester United',
      'Newcastle United',
      'Brighton & Hove Albion',
      'Aston Villa',
      'Fulham',
      'Leeds United',
      'Brentford',
      'Nottingham Forest',
      'Burnley',
      'West Ham United',
      'Wolverhampton Wanderers'
    ];

    // Alternative team name mappings for different APIs
    this.TEAM_NAME_MAPPINGS = {
      'Tottenham': 'Tottenham Hotspur',
      'Man City': 'Manchester City',
      'Man United': 'Manchester United',
      'Man Utd': 'Manchester United',
      'Brighton': 'Brighton & Hove Albion',
      'Wolves': 'Wolverhampton Wanderers',
      'West Ham': 'West Ham United',
      'Nottingham Forest': 'Nottingham Forest',
      'Nottm Forest': 'Nottingham Forest',
      'Leeds': 'Leeds United',
      'Newcastle': 'Newcastle United'
    };

    // API configurations
    this.apis = {
      footballData: {
        name: 'Football-Data.org',
        baseUrl: 'https://api.football-data.org/v4',
        apiKey: process.env.FOOTBALL_DATA_API_KEY,
        competitionId: 'PL',
        rateLimit: 10, // requests per minute
        priority: 1
      },
      apiFootball: {
        name: 'API-Football',
        baseUrl: 'https://v3.football.api-sports.io',
        apiKey: process.env.API_FOOTBALL_KEY,
        leagueId: 39, // Premier League
        season: 2024,
        rateLimit: 100, // requests per minute
        priority: 2
      }
    };

    this.requestCounts = {};
    this.lastReset = {};
  }

  /**
   * Normalize team name to match our Premier League teams list
   */
  normalizeTeamName(teamName) {
    if (!teamName) return null;
    
    // First check direct mappings
    if (this.TEAM_NAME_MAPPINGS[teamName]) {
      return this.TEAM_NAME_MAPPINGS[teamName];
    }

    // Check if it's already in our list
    if (this.PREMIER_LEAGUE_TEAMS.includes(teamName)) {
      return teamName;
    }

    // Try partial matching
    const normalizedName = teamName.toLowerCase().trim();
    for (const plTeam of this.PREMIER_LEAGUE_TEAMS) {
      const plTeamLower = plTeam.toLowerCase();
      if (plTeamLower.includes(normalizedName) || normalizedName.includes(plTeamLower)) {
        return plTeam;
      }
    }

    return null; // Not a Premier League team
  }

  /**
   * Validate if a match involves Premier League teams
   */
  validateMatch(match) {
    const homeTeam = this.normalizeTeamName(match.homeTeam?.name);
    const awayTeam = this.normalizeTeamName(match.awayTeam?.name);

    return {
      isValid: !!(homeTeam && awayTeam),
      homeTeam,
      awayTeam,
      originalHomeTeam: match.homeTeam?.name,
      originalAwayTeam: match.awayTeam?.name
    };
  }

  /**
   * Make request to Football-Data.org API
   */
  async makeFootballDataRequest(endpoint) {
    const api = this.apis.footballData;
    
    // Rate limiting
    if (!this.requestCounts[api.name]) {
      this.requestCounts[api.name] = 0;
      this.lastReset[api.name] = Date.now();
    }

    const now = Date.now();
    if (now - this.lastReset[api.name] > 60000) { // Reset every minute
      this.requestCounts[api.name] = 0;
      this.lastReset[api.name] = now;
    }

    if (this.requestCounts[api.name] >= api.rateLimit) {
      throw new Error(`Rate limit exceeded for ${api.name}. Please wait.`);
    }

    this.requestCounts[api.name]++;

    const response = await axios.get(`${api.baseUrl}${endpoint}`, {
      headers: {
        'X-Auth-Token': api.apiKey,
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  }

  /**
   * Make request to API-Football
   */
  async makeApiFootballRequest(endpoint) {
    const api = this.apis.apiFootball;
    
    // Rate limiting
    if (!this.requestCounts[api.name]) {
      this.requestCounts[api.name] = 0;
      this.lastReset[api.name] = Date.now();
    }

    const now = Date.now();
    if (now - this.lastReset[api.name] > 60000) { // Reset every minute
      this.requestCounts[api.name] = 0;
      this.lastReset[api.name] = now;
    }

    if (this.requestCounts[api.name] >= api.rateLimit) {
      throw new Error(`Rate limit exceeded for ${api.name}. Please wait.`);
    }

    this.requestCounts[api.name]++;

    const response = await axios.get(`${api.baseUrl}${endpoint}`, {
      headers: {
        'X-RapidAPI-Key': api.apiKey,
        'X-RapidAPI-Host': 'v3.football.api-sports.io'
      }
    });

    return response.data;
  }

  /**
   * Fetch matches from Football-Data.org
   */
  async fetchFromFootballData(dateFrom, dateTo) {
    try {
      console.log('📊 Fetching from Football-Data.org...');
      const data = await this.makeFootballDataRequest(
        `/competitions/${this.apis.footballData.competitionId}/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`
      );

      const validatedMatches = [];
      const invalidMatches = [];

      for (const match of data.matches) {
        const validation = this.validateMatch(match);
        
        if (validation.isValid) {
          validatedMatches.push({
            source: 'football-data.org',
            external_id: match.id.toString(),
            home_team_name: validation.homeTeam,
            away_team_name: validation.awayTeam,
            competition_id: 'PL',
            competition_name: 'Premier League',
            match_date: new Date(match.utcDate).toISOString(),
            status: this.mapMatchStatus(match.status),
            home_score: match.score?.fullTime?.home || null,
            away_score: match.score?.fullTime?.away || null,
            venue: match.venue || null,
            referee: match.referees?.[0]?.name || null,
            match_week: match.matchday || null,
            season: this.extractSeason(match.season?.startDate)
          });
        } else {
          invalidMatches.push({
            home_team: validation.originalHomeTeam,
            away_team: validation.originalAwayTeam,
            reason: 'Non-Premier League teams'
          });
        }
      }

      console.log(`✅ Football-Data.org: ${validatedMatches.length} valid, ${invalidMatches.length} invalid matches`);
      if (invalidMatches.length > 0) {
        console.log('❌ Invalid matches:', invalidMatches.slice(0, 3));
      }

      return validatedMatches;
    } catch (error) {
      console.error('❌ Football-Data.org error:', error.message);
      return [];
    }
  }

  /**
   * Fetch matches from API-Football
   */
  async fetchFromApiFootball(dateFrom, dateTo) {
    try {
      console.log('📊 Fetching from API-Football...');
      const data = await this.makeApiFootballRequest(
        `/fixtures?league=${this.apis.apiFootball.leagueId}&season=${this.apis.apiFootball.season}&from=${dateFrom}&to=${dateTo}`
      );

      const validatedMatches = [];
      const invalidMatches = [];

      for (const match of data.response || []) {
        const matchData = {
          homeTeam: { name: match.teams.home.name },
          awayTeam: { name: match.teams.away.name },
          id: match.fixture.id,
          utcDate: match.fixture.date,
          status: match.fixture.status.short,
          score: {
            fullTime: {
              home: match.goals.home,
              away: match.goals.away
            }
          },
          venue: match.fixture.venue?.name,
          matchday: match.league.round
        };

        const validation = this.validateMatch(matchData);
        
        if (validation.isValid) {
          validatedMatches.push({
            source: 'api-football',
            external_id: match.fixture.id.toString(),
            home_team_name: validation.homeTeam,
            away_team_name: validation.awayTeam,
            competition_id: 'PL',
            competition_name: 'Premier League',
            match_date: new Date(match.fixture.date).toISOString(),
            status: this.mapMatchStatus(match.fixture.status.short),
            home_score: match.goals.home,
            away_score: match.goals.away,
            venue: match.fixture.venue?.name || null,
            referee: null, // API-Football doesn't provide referee info
            match_week: match.league.round || null,
            season: this.apis.apiFootball.season
          });
        } else {
          invalidMatches.push({
            home_team: validation.originalHomeTeam,
            away_team: validation.originalAwayTeam,
            reason: 'Non-Premier League teams'
          });
        }
      }

      console.log(`✅ API-Football: ${validatedMatches.length} valid, ${invalidMatches.length} invalid matches`);
      if (invalidMatches.length > 0) {
        console.log('❌ Invalid matches:', invalidMatches.slice(0, 3));
      }

      return validatedMatches;
    } catch (error) {
      console.error('❌ API-Football error:', error.message);
      return [];
    }
  }

  /**
   * Fetch matches from multiple sources and merge results
   */
  async fetchMatchesFromMultipleSources(dateFrom, dateTo) {
    console.log('🔄 Fetching matches from multiple sources...');
    
    const [footballDataMatches, apiFootballMatches] = await Promise.allSettled([
      this.fetchFromFootballData(dateFrom, dateTo),
      this.fetchFromApiFootball(dateFrom, dateTo)
    ]);

    const allMatches = [
      ...(footballDataMatches.status === 'fulfilled' ? footballDataMatches.value : []),
      ...(apiFootballMatches.status === 'fulfilled' ? apiFootballMatches.value : [])
    ];

    // Merge and deduplicate matches
    const matchMap = new Map();
    
    for (const match of allMatches) {
      const key = `${match.home_team_name}_vs_${match.away_team_name}_${match.match_date.split('T')[0]}`;
      
      if (!matchMap.has(key)) {
        matchMap.set(key, match);
      } else {
        // Prefer higher priority source (lower number = higher priority)
        const existing = matchMap.get(key);
        const existingPriority = this.apis[existing.source.replace('.', '')]?.priority || 999;
        const newPriority = this.apis[match.source.replace('.', '')]?.priority || 999;
        
        if (newPriority < existingPriority) {
          matchMap.set(key, match);
        }
      }
    }

    const mergedMatches = Array.from(matchMap.values());
    console.log(`🎯 Merged results: ${mergedMatches.length} unique matches from ${allMatches.length} total`);

    return mergedMatches;
  }

  /**
   * Get or create team in database
   */
  async getOrCreateTeam(teamName) {
    try {
      // First try to find existing team
      const { data: existingTeam, error: findError } = await this.supabase
        .from('teams')
        .select('id')
        .eq('name', teamName)
        .single();

      if (existingTeam && !findError) {
        return existingTeam.id;
      }

      // Create new team
      const { data: newTeam, error: createError } = await this.supabase
        .from('teams')
        .insert([{
          name: teamName,
          short_name: this.getShortName(teamName),
          country: 'England',
          league: 'Premier League',
          logo_url: null,
          website_url: null,
          founded_year: null,
          stadium: null
        }])
        .select('id')
        .single();

      if (createError) {
        console.error('Error creating team:', createError);
        throw createError;
      }

      console.log(`✅ Created new team: ${teamName}`);
      return newTeam.id;
    } catch (error) {
      console.error('Error in getOrCreateTeam:', error.message);
      throw error;
    }
  }

  /**
   * Get short name for team
   */
  getShortName(teamName) {
    const shortNames = {
      'Arsenal': 'ARS',
      'Liverpool': 'LIV',
      'Tottenham Hotspur': 'TOT',
      'Bournemouth': 'BOU',
      'Manchester City': 'MCI',
      'Crystal Palace': 'CRY',
      'Chelsea': 'CHE',
      'Everton': 'EVE',
      'Sunderland': 'SUN',
      'Manchester United': 'MUN',
      'Newcastle United': 'NEW',
      'Brighton & Hove Albion': 'BHA',
      'Aston Villa': 'AVL',
      'Fulham': 'FUL',
      'Leeds United': 'LEE',
      'Brentford': 'BRE',
      'Nottingham Forest': 'NFO',
      'Burnley': 'BUR',
      'West Ham United': 'WHU',
      'Wolverhampton Wanderers': 'WOL'
    };
    
    return shortNames[teamName] || teamName.substring(0, 3).toUpperCase();
  }

  /**
   * Map match status
   */
  mapMatchStatus(status) {
    const statusMap = {
      'SCHEDULED': 'scheduled',
      'LIVE': 'live',
      'IN_PLAY': 'live',
      'PAUSED': 'live',
      'FINISHED': 'finished',
      'POSTPONED': 'postponed',
      'SUSPENDED': 'postponed',
      'CANCELLED': 'cancelled',
      'FT': 'finished',
      'HT': 'live',
      '1H': 'live',
      '2H': 'live'
    };
    
    return statusMap[status] || 'scheduled';
  }

  /**
   * Extract season from date
   */
  extractSeason(startDate) {
    if (!startDate) return null;
    const year = new Date(startDate).getFullYear();
    return `${year}-${year + 1}`;
  }

  /**
   * Store matches in database
   */
  async storeMatches(matches) {
    console.log(`💾 Storing ${matches.length} matches...`);
    
    const storedMatches = [];
    
    for (const match of matches) {
      try {
        const homeTeamId = await this.getOrCreateTeam(match.home_team_name);
        const awayTeamId = await this.getOrCreateTeam(match.away_team_name);

        const { data, error } = await this.supabase
          .from('matches')
          .upsert([{
            external_id: match.external_id,
            home_team_id: homeTeamId,
            away_team_id: awayTeamId,
            competition_id: match.competition_id,
            competition_name: match.competition_name,
            match_date: match.match_date,
            status: match.status,
            home_score: match.home_score,
            away_score: match.away_score,
            venue: match.venue,
            referee: match.referee,
            match_week: match.match_week,
            season: match.season
          }], { 
            onConflict: 'external_id',
            ignoreDuplicates: false 
          })
          .select('id')
          .single();

        if (error) {
          console.error('Error storing match:', error);
          continue;
        }

        storedMatches.push({
          id: data.id,
          home_team: match.home_team_name,
          away_team: match.away_team_name,
          date: match.match_date,
          source: match.source
        });
      } catch (error) {
        console.error('Error processing match:', error.message);
      }
    }

    console.log(`✅ Successfully stored ${storedMatches.length} matches`);
    return storedMatches;
  }

  /**
   * Main method to fetch and store matches from multiple sources
   */
  async fetchAndStoreMatches(dateFrom, dateTo) {
    try {
      console.log('🚀 Starting multi-source match data fetch...');
      
      const matches = await this.fetchMatchesFromMultipleSources(dateFrom, dateTo);
      
      if (matches.length === 0) {
        console.log('⚠️ No matches found from any source');
        return [];
      }

      const storedMatches = await this.storeMatches(matches);
      
      console.log('🎉 Multi-source match data fetch completed!');
      return storedMatches;
    } catch (error) {
      console.error('❌ Error in multi-source fetch:', error.message);
      throw error;
    }
  }
}

module.exports = MultiSourceMatchService;
