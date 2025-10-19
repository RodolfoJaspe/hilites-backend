require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

async function diagnoseMatchTeams() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const matchIds = ['542472', '542473', '542476'];

  for (const matchId of matchIds) {
    console.log(`\n🔍 Checking match ${matchId}...\n`);

    // Get match from API
    const apiResponse = await axios.get(`https://api.football-data.org/v4/matches/${matchId}`, {
      headers: {'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY}
    });

    const apiMatch = apiResponse.data;
    console.log(`API says:`);
    console.log(`  ${apiMatch.homeTeam.name} (ID: ${apiMatch.homeTeam.id}) vs ${apiMatch.awayTeam.name} (ID: ${apiMatch.awayTeam.id})`);

    // Get match from database
    const { data: dbMatch } = await supabase
      .from('matches')
      .select(`
        *,
        home_team:teams!matches_home_team_id_fkey(id, name, external_id),
        away_team:teams!matches_away_team_id_fkey(id, name, external_id)
      `)
      .eq('external_id', matchId)
      .single();

    if (dbMatch) {
      console.log(`\nDatabase has:`);
      console.log(`  ${dbMatch.home_team.name} (external_id: ${dbMatch.home_team.external_id}) vs ${dbMatch.away_team.name} (external_id: ${dbMatch.away_team.external_id})`);

      // Check if teams match
      if (dbMatch.home_team.external_id !== apiMatch.homeTeam.id.toString()) {
        console.log(`\n❌ HOME TEAM MISMATCH:`);
        console.log(`   DB team "${dbMatch.home_team.name}" has external_id ${dbMatch.home_team.external_id}`);
        console.log(`   Should be "${apiMatch.homeTeam.name}" with external_id ${apiMatch.homeTeam.id}`);
      }

      if (dbMatch.away_team.external_id !== apiMatch.awayTeam.id.toString()) {
        console.log(`\n❌ AWAY TEAM MISMATCH:`);
        console.log(`   DB team "${dbMatch.away_team.name}" has external_id ${dbMatch.away_team.external_id}`);
        console.log(`   Should be "${apiMatch.awayTeam.name}" with external_id ${apiMatch.awayTeam.id}`);
      }
    }
  }

  process.exit(0);
}

diagnoseMatchTeams();

