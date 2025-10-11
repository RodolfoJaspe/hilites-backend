const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

async function fixAllTeamLogos() {
  console.log('🔧 Starting comprehensive team logo fixes...\n');

  // Step 1: Delete duplicates and wrong entries
  console.log('🗑️  Step 1: Removing duplicates and wrong entries...');
  
  const toDelete = [
    { name: 'Bournemouth', league: 'Premier League' }, // Keep AFC Bournemouth
    { name: 'Nottingham Forest', league: 'Premier League', external_id: '715' }, // Keep the one with 351
  ];

  for (const team of toDelete) {
    const query = supabase.from('teams').delete();
    if (team.external_id) {
      query.eq('external_id', team.external_id);
    } else {
      query.eq('name', team.name).eq('league', team.league);
    }
    const { error } = await query;
    if (error) {
      console.error(`  ❌ Error deleting ${team.name}:`, error.message);
    } else {
      console.log(`  ✅ Deleted duplicate: ${team.name}`);
    }
  }

  // Step 2: Fix incorrect logos with correct external_ids
  console.log('\n🎨 Step 2: Fixing incorrect logos...');
  
  const logoFixes = {
    // Premier League
    'Fulham': { external_id: '63', logo_url: 'https://crests.football-data.org/63.png' },
    'AFC Bournemouth': { external_id: '1044', logo_url: 'https://crests.football-data.org/1044.png' },
    'Nottingham Forest': { external_id: '351', logo_url: 'https://crests.football-data.org/351.png' },
    
    // La Liga
    'Athletic Club': { external_id: '77', logo_url: 'https://crests.football-data.org/77.png' },
    'Getafe CF': { external_id: '82', logo_url: 'https://crests.football-data.org/82.png' },
    'Real Betis': { external_id: '90', logo_url: 'https://crests.football-data.org/90.png' },
    'Real Sociedad': { external_id: '92', logo_url: 'https://crests.football-data.org/92.png' },
    'Valencia CF': { external_id: '95', logo_url: 'https://crests.football-data.org/95.png' },
    'Sevilla FC': { external_id: '559', logo_url: 'https://crests.football-data.org/559.png' },
    'Villarreal CF': { external_id: '94', logo_url: 'https://crests.football-data.org/94.png' },
    'FC Barcelona': { external_id: '81', logo_url: 'https://crests.football-data.org/81.png' },
    'Real Madrid CF': { external_id: '86', logo_url: 'https://crests.football-data.org/86.png' },
    'Atletico Madrid': { external_id: '78', logo_url: 'https://crests.football-data.org/78.png' },
    
    // Bundesliga
    'Bayer 04 Leverkusen': { external_id: '3', logo_url: 'https://crests.football-data.org/3.png' },
    'Borussia Dortmund': { external_id: '4', logo_url: 'https://crests.football-data.org/4.png' },
    'Bayern München': { external_id: '5', logo_url: 'https://crests.football-data.org/5.png' },
    'VfL Wolfsburg': { external_id: '11', logo_url: 'https://crests.football-data.org/11.png' },
    'RB Leipzig': { external_id: '721', logo_url: 'https://crests.football-data.org/721.png' },
    'Eintracht Frankfurt': { external_id: '19', logo_url: 'https://crests.football-data.org/19.png' },
    'TSG 1899 Hoffenheim': { external_id: '2', logo_url: 'https://crests.football-data.org/2.png' },
    'SC Freiburg': { external_id: '17', logo_url: 'https://crests.football-data.org/17.png' },
    'Borussia Mönchengladbach': { external_id: '18', logo_url: 'https://crests.football-data.org/18.png' },
    'VfB Stuttgart': { external_id: '10', logo_url: 'https://crests.football-data.org/10.png' },
    
    // Serie A
    'Juventus FC': { external_id: '109', logo_url: 'https://crests.football-data.org/109.png' },
    'AC Milan': { external_id: '98', logo_url: 'https://crests.football-data.org/98.png' },
    'Inter Milan': { external_id: '108', logo_url: 'https://crests.football-data.org/108.png' },
    'AS Roma': { external_id: '100', logo_url: 'https://crests.football-data.org/100.png' },
    'SSC Napoli': { external_id: '113', logo_url: 'https://crests.football-data.org/113.png' },
    'Atalanta BC': { external_id: '102', logo_url: 'https://crests.football-data.org/102.png' },
    'Lazio': { external_id: '110', logo_url: 'https://crests.football-data.org/110.png' },
    'Fiorentina': { external_id: '99', logo_url: 'https://crests.football-data.org/99.png' },
    'Bologna FC': { external_id: '103', logo_url: 'https://crests.football-data.org/103.png' },
    'Torino FC': { external_id: '586', logo_url: 'https://crests.football-data.org/586.png' },
    
    // Ligue 1
    'Paris Saint-Germain FC': { external_id: '524', logo_url: 'https://crests.football-data.org/524.png' },
    'Olympique de Marseille': { external_id: '525', logo_url: 'https://crests.football-data.org/525.png' },
    'Olympique Lyonnais': { external_id: '523', logo_url: 'https://crests.football-data.org/523.png' },
    'AS Monaco FC': { external_id: '548', logo_url: 'https://crests.football-data.org/548.png' },
    'OGC Nice': { external_id: '522', logo_url: 'https://crests.football-data.org/522.png' },
    'LOSC Lille': { external_id: '521', logo_url: 'https://crests.football-data.org/521.png' },
    'RC Lens': { external_id: '546', logo_url: 'https://crests.football-data.org/546.png' },
    'Stade Rennais FC': { external_id: '529', logo_url: 'https://crests.football-data.org/529.png' },
    'FC Nantes': { external_id: '543', logo_url: 'https://crests.football-data.org/543.png' },
    'AS Saint-Étienne': { external_id: '1108', logo_url: 'https://crests.football-data.org/1108.png' },
  };

  let fixedCount = 0;
  let errorCount = 0;

  for (const [teamName, fix] of Object.entries(logoFixes)) {
    try {
      const { error } = await supabase
        .from('teams')
        .update({ 
          external_id: fix.external_id,
          logo_url: fix.logo_url 
        })
        .eq('name', teamName);

      if (error) {
        console.error(`  ❌ Error fixing ${teamName}:`, error.message);
        errorCount++;
      } else {
        console.log(`  ✅ Fixed ${teamName}`);
        fixedCount++;
      }
    } catch (error) {
      console.error(`  ❌ Error fixing ${teamName}:`, error.message);
      errorCount++;
    }
  }

  console.log(`\n✅ Complete!`);
  console.log(`  Fixed: ${fixedCount} teams`);
  if (errorCount > 0) {
    console.log(`  Errors: ${errorCount} teams`);
  }
}

fixAllTeamLogos()
  .then(() => {
    console.log('\n🎉 All team logos fixed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });


