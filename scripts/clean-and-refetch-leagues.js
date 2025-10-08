require('dotenv').config({ path: './.env' });
const MatchDataService = require('../services/matchDataService');

async function cleanAndRefetchLeagues() {
  console.log('🧹 Cleaning broken matches and re-fetching for Serie A, Bundesliga, and Ligue 1...\n');

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
    let totalDeleted = 0;

    // 1. Delete broken matches for each league
    console.log('🗑️  Step 1: Removing broken matches...\n');
    for (const league of leagues) {
      const { data: deletedMatches, error: deleteError } = await matchDataService.supabase
        .from('matches')
        .delete()
        .eq('competition_id', league.apiId)
        .or('home_team_id.is.null,away_team_id.is.null')
        .select('id');

      if (deleteError) {
        console.log(`   ${league.flag} ❌ Error deleting broken ${league.name} matches:`, deleteError.message);
      } else {
        const count = deletedMatches?.length || 0;
        console.log(`   ${league.flag} ✅ Deleted ${count} broken ${league.name} matches`);
        totalDeleted += count;
      }
    }

    console.log(`\n   📊 Total broken matches deleted: ${totalDeleted}\n`);

    // 2. Fetch fresh matches for the last 14 days
    console.log('📥 Step 2: Fetching fresh match data...\n');
    
    const today = new Date();
    const fourteenDaysAgo = new Date(today.getTime() - (14 * 24 * 60 * 60 * 1000));
    const dateFrom = fourteenDaysAgo.toISOString().split('T')[0];
    const dateTo = today.toISOString().split('T')[0];

    console.log(`   📅 Date range: ${dateFrom} to ${dateTo}\n`);

    let totalMatches = 0;

    for (const league of leagues) {
      console.log(`   ${league.flag} Fetching ${league.name}...`);
      
      try {
        const matches = await matchDataService.fetchMatches(
          league.apiId,
          dateFrom,
          dateTo
        );

        if (matches && matches.length > 0) {
          // Filter out matches with null team IDs before storing
          const validMatches = matches.filter(m => m.home_team_id && m.away_team_id);
          const invalidCount = matches.length - validMatches.length;
          
          if (invalidCount > 0) {
            console.log(`      ⚠️ Skipping ${invalidCount} matches with missing team data`);
          }

          if (validMatches.length > 0) {
            const { data: storedMatches, error: storeError } = await matchDataService.supabase
              .from('matches')
              .upsert(validMatches, { onConflict: 'external_id' })
              .select();

            if (storeError) {
              console.log(`      ❌ Error storing ${league.name} matches:`, storeError.message);
            } else {
              console.log(`      ✅ Stored ${storedMatches.length} valid matches`);
              totalMatches += storedMatches.length;
            }
          } else {
            console.log(`      ⚠️ No valid matches to store`);
          }
        } else {
          console.log(`      ⚠️ No matches found for the date range`);
        }

        // Add delay to avoid rate limiting
        console.log(`      ⏳ Waiting to avoid rate limits...`);
        await new Promise(resolve => setTimeout(resolve, 7000)); // Wait 7 seconds between leagues

      } catch (error) {
        console.log(`      ❌ Error fetching ${league.name} matches:`, error.message);
      }
    }

    // 3. Verification
    console.log('\n📊 Step 3: Verification Summary:\n');
    for (const league of leagues) {
      const { data: brokenMatches, error: brokenError } = await matchDataService.supabase
        .from('matches')
        .select('id', { count: 'exact' })
        .eq('competition_id', league.apiId)
        .or('home_team_id.is.null,away_team_id.is.null');

      const { data: totalMatches, error: totalError } = await matchDataService.supabase
        .from('matches')
        .select('id', { count: 'exact' })
        .eq('competition_id', league.apiId);

      if (!brokenError && !totalError) {
        console.log(`   ${league.flag} ${league.name}:`);
        console.log(`      - Total matches: ${totalMatches.length}`);
        console.log(`      - Broken matches: ${brokenMatches.length}`);
        console.log(`      - Valid matches: ${totalMatches.length - brokenMatches.length}`);
      }
    }

    console.log(`\n🎉 Process completed!`);
    console.log(`   - Matches deleted: ${totalDeleted}`);
    console.log(`   - New matches added: ${totalMatches}`);

  } catch (error) {
    console.error('❌ Error in cleanup process:', error.message);
  }
}

// Run the script
cleanAndRefetchLeagues().catch(console.error);

