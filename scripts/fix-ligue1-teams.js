require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function fixLigue1Teams() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    console.log('🔧 Fixing incorrect Ligue 1 team mappings...\n');

    // Fix External ID 543: Should be FC Nantes, not FC Lorient
    console.log('1️⃣ Fixing External ID 543 (should be FC Nantes, not FC Lorient)...');
    const { data: team543, error: error543 } = await supabase
      .from('teams')
      .update({
        name: 'FC Nantes',
        short_name: 'Nantes',
        country: 'France',
        league: 'Ligue 1'
      })
      .eq('external_id', '543')
      .select();

    if (error543) {
      console.error('❌ Error updating team 543:', error543);
    } else {
      console.log(`✅ Updated team 543 to FC Nantes`);
    }

    // Fix External ID 529: Should be Stade Rennais, not Olympique de Marseille
    console.log('\n2️⃣ Fixing External ID 529 (should be Stade Rennais, not Olympique de Marseille)...');
    const { data: team529, error: error529 } = await supabase
      .from('teams')
      .update({
        name: 'Stade Rennais FC 1901',
        short_name: 'Rennes',
        country: 'France',
        league: 'Ligue 1'
      })
      .eq('external_id', '529')
      .select();

    if (error529) {
      console.error('❌ Error updating team 529:', error529);
    } else {
      console.log(`✅ Updated team 529 to Stade Rennais FC 1901`);
    }

    // Delete duplicate FC Lorient with external_id 525
    console.log('\n3️⃣ Checking if we need to handle duplicate FC Lorient entries...');
    const { data: lorientTeams, error: lorientError } = await supabase
      .from('teams')
      .select('*')
      .eq('external_id', '525');

    if (lorientError) {
      console.error('❌ Error checking Lorient teams:', lorientError);
    } else if (lorientTeams.length > 0) {
      console.log(`   Found FC Lorient with external_id 525 - this is correct, keeping it.`);
      // Update it to ensure it has correct info
      await supabase
        .from('teams')
        .update({
          name: 'FC Lorient',
          short_name: 'Lorient',
          country: 'France',
          league: 'Ligue 1'
        })
        .eq('external_id', '525');
      console.log(`   ✅ Updated FC Lorient (525) info`);
    }

    // Check for Lens teams
    console.log('\n4️⃣ Fixing Lens team names...');
    
    // Update external_id 546 to use full name "Racing Club de Lens"
    await supabase
      .from('teams')
      .update({
        name: 'Racing Club de Lens',
        short_name: 'RC Lens',
        country: 'France',
        league: 'Ligue 1'
      })
      .eq('external_id', '546');
    console.log(`   ✅ Updated Racing Club de Lens (546)`);

    // Check if there's a 522
    const { data: lens522 } = await supabase
      .from('teams')
      .select('*')
      .eq('external_id', '522');
    
    if (lens522 && lens522.length > 0) {
      await supabase
        .from('teams')
        .update({
          name: 'RC Lens',
          short_name: 'Lens',
          country: 'France',
          league: 'Ligue 1'
        })
        .eq('external_id', '522');
      console.log(`   ✅ Updated RC Lens (522)`);
    }

    console.log('\n✅ All Ligue 1 team corrections completed!');
    console.log('\n📊 Summary:');
    console.log('   - External ID 543: FC Lorient → FC Nantes');
    console.log('   - External ID 529: Olympique de Marseille → Stade Rennais');
    console.log('   - External ID 525: FC Lorient (correct)');
    console.log('   - External ID 546: Racing Club de Lens (correct)');

  } catch (error) {
    console.error('❌ Fatal error:', error);
  }

  process.exit(0);
}

fixLigue1Teams();

