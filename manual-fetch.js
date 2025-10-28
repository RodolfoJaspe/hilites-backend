require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Football-Data.org API configuration
const API_TOKEN = process.env.FOOTBALL_DATA_API_KEY;
const API_BASE_URL = 'https://api.football-data.org/v4';

// League configurations
const LEAGUES = [
  { id: 'PL', name: 'Premier League' },
  { id: 'PD', name: 'La Liga' },
  { id: 'SA', name: 'Serie A' },
  { id: 'BL1', name: 'Bundesliga' },
  { id: 'FL1', name: 'Ligue 1' },
  { id: 'CL', name: 'Champions League' },
  // Temporarily remove EL until we have access
  // { id: 'EL', name: 'Europa League' },
];

// Rate limiting
let requestsThisMinute = 0;
let lastRequestTime = Date.now();
const REQUESTS_PER_MINUTE = 10; // Adjust based on your plan

// Helper function to handle rate limiting
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const checkRateLimit = async () => {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  // Reset counter if more than a minute has passed
  if (timeSinceLastRequest > 60000) {
    requestsThisMinute = 0;
  }
  
  // If we've hit the rate limit, wait until the next minute
  if (requestsThisMinute >= REQUESTS_PER_MINUTE) {
    const timeToWait = 60000 - timeSinceLastRequest + 1000; // Add 1s buffer
    console.log(`⚠️ Rate limit reached. Waiting ${Math.ceil(timeToWait/1000)} seconds...`);
    await delay(timeToWait);
    requestsThisMinute = 0;
  }
  
  lastRequestTime = Date.now();
  requestsThisMinute++;
};

// Process a single team
const processTeam = async (teamData) => {
  if (!teamData || !teamData.id) return null;

  try {
    // Check if team exists
    const { data: existingTeam } = await supabase
      .from('teams')
      .select('id, name')
      .eq('external_id', teamData.id.toString())
      .single();

    if (existingTeam) {
      return existingTeam;
    }

    // Create new team
    const { data: newTeam, error } = await supabase
      .from('teams')
      .insert([{
        external_id: teamData.id.toString(),
        name: teamData.name || 'Unknown Team',
        short_name: teamData.shortName || teamData.tla || teamData.name?.substring(0, 3).toUpperCase() || 'TBD',
        tla: teamData.tla || teamData.shortName || teamData.name?.substring(0, 3).toUpperCase() || 'TBD',
        crest_url: teamData.crest || teamData.crestUrl || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;
    console.log(`✅ Added new team: ${teamData.name}`);
    return newTeam;
  } catch (error) {
    console.error(`❌ Error processing team ${teamData.id}:`, error.message);
    return null;
  }
};

// Process a single match
const processMatch = async (match) => {
  if (!match || !match.id) return null;

  try {
    // Process teams
    const homeTeam = await processTeam(match.homeTeam);
    const awayTeam = await processTeam(match.awayTeam);

    if (!homeTeam || !awayTeam) {
      console.warn(`⚠️ Skipping match ${match.id} due to missing team data`);
      return null;
    }

    // Check if match exists
    const { data: existingMatch } = await supabase
      .from('matches')
      .select('id, status, is_highlight_processed')
      .eq('external_id', match.id.toString())
      .single();

    // Map status to match database constraint
    let status = 'scheduled';
    if (match.status === 'FINISHED') status = 'finished';
    else if (['IN_PLAY', 'PAUSED'].includes(match.status)) status = 'live';
    else if (['POSTPONED', 'SUSPENDED'].includes(match.status)) status = 'postponed';
    else if (match.status === 'CANCELLED') status = 'cancelled';

    const competitionName = match.competition?.name || 'Unknown';
    const matchData = {
      external_id: match.id.toString(),
      home_team_id: homeTeam.id,
      home_team_name: homeTeam.name,
      away_team_id: awayTeam.id,
      away_team_name: awayTeam.name,
      home_score: match.score?.fullTime?.home ?? null,
      away_score: match.score?.fullTime?.away ?? null,
      match_date: new Date(match.utcDate).toISOString(),
      status: status,
      competition: competitionName,
      competition_name: competitionName, // Ensure this matches the competition field
      competition_id: match.competition?.id || null,
      external_competition_id: match.competition?.id?.toString() || null,
      matchday: match.matchday || null,
      last_updated: new Date().toISOString(),
      venue: match.venue || null,
      referee: match.referees?.[0]?.name || null,
      is_highlight_processed: existingMatch?.is_highlight_processed || false
    };

    if (existingMatch) {
      // Update existing match
      const { data: updatedMatch, error } = await supabase
        .from('matches')
        .update(matchData)
        .eq('id', existingMatch.id)
        .select()
        .single();

      if (error) throw error;
      console.log(`🔄 Updated match: ${homeTeam.name} vs ${awayTeam.name} (${status})`);
      return updatedMatch;
    } else {
      // Insert new match
      const { data: newMatch, error } = await supabase
        .from('matches')
        .insert([matchData])
        .select()
        .single();

      if (error) throw error;
      console.log(`✅ Added new match: ${homeTeam.name} vs ${awayTeam.name} (${status})`);
      return newMatch;
    }
  } catch (error) {
    console.error(`❌ Error processing match ${match.id}:`, error.message);
    return null;
  }
};

// Fetch matches for a specific competition
const fetchMatches = async (leagueId) => {
  try {
    await checkRateLimit();
    
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const fromDate = today.toISOString().split('T')[0];
    const toDate = tomorrow.toISOString().split('T')[0];
    
    console.log(`⚽ Fetching matches for ${leagueId} from ${fromDate} to ${toDate}...`);
    
    const response = await axios.get(
      `${API_BASE_URL}/competitions/${leagueId}/matches`,
      {
        params: {
          dateFrom: fromDate,
          dateTo: toDate
        },
        headers: {
          'X-Auth-Token': API_TOKEN
        }
      }
    );
    
    console.log(`📥 Found ${response.data.matches?.length || 0} matches for ${leagueId}`);
    return response.data.matches || [];
  } catch (error) {
    if (error.response) {
      console.error(`❌ Error fetching ${leagueId} matches:`, {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    } else {
      console.error(`❌ Error fetching ${leagueId} matches:`, error.message);
    }
    return [];
  }
};

// Main function
const main = async () => {
  console.log('🚀 Starting manual match fetch...');
  
  try {
    for (const league of LEAGUES) {
      console.log(`\n📊 Processing ${league.name} (${league.id})...`);
      const matches = await fetchMatches(league.id);
      
      for (const match of matches) {
        await processMatch(match);
        // Small delay between processing matches to avoid rate limiting
        await delay(100);
      }
      
      // Add a small delay between leagues
      await delay(1000);
    }
    
    console.log('\n✅ All matches processed successfully!');
  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    process.exit(0);
  }
};

// Run the script
main();
