require('dotenv').config({ path: './.env' });
const MatchDataService = require('../services/matchDataService');

async function addRemainingLeagues() {
  console.log('🏆 Adding remaining major European leagues to Hilites...\n');

  const matchDataService = new MatchDataService();

  // Define the leagues to add
  const leagues = [
    {
      id: 'SA',
      name: 'Serie A',
      apiId: '2019',
      type: 'league',
      country: 'Italy',
      flag: '🇮🇹'
    },
    {
      id: 'BL1',
      name: 'Bundesliga',
      apiId: '2002',
      type: 'league',
      country: 'Germany',
      flag: '🇩🇪'
    },
    {
      id: 'FL1',
      name: 'Ligue 1',
      apiId: '2015',
      type: 'league',
      country: 'France',
      flag: '🇫🇷'
    }
  ];

  try {
    // 1. Add competitions to database
    console.log('📋 Adding competitions to database...');
    const competitions = leagues.map(league => ({
      id: league.id,
      name: league.name,
      type: league.type,
      country: league.country,
      logo_url: `https://logos-world.net/wp-content/uploads/2020/06/${league.name.replace(/\s+/g, '-')}-Logo.png`,
      is_active: true
    }));

    const { data: compData, error: compError } = await matchDataService.supabase
      .from('competitions')
      .upsert(competitions, { onConflict: 'id' })
      .select();

    if (compError) {
      console.log('   ❌ Error adding competitions:', compError.message);
    } else {
      console.log(`   ✅ Added ${compData.length} competitions to database`);
    }

    // 2. Fetch matches for each league
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
    const dateFrom = thirtyDaysAgo.toISOString().split('T')[0];
    const dateTo = today.toISOString().split('T')[0];

    console.log(`\n⚽ Fetching matches from ${dateFrom} to ${dateTo}...`);

    let totalMatches = 0;
    let totalTeams = 0;

    for (const league of leagues) {
      console.log(`\n🏆 Processing ${league.flag} ${league.name}...`);
      
      try {
        const matches = await matchDataService.fetchMatches(
          league.apiId,
          dateFrom,
          dateTo
        );

        if (matches && matches.length > 0) {
          const { data: storedMatches, error: storeError } = await matchDataService.supabase
            .from('matches')
            .upsert(matches, { onConflict: 'external_id' })
            .select();

          if (storeError) {
            console.log(`   ❌ Error storing ${league.name} matches:`, storeError.message);
          } else {
            console.log(`   ✅ Stored ${storedMatches.length} ${league.name} matches`);
            totalMatches += storedMatches.length;
          }
        } else {
          console.log(`   ⚠️ No ${league.name} matches found for the date range`);
        }
      } catch (error) {
        console.log(`   ❌ Error fetching ${league.name} matches:`, error.message);
      }
    }

    // 3. Show summary of all competitions
    console.log('\n📊 Available competitions summary:');
    const { data: allCompetitions, error: summaryError } = await matchDataService.supabase
      .from('competitions')
      .select('id, name, type, country')
      .eq('is_active', true)
      .order('name');

    if (summaryError) {
      console.log('   ❌ Error fetching competitions summary:', summaryError.message);
    } else {
      allCompetitions.forEach(comp => {
        const flag = getCompetitionFlag(comp.name);
        console.log(`   ${flag} ${comp.name} (${comp.type}) - ${comp.country}`);
      });
    }

    // 4. Show match counts by competition
    console.log('\n📈 Match counts by competition:');
    for (const league of leagues) {
      try {
        const { data: matchCount, error: countError } = await matchDataService.supabase
          .from('matches')
          .select('id', { count: 'exact' })
          .eq('competition_id', league.apiId)
          .eq('status', 'finished');

        if (!countError && matchCount) {
          console.log(`   ${league.flag} ${league.name}: ${matchCount.length} finished matches`);
        }
      } catch (error) {
        console.log(`   ❌ Error counting ${league.name} matches:`, error.message);
      }
    }

    console.log('\n🎉 Remaining leagues integration completed!');
    console.log(`\n📊 Total matches added: ${totalMatches}`);
    console.log('\n📋 Next steps:');
    console.log('   1. Test video discovery for all leagues tomorrow');
    console.log('   2. Verify team names are displaying correctly');
    console.log('   3. Consider adding more competitions if needed');

  } catch (error) {
    console.error('❌ Error adding remaining leagues:', error.message);
  }
}

// Helper function to get competition flags
function getCompetitionFlag(competitionName) {
  const flags = {
    'Premier League': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    'La Liga': '🇪🇸',
    'Primera Division': '🇪🇸',
    'Serie A': '🇮🇹',
    'Bundesliga': '🇩🇪',
    'Ligue 1': '🇫🇷',
    'Champions League': '🏆',
    'UEFA Champions League': '🏆',
    'Europa League': '🏆',
    'Conference League': '🏆',
    'FA Cup': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    'Copa del Rey': '🇪🇸',
    'Coppa Italia': '🇮🇹',
    'DFB-Pokal': '🇩🇪',
    'Coupe de France': '🇫🇷',
    'EFL Cup': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    'Super Cup': '🏆'
  };
  return flags[competitionName] || '⚽️';
}

// Run the script
addRemainingLeagues().catch(console.error);
