require('dotenv').config({ path: './.env' });
const { createClient } = require('@supabase/supabase-js');

async function deleteBrokenMatches() {
  console.log('🗑️  Deleting matches with missing team data...\n');

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const leagues = [
    { id: '2019', name: 'Serie A', flag: '🇮🇹' },
    { id: '2002', name: 'Bundesliga', flag: '🇩🇪' },
    { id: '2015', name: 'Ligue 1', flag: '🇫🇷' }
  ];

  try {
    let totalDeleted = 0;

    for (const league of leagues) {
      console.log(`${league.flag} Processing ${league.name}...`);

      // Fetch all matches for this league
      const { data: allMatches, error: fetchError } = await supabase
        .from('matches')
        .select('id, external_id, home_team_id, away_team_id, competition_id')
        .eq('competition_id', league.id);

      if (fetchError) {
        console.log(`   ❌ Error fetching matches:`, fetchError.message);
        continue;
      }

      // Filter for broken matches (null team IDs)
      const brokenMatches = allMatches.filter(
        m => !m.home_team_id || !m.away_team_id
      );

      console.log(`   📊 Found ${brokenMatches.length} broken matches out of ${allMatches.length} total`);

      if (brokenMatches.length > 0) {
        // Delete broken matches
        const brokenIds = brokenMatches.map(m => m.id);
        
        const { error: deleteError } = await supabase
          .from('matches')
          .delete()
          .in('id', brokenIds);

        if (deleteError) {
          console.log(`   ❌ Error deleting matches:`, deleteError.message);
        } else {
          console.log(`   ✅ Deleted ${brokenMatches.length} broken matches`);
          totalDeleted += brokenMatches.length;
        }
      }
    }

    console.log(`\n🎉 Cleanup completed! Total matches deleted: ${totalDeleted}\n`);

    // Verification
    console.log('📊 Verification:');
    for (const league of leagues) {
      const { data: allMatches, error } = await supabase
        .from('matches')
        .select('id, home_team_id, away_team_id')
        .eq('competition_id', league.id);

      if (!error) {
        const broken = allMatches.filter(m => !m.home_team_id || !m.away_team_id);
        console.log(`   ${league.flag} ${league.name}: ${allMatches.length} matches (${broken.length} broken)`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

deleteBrokenMatches().catch(console.error);

