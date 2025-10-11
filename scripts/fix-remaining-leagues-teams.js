require('dotenv').config({ path: './.env' });
const MatchDataService = require('../services/matchDataService');

async function fixRemainingLeaguesTeams() {
  console.log('🔧 Fixing team data for Serie A, Bundesliga, and Ligue 1...\n');

  const matchDataService = new MatchDataService();

  // Define the leagues to fix
  const leagues = [
    {
      id: 'SA',
      name: 'Serie A',
      apiId: '2019',
      country: 'Italy',
      flag: '🇮🇹'
    },
    {
      id: 'BL1',
      name: 'Bundesliga',
      apiId: '2002',
      country: 'Germany',
      flag: '🇩🇪'
    },
    {
      id: 'FL1',
      name: 'Ligue 1',
      apiId: '2015',
      country: 'France',
      flag: '🇫🇷'
    }
  ];

  try {
    let totalFixed = 0;

    for (const league of leagues) {
      console.log(`\n${league.flag} Processing ${league.name}...`);
      
      // 1. Find all matches with null team IDs for this league
      const { data: brokenMatches, error: findError } = await matchDataService.supabase
        .from('matches')
        .select('*')
        .eq('competition_id', league.apiId)
        .or('home_team_id.is.null,away_team_id.is.null');

      if (findError) {
        console.log(`   ❌ Error finding broken matches:`, findError.message);
        continue;
      }

      console.log(`   📊 Found ${brokenMatches.length} matches with missing team data`);

      if (brokenMatches.length === 0) {
        console.log(`   ✅ No broken matches found for ${league.name}`);
        continue;
      }

      // 2. For each broken match, re-fetch from API and fix
      for (const match of brokenMatches) {
        try {
          console.log(`   🔄 Fixing match: ${match.external_id}`);
          
          // Fetch match details from API
          const matchDetails = await matchDataService.makeFootballDataRequest(
            `/matches/${match.external_id}`
          );

          if (!matchDetails || !matchDetails.match) {
            console.log(`     ⚠️ Could not fetch details for match ${match.external_id}`);
            continue;
          }

          const apiMatch = matchDetails.match;

          // Get or create teams
          const homeTeamId = await matchDataService.getOrCreateTeam(apiMatch.homeTeam);
          const awayTeamId = await matchDataService.getOrCreateTeam(apiMatch.awayTeam);

          if (!homeTeamId || !awayTeamId) {
            console.log(`     ❌ Failed to create teams for match ${match.external_id}`);
            console.log(`        Home: ${apiMatch.homeTeam?.name} (${homeTeamId})`);
            console.log(`        Away: ${apiMatch.awayTeam?.name} (${awayTeamId})`);
            continue;
          }

          // Update match with correct team IDs
          const { error: updateError } = await matchDataService.supabase
            .from('matches')
            .update({
              home_team_id: homeTeamId,
              away_team_id: awayTeamId
            })
            .eq('id', match.id);

          if (updateError) {
            console.log(`     ❌ Error updating match:`, updateError.message);
          } else {
            console.log(`     ✅ Fixed: ${apiMatch.homeTeam.name} vs ${apiMatch.awayTeam.name}`);
            totalFixed++;
          }

          // Add a small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error) {
          console.log(`     ❌ Error processing match ${match.external_id}:`, error.message);
          
          // If we hit rate limit, wait longer
          if (error.response?.status === 429) {
            console.log(`     ⏳ Rate limit hit, waiting 60 seconds...`);
            await new Promise(resolve => setTimeout(resolve, 60000));
          }
        }
      }
    }

    // 3. Verify the fix
    console.log('\n📊 Verification Summary:');
    for (const league of leagues) {
      const { data: stillBroken, error } = await matchDataService.supabase
        .from('matches')
        .select('id', { count: 'exact' })
        .eq('competition_id', league.apiId)
        .or('home_team_id.is.null,away_team_id.is.null');

      if (!error) {
        console.log(`   ${league.flag} ${league.name}: ${stillBroken.length} matches still broken`);
      }

      const { data: totalMatches, error: totalError } = await matchDataService.supabase
        .from('matches')
        .select('id', { count: 'exact' })
        .eq('competition_id', league.apiId);

      if (!totalError) {
        console.log(`      Total matches: ${totalMatches.length}`);
      }
    }

    console.log(`\n🎉 Fix completed! Total matches fixed: ${totalFixed}`);

  } catch (error) {
    console.error('❌ Error fixing teams:', error.message);
  }
}

// Run the script
fixRemainingLeaguesTeams().catch(console.error);


