const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function finalComprehensiveFix() {
  console.log('🔧 Final Comprehensive Team Fix\n');
  
  // Step 1: Delete wrong duplicates
  console.log('Step 1: Deleting wrong duplicates...');
  const toDelete = [
    { name: 'Nottingham Forest', external_id: '715' },
    { name: 'RB Leipzig', external_id: '15' },
    { name: 'TSG 1899 Hoffenheim', external_id: '3' }
  ];
  
  for (const team of toDelete) {
    const { error } = await supabase
      .from('teams')
      .delete()
      .eq('name', team.name)
      .eq('external_id', team.external_id);
    if (error) console.error(`  ❌ ${team.name}:`, error.message);
    else console.log(`  ✅ Deleted ${team.name} (${team.external_id})`);
  }
  
  // Step 2: Fix temp IDs and incorrect IDs
  console.log('\nStep 2: Fixing incorrect IDs...');
  const fixes = [
    { name: 'Borussia Dortmund', external_id: '4', logo_url: 'https://crests.football-data.org/4.png', league: 'Bundesliga' },
    { name: 'Inter Milan', external_id: '108', logo_url: 'https://crests.football-data.org/108.png', league: 'Serie A' },
    { name: 'Bayer 04 Leverkusen', external_id: '3', logo_url: 'https://crests.football-data.org/3.png', league: 'Bundesliga' },
  ];
  
  for (const fix of fixes) {
    const { error } = await supabase
      .from('teams')
      .update({ external_id: fix.external_id, logo_url: fix.logo_url })
      .eq('name', fix.name)
      .eq('league', fix.league);
    if (error) console.error(`  ❌ ${fix.name}:`, error.message);
    else console.log(`  ✅ Fixed ${fix.name}`);
  }
  
  // Step 3: Upsert missing teams
  console.log('\nStep 3: Upserting missing teams...');
  const missingTeams = [
    { external_id: '77', name: 'Athletic Club', short_name: 'Athletic', code: 'ATH', country: 'Spain', country_code: 'ES', league: 'La Liga', logo_url: 'https://crests.football-data.org/77.png', is_active: true },
    { external_id: '90', name: 'Real Betis', short_name: 'Betis', code: 'BET', country: 'Spain', country_code: 'ES', league: 'La Liga', logo_url: 'https://crests.football-data.org/90.png', is_active: true },
    { external_id: '82', name: 'Getafe CF', short_name: 'Getafe', code: 'GET', country: 'Spain', country_code: 'ES', league: 'La Liga', logo_url: 'https://crests.football-data.org/82.png', is_active: true },
  ];
  
  for (const team of missingTeams) {
    const { error } = await supabase
      .from('teams')
      .upsert(team, { onConflict: 'external_id' });
    if (error) console.error(`  ❌ ${team.name}:`, error.message);
    else console.log(`  ✅ Upserted ${team.name}`);
  }
  
  // Step 4: Verify all fixes
  console.log('\nStep 4: Verifying fixes...');
  const verify = ['Nottingham Forest', 'RB Leipzig', 'TSG 1899 Hoffenheim', 'Borussia Dortmund', 'Inter Milan', 'Bayer 04 Leverkusen', 'Athletic Club', 'Real Betis', 'Getafe CF'];
  
  for (const name of verify) {
    const { data, count } = await supabase
      .from('teams')
      .select('external_id, league', { count: 'exact' })
      .eq('name', name)
      .in('league', ['Premier League', 'La Liga', 'Serie A', 'Bundesliga', 'Ligue 1']);
    
    if (count === 0) console.log(`  ❌ ${name}: NOT FOUND`);
    else if (count > 1) console.log(`  ⚠️ ${name}: ${count} duplicates`);
    else console.log(`  ✅ ${name}: ID=${data[0].external_id}, League=${data[0].league}`);
  }
  
  console.log('\n🎉 Fix complete!');
}

finalComprehensiveFix()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });


