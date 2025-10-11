require('dotenv').config({ path: './.env' });
const { createClient } = require('@supabase/supabase-js');

async function fixLaLigaMatches() {
  console.log('🔧 Fixing La Liga matches with null team references...\n');

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // 1. Find matches with null team references
    console.log('🔍 Finding matches with null team references...');
    const { data: brokenMatches, error: findError } = await supabase
      .from('matches')
      .select('id, external_id, competition_id, home_team_id, away_team_id')
      .eq('competition_id', '2014')
      .or('home_team_id.is.null,away_team_id.is.null');

    if (findError) {
      console.log('   ❌ Error finding broken matches:', findError.message);
      return;
    }

    console.log(`   📊 Found ${brokenMatches.length} matches with null team references`);

    if (brokenMatches.length === 0) {
      console.log('   ✅ No broken matches found!');
      return;
    }

    // 2. Get all La Liga teams for reference
    console.log('\n📋 Getting La Liga teams...');
    const { data: laLigaTeams, error: teamsError } = await supabase
      .from('teams')
      .select('id, name, external_id')
      .in('external_id', ['81', '86', '90', '92', '95', '87', '88', '89', '94', '559', '558', '263', '298', '285', '516', '611', '3', '113', '11034', '4', '3929', '548']);

    if (teamsError) {
      console.log('   ❌ Error getting teams:', teamsError.message);
      return;
    }

    console.log(`   📊 Found ${laLigaTeams.length} La Liga teams`);

    // Create a map of external_id to team_id
    const teamMap = {};
    laLigaTeams.forEach(team => {
      teamMap[team.external_id] = team.id;
    });

    // 3. Delete broken matches (we'll re-fetch them properly)
    console.log('\n🗑️ Deleting broken matches...');
    const brokenMatchIds = brokenMatches.map(match => match.id);
    
    const { error: deleteError } = await supabase
      .from('matches')
      .delete()
      .in('id', brokenMatchIds);

    if (deleteError) {
      console.log('   ❌ Error deleting broken matches:', deleteError.message);
      return;
    }

    console.log(`   ✅ Deleted ${brokenMatchIds.length} broken matches`);

    // 4. Re-fetch La Liga matches properly
    console.log('\n⚽ Re-fetching La Liga matches...');
    const MatchDataService = require('../services/matchDataService');
    const matchDataService = new MatchDataService();

    // Get matches from the last 30 days
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
    const dateFrom = thirtyDaysAgo.toISOString().split('T')[0];
    const dateTo = today.toISOString().split('T')[0];

    const matches = await matchDataService.fetchMatches(
      '2014', // La Liga ID
      dateFrom, 
      dateTo
    );

    // Store the matches in the database
    if (matches && matches.length > 0) {
      const { data: storedMatches, error: storeError } = await supabase
        .from('matches')
        .upsert(matches, { onConflict: 'external_id' })
        .select();

      if (storeError) {
        console.log('   ❌ Error storing matches:', storeError.message);
      } else {
        console.log(`   ✅ Re-stored ${storedMatches.length} La Liga matches`);
      }
    }

    // 5. Verify the fix
    console.log('\n🔍 Verifying the fix...');
    const { data: fixedMatches, error: verifyError } = await supabase
      .from('matches')
      .select(`
        id,
        competition_name,
        home_team:teams!matches_home_team_id_fkey(name),
        away_team:teams!matches_away_team_id_fkey(name),
        home_score,
        away_score
      `)
      .eq('competition_id', '2014')
      .eq('status', 'finished')
      .limit(5);

    if (verifyError) {
      console.log('   ❌ Error verifying fix:', verifyError.message);
    } else {
      console.log('   📊 Sample fixed matches:');
      fixedMatches.forEach((match, index) => {
        const homeTeam = match.home_team?.name || 'N/A';
        const awayTeam = match.away_team?.name || 'N/A';
        const score = match.home_score !== null && match.away_score !== null 
          ? `${match.home_score}-${match.away_score}` 
          : 'TBD';
        console.log(`   ${index + 1}. ${homeTeam} vs ${awayTeam} - ${score}`);
      });
    }

    console.log('\n🎉 La Liga matches fix completed!');

  } catch (error) {
    console.error('❌ Error fixing La Liga matches:', error.message);
  }
}

// Run the script
fixLaLigaMatches().catch(console.error);




