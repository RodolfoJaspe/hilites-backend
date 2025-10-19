require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function checkDuplicateTeams() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // Get all teams with Lens or Lorient in the name
    const { data: teams, error } = await supabase
      .from('teams')
      .select('*')
      .or('name.ilike.%lens%,name.ilike.%lorient%')
      .order('name');

    if (error) throw error;

    console.log('\n🔍 Teams with "Lens" or "Lorient" in name:\n');
    teams.forEach(team => {
      console.log(`📌 ${team.name}`);
      console.log(`   ID: ${team.id}`);
      console.log(`   External ID: ${team.external_id}`);
      console.log(`   Short Name: ${team.short_name}`);
      console.log(`   Country: ${team.country}`);
      console.log(`   League: ${team.league}`);
      console.log('');
    });

    // Check today's Ligue 1 matches
    const today = new Date().toISOString().split('T')[0];
    
    const { data: matches, error: matchError } = await supabase
      .from('matches')
      .select(`
        *,
        home_team:teams!matches_home_team_id_fkey(name, external_id),
        away_team:teams!matches_away_team_id_fkey(name, external_id)
      `)
      .eq('competition_name', 'Ligue 1')
      .gte('match_date', `${today}T00:00:00`)
      .lte('match_date', `${today}T23:59:59`)
      .order('match_date');

    if (matchError) throw matchError;

    console.log(`\n⚽ Today's Ligue 1 matches (${today}):\n`);
    matches.forEach(match => {
      console.log(`${match.home_team.name} vs ${match.away_team.name}`);
      console.log(`   Time: ${match.match_date}`);
      console.log(`   Status: ${match.status}`);
      console.log(`   Home Team External ID: ${match.home_team.external_id}`);
      console.log(`   Away Team External ID: ${match.away_team.external_id}`);
      console.log('');
    });

  } catch (error) {
    console.error('Error:', error.message);
  }

  process.exit(0);
}

checkDuplicateTeams();

