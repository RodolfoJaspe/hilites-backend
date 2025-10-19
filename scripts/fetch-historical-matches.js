require('dotenv').config();
const MatchDataService = require('../services/matchDataService');

async function fetchHistoricalMatches() {
  const matchService = new MatchDataService();
  
  try {
    console.log('🚀 Starting historical match fetch...');
    
    // Calculate date range (past 30 days)
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    const dateFrom = thirtyDaysAgo.toISOString().split('T')[0];
    const dateTo = today.toISOString().split('T')[0];
    
    console.log(`📅 Fetching matches from ${dateFrom} to ${dateTo}...`);
    
    // Array to store all fetched matches
    let allMatches = [];
    
    // Fetch matches day by day to avoid rate limits and get completed matches
    const currentDate = new Date(thirtyDaysAgo);
    
    while (currentDate <= today) {
      const dateStr = currentDate.toISOString().split('T')[0];
      
      try {
        console.log(`\n📆 Fetching matches for ${dateStr}...`);
        
        // Use the Football-Data.org API to fetch matches for this specific date
        const data = await matchService.makeFootballDataRequest(`/matches?date=${dateStr}`);
        
        if (data.matches && data.matches.length > 0) {
          console.log(`   Found ${data.matches.length} matches`);
          
          // Transform matches to our format
          const matches = await Promise.all(
            data.matches.map(async (match) => ({
              external_id: match.id.toString(),
              home_team_id: await matchService.getOrCreateTeam(match.homeTeam),
              away_team_id: await matchService.getOrCreateTeam(match.awayTeam),
              competition_id: match.competition?.code || match.competition?.id?.toString(),
              competition_name: match.competition?.name || 'Unknown',
              match_date: new Date(match.utcDate).toISOString(),
              status: matchService.mapMatchStatus(match.status),
              home_score: match.score?.fullTime?.home || null,
              away_score: match.score?.fullTime?.away || null,
              venue: match.venue || null,
              referee: match.referees?.[0]?.name || null,
              weather_conditions: null,
              attendance: match.attendance || null,
              match_week: match.matchday || null,
              season: matchService.extractSeason(match.season?.startDate)
            }))
          );
          
          // Filter only finished matches
          const finishedMatches = matches.filter(m => m.status === 'finished');
          console.log(`   ✅ ${finishedMatches.length} finished matches`);
          
          allMatches = allMatches.concat(finishedMatches);
          
          // Store matches immediately to avoid losing data
          if (finishedMatches.length > 0) {
            await matchService.storeMatches(finishedMatches);
          }
        } else {
          console.log(`   No matches found`);
        }
        
        // Wait 7 seconds between requests to respect rate limits (10 requests per minute)
        await new Promise(resolve => setTimeout(resolve, 7000));
        
      } catch (error) {
        console.error(`❌ Error fetching matches for ${dateStr}:`, error.message);
        // Continue with next date even if one fails
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    console.log('\n🎉 Historical match fetch completed!');
    console.log(`📊 Total finished matches fetched: ${allMatches.length}`);
    
    // Summary by competition
    const competitionSummary = allMatches.reduce((acc, match) => {
      const comp = match.competition_name;
      acc[comp] = (acc[comp] || 0) + 1;
      return acc;
    }, {});
    
    console.log('\n📋 Matches by competition:');
    Object.entries(competitionSummary)
      .sort((a, b) => b[1] - a[1])
      .forEach(([comp, count]) => {
        console.log(`   ${comp}: ${count} matches`);
      });
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
fetchHistoricalMatches();

