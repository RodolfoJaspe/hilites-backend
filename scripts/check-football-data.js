require('dotenv').config();
const axios = require('axios');

// API configuration
const FOOTBALL_DATA_API_KEY = process.env.FOOTBALL_DATA_API_KEY;

// Test date (today by default)
const testDate = process.argv[2] ? new Date(process.argv[2]) : new Date();
const dateStr = formatDate(testDate);
console.log(`📅 Checking matches for: ${dateStr}`);

// Helper function to format date as YYYY-MM-DD
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

// Fetch matches from Football-Data.org API
async function fetchMatches(date) {
  try {
    console.log('\n🔍 Fetching matches from Football-Data.org...');
    const response = await axios.get(
      `http://api.football-data.org/v4/matches?date=${date}`,
      {
        headers: {
          'X-Auth-Token': FOOTBALL_DATA_API_KEY,
          'User-Agent': 'Hilites-App/1.0'
        },
        timeout: 10000
      }
    );
    
    const matches = response.data.matches || [];
    const competitions = [...new Set(matches.map(m => m.competition?.name).filter(Boolean))];
    
    return {
      success: true,
      matchCount: matches.length,
      competitions,
      matches: matches.map(match => ({
        homeTeam: match.homeTeam?.name || 'Unknown',
        awayTeam: match.awayTeam?.name || 'Unknown',
        competition: match.competition?.name || 'Unknown',
        status: match.status,
        score: match.score?.fullTime,
        utcDate: match.utcDate
      }))
    };
  } catch (error) {
    console.error(`\n❌ Error fetching matches:`, error.message);
    return { 
      success: false, 
      error: error.response?.data?.message || error.message 
    };
  }
}

// Display match results
function displayResults(results) {
  console.log('\n📊 Match Results:');
  console.log('='.repeat(50));
  
  if (!results.success) {
    console.log(`\n❌ Failed to fetch matches: ${results.error}`);
    return;
  }
  
  console.log(`\n✅ Found ${results.matchCount} matches`);
  console.log(`🏆 ${results.competitions.length} competitions: ${results.competitions.join(', ')}\n`);
  
  if (results.matches.length === 0) {
    console.log('No matches found for this date.');
    return;
  }
  
  console.log('📋 Match List:');
  results.matches.forEach((match, index) => {
    console.log(`\n${index + 1}. ${match.homeTeam} vs ${match.awayTeam}`);
    console.log(`   Competition: ${match.competition}`);
    console.log(`   Status: ${match.status}`);
    
    if (match.score) {
      const homeScore = match.score.home !== null ? match.score.home : '?';
      const awayScore = match.score.away !== null ? match.score.away : '?';
      console.log(`   Score: ${homeScore} - ${awayScore}`);
    }
    
    if (match.utcDate) {
      const matchTime = new Date(match.utcDate).toLocaleTimeString();
      console.log(`   Time: ${matchTime}`);
    }
  });
  
  console.log('\n' + '='.repeat(50));
}

// Run the script
async function main() {
  if (!FOOTBALL_DATA_API_KEY) {
    console.error('❌ Error: FOOTBALL_DATA_API_KEY is not set in environment variables');
    process.exit(1);
  }
  
  const results = await fetchMatches(dateStr);
  displayResults(results);
}

main().catch(error => {
  console.error('\n❌ An unexpected error occurred:', error);
  process.exit(1);
});
