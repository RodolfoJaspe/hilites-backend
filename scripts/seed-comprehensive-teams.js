const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Use service role key for seeding to bypass RLS
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

// Comprehensive team data for major European leagues
const COMPREHENSIVE_TEAMS_DATA = {
  premierLeague: [
    { external_id: '57', name: 'Arsenal', short_name: 'Arsenal', code: 'ARS', country: 'England', country_code: 'GB', league: 'Premier League', league_id: '2021', continental_confederation: 'UEFA', founded_year: 1886, venue_name: 'Emirates Stadium', venue_city: 'London', venue_capacity: 60260, logo_url: 'https://crests.football-data.org/57.png', website_url: 'https://www.arsenal.com' },
    { external_id: '61', name: 'Chelsea', short_name: 'Chelsea', code: 'CHE', country: 'England', country_code: 'GB', league: 'Premier League', league_id: '2021', continental_confederation: 'UEFA', founded_year: 1905, venue_name: 'Stamford Bridge', venue_city: 'London', venue_capacity: 40834, logo_url: 'https://crests.football-data.org/61.png', website_url: 'https://www.chelseafc.com' },
    { external_id: '65', name: 'Manchester City', short_name: 'Man City', code: 'MCI', country: 'England', country_code: 'GB', league: 'Premier League', league_id: '2021', continental_confederation: 'UEFA', founded_year: 1880, venue_name: 'Etihad Stadium', venue_city: 'Manchester', venue_capacity: 53400, logo_url: 'https://crests.football-data.org/65.png', website_url: 'https://www.mancity.com' },
    { external_id: '66', name: 'Manchester United', short_name: 'Man Utd', code: 'MUN', country: 'England', country_code: 'GB', league: 'Premier League', league_id: '2021', continental_confederation: 'UEFA', founded_year: 1878, venue_name: 'Old Trafford', venue_city: 'Manchester', venue_capacity: 74310, logo_url: 'https://crests.football-data.org/66.png', website_url: 'https://www.manutd.com' },
    { external_id: '64', name: 'Liverpool', short_name: 'Liverpool', code: 'LIV', country: 'England', country_code: 'GB', league: 'Premier League', league_id: '2021', continental_confederation: 'UEFA', founded_year: 1892, venue_name: 'Anfield', venue_city: 'Liverpool', venue_capacity: 53394, logo_url: 'https://crests.football-data.org/64.png', website_url: 'https://www.liverpoolfc.com' },
    { external_id: '73', name: 'Tottenham Hotspur', short_name: 'Spurs', code: 'TOT', country: 'England', country_code: 'GB', league: 'Premier League', league_id: '2021', continental_confederation: 'UEFA', founded_year: 1882, venue_name: 'Tottenham Hotspur Stadium', venue_city: 'London', venue_capacity: 62850, logo_url: 'https://crests.football-data.org/73.png', website_url: 'https://www.tottenhamhotspur.com' },
    { external_id: '67', name: 'Newcastle United', short_name: 'Newcastle', code: 'NEW', country: 'England', country_code: 'GB', league: 'Premier League', league_id: '2021', continental_confederation: 'UEFA', founded_year: 1892, venue_name: 'St. James\' Park', venue_city: 'Newcastle', venue_capacity: 52305, logo_url: 'https://crests.football-data.org/67.png', website_url: 'https://www.nufc.co.uk' },
    { external_id: '354', name: 'Crystal Palace', short_name: 'Crystal Palace', code: 'CRY', country: 'England', country_code: 'GB', league: 'Premier League', league_id: '2021', continental_confederation: 'UEFA', founded_year: 1905, venue_name: 'Selhurst Park', venue_city: 'London', venue_capacity: 25486, logo_url: 'https://crests.football-data.org/354.png', website_url: 'https://www.cpfc.co.uk' },
    { external_id: '563', name: 'West Ham United', short_name: 'West Ham', code: 'WHU', country: 'England', country_code: 'GB', league: 'Premier League', league_id: '2021', continental_confederation: 'UEFA', founded_year: 1895, venue_name: 'London Stadium', venue_city: 'London', venue_capacity: 66000, logo_url: 'https://crests.football-data.org/563.png', website_url: 'https://www.whufc.com' },
    { external_id: '397', name: 'Brighton & Hove Albion', short_name: 'Brighton', code: 'BHA', country: 'England', country_code: 'GB', league: 'Premier League', league_id: '2021', continental_confederation: 'UEFA', founded_year: 1901, venue_name: 'American Express Community Stadium', venue_city: 'Brighton', venue_capacity: 31800, logo_url: 'https://crests.football-data.org/397.png', website_url: 'https://www.brightonandhovealbion.com' },
    { external_id: '1044', name: 'Aston Villa', short_name: 'Aston Villa', code: 'AVL', country: 'England', country_code: 'GB', league: 'Premier League', league_id: '2021', continental_confederation: 'UEFA', founded_year: 1874, venue_name: 'Villa Park', venue_city: 'Birmingham', venue_capacity: 42640, logo_url: 'https://crests.football-data.org/1044.png', website_url: 'https://www.avfc.co.uk' },
    { external_id: '402', name: 'Brentford', short_name: 'Brentford', code: 'BRE', country: 'England', country_code: 'GB', league: 'Premier League', league_id: '2021', continental_confederation: 'UEFA', founded_year: 1889, venue_name: 'Brentford Community Stadium', venue_city: 'London', venue_capacity: 17250, logo_url: 'https://crests.football-data.org/402.png', website_url: 'https://www.brentfordfc.com' },
    { external_id: '328', name: 'Burnley', short_name: 'Burnley', code: 'BUR', country: 'England', country_code: 'GB', league: 'Premier League', league_id: '2021', continental_confederation: 'UEFA', founded_year: 1882, venue_name: 'Turf Moor', venue_city: 'Burnley', venue_capacity: 21944, logo_url: 'https://crests.football-data.org/328.png', website_url: 'https://www.burnleyfootballclub.com' },
    { external_id: '389', name: 'Fulham', short_name: 'Fulham', code: 'FUL', country: 'England', country_code: 'GB', league: 'Premier League', league_id: '2021', continental_confederation: 'UEFA', founded_year: 1879, venue_name: 'Craven Cottage', venue_city: 'London', venue_capacity: 19359, logo_url: 'https://crests.football-data.org/389.png', website_url: 'https://www.fulhamfc.com' },
    { external_id: '351', name: 'Everton', short_name: 'Everton', code: 'EVE', country: 'England', country_code: 'GB', league: 'Premier League', league_id: '2021', continental_confederation: 'UEFA', founded_year: 1878, venue_name: 'Goodison Park', venue_city: 'Liverpool', venue_capacity: 39414, logo_url: 'https://crests.football-data.org/351.png', website_url: 'https://www.evertonfc.com' },
    { external_id: '76', name: 'Wolverhampton Wanderers', short_name: 'Wolves', code: 'WOL', country: 'England', country_code: 'GB', league: 'Premier League', league_id: '2021', continental_confederation: 'UEFA', founded_year: 1877, venue_name: 'Molineux Stadium', venue_city: 'Wolverhampton', venue_capacity: 31700, logo_url: 'https://crests.football-data.org/76.png', website_url: 'https://www.wolves.co.uk' },
    { external_id: '346', name: 'Sheffield United', short_name: 'Sheffield Utd', code: 'SHU', country: 'England', country_code: 'GB', league: 'Premier League', league_id: '2021', continental_confederation: 'UEFA', founded_year: 1889, venue_name: 'Bramall Lane', venue_city: 'Sheffield', venue_capacity: 32125, logo_url: 'https://crests.football-data.org/346.png', website_url: 'https://www.sufc.co.uk' },
    { external_id: '340', name: 'Luton Town', short_name: 'Luton', code: 'LUT', country: 'England', country_code: 'GB', league: 'Premier League', league_id: '2021', continental_confederation: 'UEFA', founded_year: 1885, venue_name: 'Kenilworth Road', venue_city: 'Luton', venue_capacity: 10356, logo_url: 'https://crests.football-data.org/340.png', website_url: 'https://www.lutontown.co.uk' },
    { external_id: '715', name: 'Nottingham Forest', short_name: 'Nott\'m Forest', code: 'NFO', country: 'England', country_code: 'GB', league: 'Premier League', league_id: '2021', continental_confederation: 'UEFA', founded_year: 1865, venue_name: 'City Ground', venue_city: 'Nottingham', venue_capacity: 30445, logo_url: 'https://crests.football-data.org/715.png', website_url: 'https://www.nottinghamforest.co.uk' },
    { external_id: '68', name: 'Norwich City', short_name: 'Norwich', code: 'NOR', country: 'England', country_code: 'GB', league: 'Premier League', league_id: '2021', continental_confederation: 'UEFA', founded_year: 1902, venue_name: 'Carrow Road', venue_city: 'Norwich', venue_capacity: 27244, logo_url: 'https://crests.football-data.org/68.png', website_url: 'https://www.canaries.co.uk' }
  ],
  
  laLiga: [
    { external_id: '81', name: 'FC Barcelona', short_name: 'Barcelona', code: 'BAR', country: 'Spain', country_code: 'ES', league: 'La Liga', league_id: '2014', continental_confederation: 'UEFA', founded_year: 1899, venue_name: 'Camp Nou', venue_city: 'Barcelona', venue_capacity: 99354, logo_url: 'https://crests.football-data.org/81.png', website_url: 'https://www.fcbarcelona.com' },
    { external_id: '86', name: 'Real Madrid CF', short_name: 'Real Madrid', code: 'RMA', country: 'Spain', country_code: 'ES', league: 'La Liga', league_id: '2014', continental_confederation: 'UEFA', founded_year: 1902, venue_name: 'Santiago Bernabéu', venue_city: 'Madrid', venue_capacity: 81044, logo_url: 'https://crests.football-data.org/86.png', website_url: 'https://www.realmadrid.com' },
    { external_id: '78', name: 'Atletico Madrid', short_name: 'Atlético', code: 'ATM', country: 'Spain', country_code: 'ES', league: 'La Liga', league_id: '2014', continental_confederation: 'UEFA', founded_year: 1903, venue_name: 'Wanda Metropolitano', venue_city: 'Madrid', venue_capacity: 68456, logo_url: 'https://crests.football-data.org/78.png', website_url: 'https://www.atleticodemadrid.com' },
    { external_id: '559', name: 'Sevilla FC', short_name: 'Sevilla', code: 'SEV', country: 'Spain', country_code: 'ES', league: 'La Liga', league_id: '2014', continental_confederation: 'UEFA', founded_year: 1890, venue_name: 'Ramón Sánchez-Pizjuán', venue_city: 'Seville', venue_capacity: 43883, logo_url: 'https://crests.football-data.org/559.png', website_url: 'https://www.sevillafc.es' },
    { external_id: '94', name: 'Villarreal CF', short_name: 'Villarreal', code: 'VIL', country: 'Spain', country_code: 'ES', league: 'La Liga', league_id: '2014', continental_confederation: 'UEFA', founded_year: 1923, venue_name: 'Estadio de la Cerámica', venue_city: 'Villarreal', venue_capacity: 23500, logo_url: 'https://crests.football-data.org/94.png', website_url: 'https://www.villarrealcf.es' }
  ],
  
  serieA: [
    { external_id: '108', name: 'Juventus FC', short_name: 'Juventus', code: 'JUV', country: 'Italy', country_code: 'IT', league: 'Serie A', league_id: '2019', continental_confederation: 'UEFA', founded_year: 1897, venue_name: 'Allianz Stadium', venue_city: 'Turin', venue_capacity: 41507, logo_url: 'https://crests.football-data.org/108.png', website_url: 'https://www.juventus.com' },
    { external_id: '98', name: 'AC Milan', short_name: 'Milan', code: 'MIL', country: 'Italy', country_code: 'IT', league: 'Serie A', league_id: '2019', continental_confederation: 'UEFA', founded_year: 1899, venue_name: 'San Siro', venue_city: 'Milan', venue_capacity: 75923, logo_url: 'https://crests.football-data.org/98.png', website_url: 'https://www.acmilan.com' },
    { external_id: '109', name: 'Inter Milan', short_name: 'Inter', code: 'INT', country: 'Italy', country_code: 'IT', league: 'Serie A', league_id: '2019', continental_confederation: 'UEFA', founded_year: 1908, venue_name: 'San Siro', venue_city: 'Milan', venue_capacity: 75923, logo_url: 'https://crests.football-data.org/109.png', website_url: 'https://www.inter.it' },
    { external_id: '113', name: 'AS Roma', short_name: 'Roma', code: 'ROM', country: 'Italy', country_code: 'IT', league: 'Serie A', league_id: '2019', continental_confederation: 'UEFA', founded_year: 1927, venue_name: 'Stadio Olimpico', venue_city: 'Rome', venue_capacity: 70634, logo_url: 'https://crests.football-data.org/113.png', website_url: 'https://www.asroma.com' },
    { external_id: '99', name: 'SSC Napoli', short_name: 'Napoli', code: 'NAP', country: 'Italy', country_code: 'IT', league: 'Serie A', league_id: '2019', continental_confederation: 'UEFA', founded_year: 1926, venue_name: 'Stadio Diego Armando Maradona', venue_city: 'Naples', venue_capacity: 54726, logo_url: 'https://crests.football-data.org/99.png', website_url: 'https://www.sscnapoli.it' }
  ],
  
  bundesliga: [
    { external_id: '1', name: 'FC Bayern München', short_name: 'Bayern', code: 'FCB', country: 'Germany', country_code: 'DE', league: 'Bundesliga', league_id: '2002', continental_confederation: 'UEFA', founded_year: 1900, venue_name: 'Allianz Arena', venue_city: 'Munich', venue_capacity: 75000, logo_url: 'https://crests.football-data.org/1.png', website_url: 'https://fcbayern.com' },
    { external_id: '4', name: 'Borussia Dortmund', short_name: 'Dortmund', code: 'BVB', country: 'Germany', country_code: 'DE', league: 'Bundesliga', league_id: '2002', continental_confederation: 'UEFA', founded_year: 1909, venue_name: 'Signal Iduna Park', venue_city: 'Dortmund', venue_capacity: 81365, logo_url: 'https://crests.football-data.org/4.png', website_url: 'https://www.bvb.de' },
    { external_id: '721', name: 'RB Leipzig', short_name: 'Leipzig', code: 'RBL', country: 'Germany', country_code: 'DE', league: 'Bundesliga', league_id: '2002', continental_confederation: 'UEFA', founded_year: 2009, venue_name: 'Red Bull Arena', venue_city: 'Leipzig', venue_capacity: 47069, logo_url: 'https://crests.football-data.org/721.png', website_url: 'https://www.rbleipzig.com' },
    { external_id: '5', name: 'Bayer 04 Leverkusen', short_name: 'Leverkusen', code: 'B04', country: 'Germany', country_code: 'DE', league: 'Bundesliga', league_id: '2002', continental_confederation: 'UEFA', founded_year: 1904, venue_name: 'BayArena', venue_city: 'Leverkusen', venue_capacity: 30210, logo_url: 'https://crests.football-data.org/5.png', website_url: 'https://www.bayer04.de' },
    { external_id: '3', name: 'Borussia Mönchengladbach', short_name: 'M\'gladbach', code: 'BMG', country: 'Germany', country_code: 'DE', league: 'Bundesliga', league_id: '2002', continental_confederation: 'UEFA', founded_year: 1900, venue_name: 'Borussia-Park', venue_city: 'Mönchengladbach', venue_capacity: 54057, logo_url: 'https://crests.football-data.org/3.png', website_url: 'https://www.borussia.de' }
  ],
  
  ligue1: [
    { external_id: '524', name: 'Paris Saint-Germain', short_name: 'PSG', code: 'PSG', country: 'France', country_code: 'FR', league: 'Ligue 1', league_id: '2015', continental_confederation: 'UEFA', founded_year: 1970, venue_name: 'Parc des Princes', venue_city: 'Paris', venue_capacity: 47929, logo_url: 'https://crests.football-data.org/524.png', website_url: 'https://www.psg.fr' },
    { external_id: '516', name: 'Olympique de Marseille', short_name: 'Marseille', code: 'OM', country: 'France', country_code: 'FR', league: 'Ligue 1', league_id: '2015', continental_confederation: 'UEFA', founded_year: 1899, venue_name: 'Stade Vélodrome', venue_city: 'Marseille', venue_capacity: 67394, logo_url: 'https://crests.football-data.org/516.png', website_url: 'https://www.om.fr' },
    { external_id: '523', name: 'Olympique Lyonnais', short_name: 'Lyon', code: 'OL', country: 'France', country_code: 'FR', league: 'Ligue 1', league_id: '2015', continental_confederation: 'UEFA', founded_year: 1950, venue_name: 'Groupama Stadium', venue_city: 'Lyon', venue_capacity: 59186, logo_url: 'https://crests.football-data.org/523.png', website_url: 'https://www.ol.fr' },
    { external_id: '548', name: 'AS Monaco FC', short_name: 'Monaco', code: 'ASM', country: 'Monaco', country_code: 'MC', league: 'Ligue 1', league_id: '2015', continental_confederation: 'UEFA', founded_year: 1924, venue_name: 'Stade Louis II', venue_city: 'Monaco', venue_capacity: 18523, logo_url: 'https://crests.football-data.org/548.png', website_url: 'https://www.asmonaco.com' },
    { external_id: '547', name: 'LOSC Lille', short_name: 'Lille', code: 'LIL', country: 'France', country_code: 'FR', league: 'Ligue 1', league_id: '2015', continental_confederation: 'UEFA', founded_year: 1944, venue_name: 'Stade Pierre-Mauroy', venue_city: 'Lille', venue_capacity: 50186, logo_url: 'https://crests.football-data.org/547.png', website_url: 'https://www.losc.fr' }
  ]
};

async function seedAllTeams() {
  try {
    console.log('🌱 Starting comprehensive team seeding...');
    
    // Combine all teams from different leagues
    const allTeams = [
      ...COMPREHENSIVE_TEAMS_DATA.premierLeague,
      ...COMPREHENSIVE_TEAMS_DATA.laLiga,
      ...COMPREHENSIVE_TEAMS_DATA.serieA,
      ...COMPREHENSIVE_TEAMS_DATA.bundesliga,
      ...COMPREHENSIVE_TEAMS_DATA.ligue1
    ];
    
    console.log(`📊 Total teams to seed: ${allTeams.length}`);
    console.log(`🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League: ${COMPREHENSIVE_TEAMS_DATA.premierLeague.length}`);
    console.log(`🇪🇸 La Liga: ${COMPREHENSIVE_TEAMS_DATA.laLiga.length}`);
    console.log(`🇮🇹 Serie A: ${COMPREHENSIVE_TEAMS_DATA.serieA.length}`);
    console.log(`🇩🇪 Bundesliga: ${COMPREHENSIVE_TEAMS_DATA.bundesliga.length}`);
    console.log(`🇫🇷 Ligue 1: ${COMPREHENSIVE_TEAMS_DATA.ligue1.length}`);
    
    // Insert teams in batches to avoid overwhelming the database
    const batchSize = 20;
    let insertedCount = 0;
    
    for (let i = 0; i < allTeams.length; i += batchSize) {
      const batch = allTeams.slice(i, i + batchSize);
      
      const { data, error } = await supabase
        .from('teams')
        .insert(batch)
        .select();
      
      if (error) {
        console.error(`❌ Error inserting batch ${Math.floor(i/batchSize) + 1}:`, error);
        continue;
      }
      
      insertedCount += data.length;
      console.log(`✅ Batch ${Math.floor(i/batchSize) + 1} inserted: ${data.length} teams`);
    }
    
    console.log(`🎉 Seeding complete! Inserted ${insertedCount} teams total`);
    
    // Display summary by league
    const leagues = [...new Set(allTeams.map(t => t.league))];
    leagues.forEach(league => {
      const leagueTeams = allTeams.filter(t => t.league === league);
      console.log(`📈 ${league}: ${leagueTeams.length} teams`);
    });
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  }
}

// Run the seeding function
if (require.main === module) {
  seedAllTeams();
}

module.exports = { seedAllTeams, COMPREHENSIVE_TEAMS_DATA };
