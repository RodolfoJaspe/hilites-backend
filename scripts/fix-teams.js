require('dotenv').config({ path: './.env' });
const { createClient } = require('@supabase/supabase-js');

async function fixTeams() {
  console.log('🔧 Fixing teams database...\n');

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Step 1: Add missing Bournemouth team
  console.log('1️⃣ Adding missing Bournemouth team...');
  try {
    const { data: existingBournemouth, error: findError } = await supabase
      .from('teams')
      .select('id')
      .eq('name', 'Bournemouth')
      .single();

    if (existingBournemouth) {
      console.log('   ✅ Bournemouth already exists');
    } else {
      const { data: newTeam, error: createError } = await supabase
        .from('teams')
        .insert([{
          name: 'Bournemouth',
          short_name: 'BOU',
          country: 'England',
          league: 'Premier League',
          logo_url: null,
          website_url: null,
          founded_year: null,
          external_id: 'BOURNEMOUTH_001' // Add required external_id
        }])
        .select('id')
        .single();

      if (createError) {
        console.log('   ❌ Error creating Bournemouth:', createError.message);
      } else {
        console.log('   ✅ Successfully created Bournemouth team');
      }
    }
  } catch (error) {
    console.log('   ❌ Error checking/creating Bournemouth:', error.message);
  }

  // Step 2: Find and clean up duplicate teams
  console.log('\n2️⃣ Finding duplicate teams...');
  try {
    const { data: teams, error } = await supabase
      .from('teams')
      .select('id, name, short_name, league, country')
      .order('name');

    if (error) throw error;

    // Group teams by normalized name (more precise matching)
    const teamGroups = {};
    teams.forEach(team => {
      // More precise normalization - don't remove "United" or "City" as they're part of team names
      const normalizedName = team.name.toLowerCase()
        .replace(/\s+(fc|afc)$/i, '') // Only remove FC/AFC suffixes
        .trim();
      if (!teamGroups[normalizedName]) {
        teamGroups[normalizedName] = [];
      }
      teamGroups[normalizedName].push(team);
    });

    // Find duplicates
    const duplicates = [];
    Object.entries(teamGroups).forEach(([normalizedName, teamList]) => {
      if (teamList.length > 1) {
        duplicates.push({
          normalizedName,
          teams: teamList
        });
      }
    });

    console.log(`   📊 Found ${duplicates.length} groups of duplicate teams:`);
    duplicates.forEach(dup => {
      console.log(`   🔄 "${dup.normalizedName}": ${dup.teams.map(t => t.name).join(', ')}`);
    });

    // Step 3: Clean up duplicates (keep the one with most complete data)
    console.log('\n3️⃣ Cleaning up duplicates...');
    let deletedCount = 0;
    
    for (const dup of duplicates) {
      // Sort by data completeness (more fields filled = better)
      const sortedTeams = dup.teams.sort((a, b) => {
        const aScore = [a.logo_url, a.website_url, a.founded_year, a.stadium].filter(Boolean).length;
        const bScore = [b.logo_url, b.website_url, b.founded_year, b.stadium].filter(Boolean).length;
        return bScore - aScore; // Keep the one with more data
      });

      const keepTeam = sortedTeams[0];
      const deleteTeams = sortedTeams.slice(1);

      console.log(`   🎯 Keeping: "${keepTeam.name}" (ID: ${keepTeam.id})`);
      
      for (const deleteTeam of deleteTeams) {
        console.log(`   🗑️ Deleting: "${deleteTeam.name}" (ID: ${deleteTeam.id})`);
        
        // First, update any matches that reference the team to be deleted
        const { error: updateError } = await supabase
          .from('matches')
          .update({ 
            home_team_id: keepTeam.id 
          })
          .eq('home_team_id', deleteTeam.id);

        if (updateError) {
          console.log(`     ⚠️ Error updating home matches: ${updateError.message}`);
        }

        const { error: updateError2 } = await supabase
          .from('matches')
          .update({ 
            away_team_id: keepTeam.id 
          })
          .eq('away_team_id', deleteTeam.id);

        if (updateError2) {
          console.log(`     ⚠️ Error updating away matches: ${updateError2.message}`);
        }

        // Then delete the duplicate team
        const { error: deleteError } = await supabase
          .from('teams')
          .delete()
          .eq('id', deleteTeam.id);

        if (deleteError) {
          console.log(`     ❌ Error deleting team: ${deleteError.message}`);
        } else {
          deletedCount++;
        }
      }
    }

    console.log(`   ✅ Deleted ${deletedCount} duplicate teams`);

  } catch (error) {
    console.log('   ❌ Error processing duplicates:', error.message);
  }

  // Step 4: Fix league information for teams with "Unknown" league
  console.log('\n4️⃣ Fixing league information...');
  try {
    const { error: updateError } = await supabase
      .from('teams')
      .update({ league: 'Premier League' })
      .in('name', ['Leeds United FC', 'Sunderland AFC']);

    if (updateError) {
      console.log('   ❌ Error updating league info:', updateError.message);
    } else {
      console.log('   ✅ Updated league information for Leeds United FC and Sunderland AFC');
    }
  } catch (error) {
    console.log('   ❌ Error fixing league info:', error.message);
  }

  // Step 5: Verify final state
  console.log('\n5️⃣ Verifying final team list...');
  try {
    const { data: finalTeams, error } = await supabase
      .from('teams')
      .select('id, name, league, country')
      .order('name');

    if (error) throw error;

    console.log(`   📊 Total teams: ${finalTeams.length}`);
    console.log('   📋 Premier League teams:');
    
    const plTeams = finalTeams.filter(team => team.league === 'Premier League');
    plTeams.forEach((team, index) => {
      console.log(`      ${index + 1}. ${team.name}`);
    });

    const nonPlTeams = finalTeams.filter(team => team.league !== 'Premier League');
    if (nonPlTeams.length > 0) {
      console.log('   ⚠️ Non-Premier League teams:');
      nonPlTeams.forEach(team => {
        console.log(`      - ${team.name} (${team.league})`);
      });
    }

    // Check for Bournemouth
    const bournemouth = finalTeams.find(team => team.name === 'Bournemouth');
    if (bournemouth) {
      console.log('   ✅ Bournemouth is now in the database');
    } else {
      console.log('   ❌ Bournemouth is still missing');
    }

  } catch (error) {
    console.log('   ❌ Error verifying teams:', error.message);
  }

  console.log('\n🎉 Team database fix completed!');
}

// Run the fix
fixTeams().catch(console.error);
