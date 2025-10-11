const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function clearNonDomesticIDs() {
  console.log('🔄 Clearing external_ids from non-domestic leagues...\n');
  
  const domesticLeagues = ['Premier League', 'La Liga', 'Serie A', 'Bundesliga', 'Ligue 1'];
  
  const { data: nonDomestic, error } = await supabase
    .from('teams')
    .select('id, external_id, name, league');
  
  if (error) {
    console.error('Error fetching teams:', error);
    return;
  }
  
  const toUpdate = nonDomestic.filter(t => !domesticLeagues.includes(t.league) && t.external_id);
  
  console.log(`Found ${toUpdate.length} non-domestic teams with external_ids`);
  
  for (const team of toUpdate) {
    const { error } = await supabase
      .from('teams')
      .update({ external_id: `temp_${team.id}` })
      .eq('id', team.id);
    
    if (error) {
      console.error(`Error updating ${team.name}:`, error.message);
    }
  }
  
  console.log(`✅ Cleared ${toUpdate.length} teams!`);
}

clearNonDomesticIDs()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });


