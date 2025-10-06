require('dotenv').config({ path: './.env' });
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

async function addEuropaLeague() {
  console.log('🏆 Adding UEFA Europa League to the database...\n');

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const apiFootballKey = process.env.API_FOOTBALL_KEY;
  const apiFootballUrl = 'https://v3.football.api-sports.io';

  try {
    // 1. Add Europa League to competitions table
    console.log('📋 Adding Europa League to competitions table...');
    const { data: compData, error: compError } = await supabase
      .from('competitions')
      .upsert({
        id: 'EL',
        name: 'Europa League',
        country: 'World',
        type: 'cup',
        logo_url: null,
        is_active: true
      })
      .select();

    if (compError) {
      console.log('   ❌ Error adding competition:', compError.message);
    } else {
      console.log('   ✅ Added Europa League competition');
    }

    // 2. Fetch Europa League matches from API-Football
    console.log('\n⚽ Fetching Europa League matches from API-Football...');
    const response = await axios.get(`${apiFootballUrl}/fixtures`, {
      headers: {
        'X-RapidAPI-Key': apiFootballKey,
        'X-RapidAPI-Host': 'v3.football.api-sports.io'
      },
      params: {
        league: 3, // Europa League ID
        season: 2024
        // Remove status filter to get all matches (finished and scheduled)
      },
      timeout: 10000
    });

    const matches = response.data.response || [];
    console.log(`   📊 Found ${matches.length} Europa League matches`);

    if (matches.length === 0) {
      console.log('   ⚠️ No matches found. This might be because:');
      console.log('   - The season hasn\'t started yet');
      console.log('   - All matches are still scheduled (not finished)');
      console.log('   - API quota limits');
      return;
    }

    // 3. Process and store matches
    console.log('\n💾 Processing and storing matches...');
    let storedCount = 0;
    let teamCount = 0;

    for (const match of matches) {
      try {
        // Get or create teams
        const homeTeam = await getOrCreateTeam(supabase, match.teams.home, 'api-football');
        const awayTeam = await getOrCreateTeam(supabase, match.teams.away, 'api-football');

        if (homeTeam) teamCount++;
        if (awayTeam) teamCount++;

        // Determine match status
        let matchStatus = 'scheduled';
        if (match.fixture.status.short === 'FT') {
          matchStatus = 'finished';
        } else if (match.fixture.status.short === 'LIVE') {
          matchStatus = 'live';
        }

        // Prepare match data
        const matchData = {
          id: `el_${match.fixture.id}`,
          competition_id: 'EL',
          competition_name: 'Europa League',
          home_team_id: homeTeam?.id,
          away_team_id: awayTeam?.id,
          match_date: new Date(match.fixture.date).toISOString(),
          status: matchStatus,
          home_score: match.goals.home,
          away_score: match.goals.away,
          external_id: match.fixture.id.toString(),
          external_source: 'api-football',
          venue: match.fixture.venue?.name || null,
          referee: match.fixture.referee || null
        };

        // Store match
        const { error: matchError } = await supabase
          .from('matches')
          .upsert(matchData);

        if (matchError) {
          console.log(`   ❌ Error storing match ${match.fixture.id}:`, matchError.message);
        } else {
          storedCount++;
        }

        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.log(`   ❌ Error processing match ${match.fixture.id}:`, error.message);
      }
    }

    console.log(`\n🎉 Europa League setup completed!`);
    console.log(`   📊 Matches stored: ${storedCount}`);
    console.log(`   👥 Teams processed: ${teamCount}`);
    console.log(`   🏆 Competition: Europa League (ID: EL)`);

  } catch (error) {
    console.error('❌ Error adding Europa League:', error.message);
  }
}

async function getOrCreateTeam(supabase, teamData, source) {
  if (!teamData || !teamData.id) return null;

  try {
    // Check if team already exists
    const { data: existingTeam } = await supabase
      .from('teams')
      .select('*')
      .eq('external_id', teamData.id.toString())
      .eq('external_source', source)
      .single();

    if (existingTeam) {
      return existingTeam;
    }

    // Create new team
    const teamRecord = {
      name: teamData.name,
      short_name: teamData.name,
      country: 'Unknown', // API-Football doesn't always provide country for Europa League teams
      logo_url: teamData.logo || null,
      external_id: teamData.id.toString(),
      external_source: source,
      is_active: true
    };

    const { data: newTeam, error } = await supabase
      .from('teams')
      .insert(teamRecord)
      .select()
      .single();

    if (error) {
      console.log(`   ⚠️ Error creating team ${teamData.name}:`, error.message);
      return null;
    }

    return newTeam;

  } catch (error) {
    console.log(`   ⚠️ Error processing team ${teamData.name}:`, error.message);
    return null;
  }
}

// Run the script
addEuropaLeague().catch(console.error);
