require('dotenv').config({ path: './.env' });
const MatchDataService = require('../services/matchDataService');

async function fixJuventusMatch() {
  console.log('🔧 Fixing Juventus match...\n');

  const matchDataService = new MatchDataService();
  const matchExternalId = '552002';

  try {
    console.log(`📥 Fetching match ${matchExternalId} from API...`);
    
    // Fetch match details from API
    const matchDetails = await matchDataService.makeFootballDataRequest(
      `/matches/${matchExternalId}`
    );

    if (!matchDetails || !matchDetails.match) {
      console.log('❌ Could not fetch match details from API');
      return;
    }

    const apiMatch = matchDetails.match;
    
    console.log('📊 Match details:');
    console.log(`   Home: ${apiMatch.homeTeam?.name}`);
    console.log(`   Away: ${apiMatch.awayTeam?.name}`);
    console.log(`   Competition: ${apiMatch.competition?.name}`);
    console.log(`   Date: ${apiMatch.utcDate}`);
    console.log('');

    // Get or create teams
    console.log('🔄 Creating/finding teams...');
    const homeTeamId = await matchDataService.getOrCreateTeam(apiMatch.homeTeam);
    const awayTeamId = await matchDataService.getOrCreateTeam(apiMatch.awayTeam);

    if (!homeTeamId || !awayTeamId) {
      console.log('❌ Failed to create teams');
      console.log(`   Home Team ID: ${homeTeamId}`);
      console.log(`   Away Team ID: ${awayTeamId}`);
      return;
    }

    console.log('✅ Teams created/found:');
    console.log(`   Home Team ID: ${homeTeamId}`);
    console.log(`   Away Team ID: ${awayTeamId}`);
    console.log('');

    // Update match
    console.log('💾 Updating match in database...');
    const { data, error } = await matchDataService.supabase
      .from('matches')
      .update({
        home_team_id: homeTeamId,
        away_team_id: awayTeamId
      })
      .eq('external_id', matchExternalId)
      .select();

    if (error) {
      console.log('❌ Error updating match:', error.message);
      return;
    }

    console.log('✅ Match updated successfully!');
    console.log(`   ${apiMatch.homeTeam.name} vs ${apiMatch.awayTeam.name}`);

    // Verify
    console.log('\n🔍 Verifying fix...');
    const { data: verifyMatch, error: verifyError } = await matchDataService.supabase
      .from('matches')
      .select(`
        id,
        external_id,
        home_team_id,
        away_team_id,
        home_team:teams!matches_home_team_id_fkey(name),
        away_team:teams!matches_away_team_id_fkey(name)
      `)
      .eq('external_id', matchExternalId)
      .single();

    if (verifyError) {
      console.log('❌ Error verifying:', verifyError.message);
      return;
    }

    if (verifyMatch.home_team_id && verifyMatch.away_team_id) {
      console.log('✅ Verification successful!');
      console.log(`   ${verifyMatch.home_team.name} vs ${verifyMatch.away_team.name}`);
    } else {
      console.log('❌ Match still broken after update');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fixJuventusMatch().catch(console.error);

