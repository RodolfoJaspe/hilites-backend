const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

async function fixTeamLogosSmart() {
  console.log('🔧 Smart team logo fix starting...\n');

  // Step 1: Clear conflicting external_ids first by setting them to temporary values
  console.log('🔄 Step 1: Clearing conflicting external_ids...');
  
  const conflictingIds = ['77', '82', '90', '92', '95', '3', '4', '11', '721', '19', '2', '17', '18', '10', 
                          '109', '108', '100', '113', '525', '548', '522', '546', '529', '543', '351'];
  
  for (const id of conflictingIds) {
    const { data: existing } = await supabase
      .from('teams')
      .select('name, league')
      .eq('external_id', id)
      .maybeSingle();
    
    if (existing && (existing.league === 'Unknown' || existing.league === 'Europa League' || existing.league === 'Champions League')) {
      // Clear this ID from non-domestic league teams
      await supabase
        .from('teams')
        .update({ external_id: `temp_${id}_${Date.now()}` })
        .eq('external_id', id)
        .neq('league', 'Premier League')
        .neq('league', 'La Liga')
        .neq('league', 'Serie A')
        .neq('league', 'Bundesliga')
        .neq('league', 'Ligue 1');
      console.log(`  ✅ Cleared conflicting ID ${id}`);
    }
  }

  // Step 2: Now update with correct IDs
  console.log('\n🎨 Step 2: Updating teams with correct logos...');
  
  const updates = [
    // Premier League
    { name: 'Fulham', external_id: '63', logo_url: 'https://crests.football-data.org/63.png', league: 'Premier League' },
    { name: 'Nottingham Forest', external_id: '351', logo_url: 'https://crests.football-data.org/351.png', league: 'Premier League' },
    
    // La Liga - using correct IDs
    { name: 'Athletic Club', external_id: '77', logo_url: 'https://crests.football-data.org/77.png', league: 'La Liga' },
    { name: 'Getafe CF', external_id: '82', logo_url: 'https://crests.football-data.org/82.png', league: 'La Liga' },
    { name: 'Real Betis', external_id: '90', logo_url: 'https://crests.football-data.org/90.png', league: 'La Liga' },
    { name: 'Real Sociedad', external_id: '92', logo_url: 'https://crests.football-data.org/92.png', league: 'La Liga' },
    { name: 'Valencia CF', external_id: '95', logo_url: 'https://crests.football-data.org/95.png', league: 'La Liga' },
    
    // Bundesliga - using correct IDs 
    { name: 'TSG 1899 Hoffenheim', external_id: '2', logo_url: 'https://crests.football-data.org/2.png', league: 'Bundesliga' },
    { name: 'Bayer 04 Leverkusen', external_id: '3', logo_url: 'https://crests.football-data.org/3.png', league: 'Bundesliga' },
    { name: 'Borussia Dortmund', external_id: '4', logo_url: 'https://crests.football-data.org/4.png', league: 'Bundesliga' },
    { name: 'VfB Stuttgart', external_id: '10', logo_url: 'https://crests.football-data.org/10.png', league: 'Bundesliga' },
    { name: 'VfL Wolfsburg', external_id: '11', logo_url: 'https://crests.football-data.org/11.png', league: 'Bundesliga' },
    { name: 'SC Freiburg', external_id: '17', logo_url: 'https://crests.football-data.org/17.png', league: 'Bundesliga' },
    { name: 'Borussia Mönchengladbach', external_id: '18', logo_url: 'https://crests.football-data.org/18.png', league: 'Bundesliga' },
    { name: 'Eintracht Frankfurt', external_id: '19', logo_url: 'https://crests.football-data.org/19.png', league: 'Bundesliga' },
    { name: 'RB Leipzig', external_id: '721', logo_url: 'https://crests.football-data.org/721.png', league: 'Bundesliga' },
    
    // Serie A - using correct IDs
    { name: 'Fiorentina', external_id: '99', logo_url: 'https://crests.football-data.org/99.png', league: 'Serie A' },
    { name: 'AS Roma', external_id: '100', logo_url: 'https://crests.football-data.org/100.png', league: 'Serie A' },
    { name: 'Inter Milan', external_id: '108', logo_url: 'https://crests.football-data.org/108.png', league: 'Serie A' },
    { name: 'Juventus FC', external_id: '109', logo_url: 'https://crests.football-data.org/109.png', league: 'Serie A' },
    { name: 'SSC Napoli', external_id: '113', logo_url: 'https://crests.football-data.org/113.png', league: 'Serie A' },
    { name: 'Torino FC', external_id: '586', logo_url: 'https://crests.football-data.org/586.png', league: 'Serie A' },
    
    // Ligue 1 - using correct IDs
    { name: 'OGC Nice', external_id: '522', logo_url: 'https://crests.football-data.org/522.png', league: 'Ligue 1' },
    { name: 'Olympique de Marseille', external_id: '525', logo_url: 'https://crests.football-data.org/525.png', league: 'Ligue 1' },
    { name: 'Stade Rennais FC', external_id: '529', logo_url: 'https://crests.football-data.org/529.png', league: 'Ligue 1' },
    { name: 'FC Nantes', external_id: '543', logo_url: 'https://crests.football-data.org/543.png', league: 'Ligue 1' },
    { name: 'RC Lens', external_id: '546', logo_url: 'https://crests.football-data.org/546.png', league: 'Ligue 1' },
    { name: 'AS Monaco FC', external_id: '548', logo_url: 'https://crests.football-data.org/548.png', league: 'Ligue 1' },
  ];

  let fixedCount = 0;
  for (const update of updates) {
    const { error } = await supabase
      .from('teams')
      .update({ 
        external_id: update.external_id,
        logo_url: update.logo_url 
      })
      .eq('name', update.name)
      .eq('league', update.league);

    if (error) {
      console.error(`  ❌ ${update.name}: ${error.message}`);
    } else {
      console.log(`  ✅ ${update.name}`);
      fixedCount++;
    }
  }

  console.log(`\n✅ Fixed ${fixedCount}/${updates.length} teams!`);
}

fixTeamLogosSmart()
  .then(() => {
    console.log('\n🎉 All done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

