require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function fixLigue1TeamIds() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    console.log('🔧 Fixing incorrect Ligue 1 team external IDs...\n');

    // Fix External ID 522: Should be OGC Nice, not RC Lens
    console.log('1️⃣ Fixing External ID 522 (RC Lens → OGC Nice)...');
    const { error: error522 } = await supabase
      .from('teams')
      .update({
        name: 'OGC Nice',
        short_name: 'Nice',
        country: 'France',
        league: 'Ligue 1'
      })
      .eq('external_id', '522');

    if (error522) {
      console.error('❌ Error:', error522);
    } else {
      console.log('✅ Updated external_id 522 to OGC Nice');
    }

    // Fix External ID 516: Should be Olympique de Marseille, not AS Monaco FC
    console.log('\n2️⃣ Fixing External ID 516 (AS Monaco FC → Olympique de Marseille)...');
    const { error: error516 } = await supabase
      .from('teams')
      .update({
        name: 'Olympique de Marseille',
        short_name: 'Marseille',
        country: 'France',
        league: 'Ligue 1'
      })
      .eq('external_id', '516');

    if (error516) {
      console.error('❌ Error:', error516);
    } else {
      console.log('✅ Updated external_id 516 to Olympique de Marseille');
    }

    // Fix External ID 548: Should be AS Monaco FC, not OGC Nice
    console.log('\n3️⃣ Fixing External ID 548 (OGC Nice → AS Monaco FC)...');
    const { error: error548 } = await supabase
      .from('teams')
      .update({
        name: 'AS Monaco FC',
        short_name: 'Monaco',
        country: 'France',
        league: 'Ligue 1'
      })
      .eq('external_id', '548');

    if (error548) {
      console.error('❌ Error:', error548);
    } else {
      console.log('✅ Updated external_id 548 to AS Monaco FC');
    }

    console.log('\n✅ All team external ID corrections completed!');
    console.log('\n📊 Summary:');
    console.log('   - External ID 522: RC Lens → OGC Nice');
    console.log('   - External ID 516: AS Monaco FC → Olympique de Marseille');
    console.log('   - External ID 548: OGC Nice → AS Monaco FC');

  } catch (error) {
    console.error('❌ Fatal error:', error);
  }

  process.exit(0);
}

fixLigue1TeamIds();

