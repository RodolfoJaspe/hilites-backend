const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Use service role key for updating
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

// Map external IDs to their leagues
const TEAM_LEAGUE_MAPPING = {
  // Premier League
  '57': 'Premier League', '61': 'Premier League', '65': 'Premier League', 
  '66': 'Premier League', '64': 'Premier League', '73': 'Premier League',
  '67': 'Premier League', '354': 'Premier League', '563': 'Premier League',
  '397': 'Premier League', '1044': 'Premier League', '402': 'Premier League',
  '328': 'Premier League', '389': 'Premier League', '351': 'Premier League',
  '76': 'Premier League', '346': 'Premier League', '340': 'Premier League',
  '715': 'Premier League', '68': 'Premier League',
  
  // La Liga
  '81': 'La Liga', '86': 'La Liga', '78': 'La Liga', 
  '559': 'La Liga', '94': 'La Liga', '79': 'La Liga',
  '532': 'La Liga', '95': 'La Liga', '263': 'La Liga',
  '727': 'La Liga', '298': 'La Liga', '264': 'La Liga',
  '250': 'La Liga', '558': 'La Liga', '745': 'La Liga',
  '278': 'La Liga', '267': 'La Liga', '728': 'La Liga',
  '285': 'La Liga', '462': 'La Liga',
  
  // Serie A
  '108': 'Serie A', '98': 'Serie A', '109': 'Serie A',
  '113': 'Serie A', '99': 'Serie A', '102': 'Serie A',
  '103': 'Serie A', '110': 'Serie A', '584': 'Serie A',
  '112': 'Serie A', '450': 'Serie A', '471': 'Serie A',
  '115': 'Serie A', '488': 'Serie A', '107': 'Serie A',
  '104': 'Serie A', '470': 'Serie A', '445': 'Serie A',
  '454': 'Serie A', '511': 'Serie A',
  
  // Bundesliga
  '5': 'Bundesliga', '11': 'Bundesliga', '15': 'Bundesliga',
  '4': 'Bundesliga', '16': 'Bundesliga', '3': 'Bundesliga',
  '1': 'Bundesliga', '17': 'Bundesliga', '18': 'Bundesliga',
  '19': 'Bundesliga', '38': 'Bundesliga', '6': 'Bundesliga',
  '12': 'Bundesliga', '2': 'Bundesliga', '721': 'Bundesliga',
  '720': 'Bundesliga', '13': 'Bundesliga', '36': 'Bundesliga',
  
  // Ligue 1
  '524': 'Ligue 1', '529': 'Ligue 1', '523': 'Ligue 1',
  '516': 'Ligue 1', '548': 'Ligue 1', '521': 'Ligue 1',
  '522': 'Ligue 1', '518': 'Ligue 1', '527': 'Ligue 1',
  '526': 'Ligue 1', '511': 'Ligue 1', '541': 'Ligue 1',
  '525': 'Ligue 1', '528': 'Ligue 1', '547': 'Ligue 1',
  '543': 'Ligue 1', '514': 'Ligue 1', '530': 'Ligue 1'
};

async function updateTeamLeagues() {
  console.log('🔄 Starting team league updates...\n');

  let successCount = 0;
  let errorCount = 0;
  const updates = {
    'Premier League': 0,
    'La Liga': 0,
    'Serie A': 0,
    'Bundesliga': 0,
    'Ligue 1': 0
  };

  for (const [externalId, league] of Object.entries(TEAM_LEAGUE_MAPPING)) {
    try {
      const { error } = await supabase
        .from('teams')
        .update({ league })
        .eq('external_id', externalId);

      if (error) {
        console.error(`❌ Error updating team ${externalId}:`, error.message);
        errorCount++;
      } else {
        updates[league]++;
        successCount++;
      }
    } catch (error) {
      console.error(`❌ Error updating team ${externalId}:`, error.message);
      errorCount++;
    }
  }

  console.log('\n✅ Update complete!');
  console.log(`📊 Updated ${successCount} teams:`);
  Object.entries(updates).forEach(([league, count]) => {
    if (count > 0) {
      console.log(`   ${league}: ${count} teams`);
    }
  });
  
  if (errorCount > 0) {
    console.log(`\n⚠️  ${errorCount} errors occurred`);
  }
}

// Run the update
updateTeamLeagues()
  .then(() => {
    console.log('\n🎉 All done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });


