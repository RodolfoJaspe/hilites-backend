require('dotenv').config({ path: './.env' });
const { createClient } = require('@supabase/supabase-js');

async function findBrokenJuventusMatch() {
  console.log('🔍 Finding broken Juventus match...\n');

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // Find matches where away team is Juventus
    const { data: matches, error } = await supabase
      .from('matches')
      .select(`
        id,
        external_id,
        home_team_id,
        away_team_id,
        competition_name,
        match_date,
        home_team:teams!matches_home_team_id_fkey(id, name, external_id),
        away_team:teams!matches_away_team_id_fkey(id, name, external_id)
      `)
      .ilike('competition_name', '%Champions%')
      .gte('match_date', '2025-09-25')
      .lte('match_date', '2025-10-05');

    if (error) {
      console.log('❌ Error:', error.message);
      return;
    }

    console.log(`📊 Found ${matches.length} Champions League matches\n`);

    // Find matches with Juventus
    const juventusMatches = matches.filter(m => 
      m.away_team?.name?.includes('Juventus') || m.home_team?.name?.includes('Juventus')
    );

    console.log('⚽ Juventus matches:');
    juventusMatches.forEach(m => {
      console.log(`   ${m.home_team?.name || 'NULL'} vs ${m.away_team?.name || 'NULL'}`);
      console.log(`   Match ID: ${m.id}`);
      console.log(`   External ID: ${m.external_id}`);
      console.log(`   Home Team ID: ${m.home_team_id}`);
      console.log(`   Away Team ID: ${m.away_team_id}`);
      console.log(`   Date: ${m.match_date}`);
      console.log('');
    });

    // Find matches with null home_team
    const brokenMatches = matches.filter(m => !m.home_team_id || !m.away_team_id);
    
    if (brokenMatches.length > 0) {
      console.log(`\n🔴 Found ${brokenMatches.length} broken matches:\n`);
      brokenMatches.forEach(m => {
        console.log(`   ${m.home_team?.name || 'NULL'} vs ${m.away_team?.name || 'NULL'}`);
        console.log(`   Match ID: ${m.id}`);
        console.log(`   External ID: ${m.external_id}`);
        console.log(`   Home Team ID: ${m.home_team_id}`);
        console.log(`   Away Team ID: ${m.away_team_id}`);
        console.log('');
      });
    } else {
      console.log('\n✅ No broken matches found!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

findBrokenJuventusMatch().catch(console.error);

