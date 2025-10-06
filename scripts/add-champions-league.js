require('dotenv').config({ path: './.env' });
const MatchDataService = require('../services/matchDataService');

async function addChampionsLeague() {
  console.log('🏆 Adding UEFA Champions League to Hilites...\n');

  const matchDataService = new MatchDataService();

  try {
    // 1. Add Champions League to competitions table
    console.log('📋 Adding Champions League to competitions table...');
    const championsLeague = {
      id: 'CL',
      name: 'UEFA Champions League',
      type: 'cup',
      country: 'Europe',
      logo_url: 'https://logos-world.net/wp-content/uploads/2020/06/UEFA-Champions-League-Logo.png',
      is_active: true
    };

    const { data: compData, error: compError } = await matchDataService.supabase
      .from('competitions')
      .upsert([championsLeague], { onConflict: 'id' })
      .select();

    if (compError) {
      console.log('   ❌ Error adding Champions League:', compError.message);
    } else {
      console.log('   ✅ Champions League added to competitions table');
    }

    // 2. Fetch recent Champions League matches
    console.log('\n⚽ Fetching recent Champions League matches...');
    
    // Get matches from the last 30 days
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
    const dateFrom = thirtyDaysAgo.toISOString().split('T')[0];
    const dateTo = today.toISOString().split('T')[0];

    console.log(`   📅 Fetching matches from ${dateFrom} to ${dateTo}`);
    
    const matches = await matchDataService.fetchMatches(
      '2001', // Champions League ID
      dateFrom, 
      dateTo
    );

    // Store the matches in the database
    if (matches && matches.length > 0) {
      const { data: storedMatches, error: storeError } = await matchDataService.supabase
        .from('matches')
        .upsert(matches, { onConflict: 'external_id' })
        .select();

      if (storeError) {
        console.log('   ❌ Error storing matches:', storeError.message);
      } else {
        console.log(`   ✅ Stored ${storedMatches.length} Champions League matches`);
      }
    } else {
      console.log('   ⚠️ No Champions League matches found for the date range');
    }

    // 3. Show some sample matches
    console.log('\n🔍 Sample Champions League matches:');
    const { data: sampleMatches, error: sampleError } = await matchDataService.supabase
      .from('matches')
      .select(`
        id,
        competition_name,
        match_date,
        status,
        home_score,
        away_score,
        home_team:teams!matches_home_team_id_fkey(name),
        away_team:teams!matches_away_team_id_fkey(name)
      `)
      .eq('competition_id', 'CL')
      .order('match_date', { ascending: false })
      .limit(5);

    if (sampleError) {
      console.log('   ❌ Error fetching sample matches:', sampleError.message);
    } else {
      sampleMatches.forEach((match, index) => {
        const date = new Date(match.match_date).toLocaleDateString();
        const score = match.home_score !== null && match.away_score !== null 
          ? `${match.home_score}-${match.away_score}` 
          : 'TBD';
        console.log(`   ${index + 1}. ${match.home_team.name} vs ${match.away_team.name} (${date}) - ${score}`);
      });
    }

    // 4. Check total competitions now available
    console.log('\n📊 Available competitions:');
    const { data: competitions, error: compsError } = await matchDataService.supabase
      .from('competitions')
      .select('id, name, type, country')
      .eq('is_active', true)
      .order('name');

    if (compsError) {
      console.log('   ❌ Error fetching competitions:', compsError.message);
    } else {
      competitions.forEach(comp => {
        console.log(`   🏆 ${comp.name} (${comp.type}) - ${comp.country}`);
      });
    }

    console.log('\n🎉 Champions League integration completed!');
    console.log('\n📋 Next steps:');
    console.log('   1. Update frontend to show competition filter');
    console.log('   2. Add competition selection to the UI');
    console.log('   3. Test Champions League match highlights');

  } catch (error) {
    console.error('❌ Error adding Champions League:', error.message);
  }
}

// Run the script
addChampionsLeague().catch(console.error);
