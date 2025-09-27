const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Use service role key for seeding to bypass RLS
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

// Football API endpoints (you'll need to choose one and get API keys)
const FOOTBALL_APIS = {
  // Option 1: Football-Data.org (Free tier: 10 requests/minute)
  footballData: {
    baseUrl: 'https://api.football-data.org/v4',
    headers: {
      'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY
    }
  },
  
  // Option 2: API-Sports (Free tier: 100 requests/day)
  apiSports: {
    baseUrl: 'https://v3.football.api-sports.io',
    headers: {
      'x-rapidapi-key': process.env.API_SPORTS_KEY,
      'x-rapidapi-host': 'v3.football.api-sports.io'
    }
  },
  
  // Option 3: Football-API (Free tier: 100 requests/day)
  footballApi: {
    baseUrl: 'https://v3.football.api-sports.io',
    headers: {
      'x-rapidapi-key': process.env.FOOTBALL_API_KEY,
      'x-rapidapi-host': 'v3.football.api-sports.io'
    }
  }
};

// Premier League teams data (fallback if API is unavailable)
const PREMIER_LEAGUE_TEAMS = [
  {
    external_id: '57',
    name: 'Arsenal',
    short_name: 'Arsenal',
    code: 'ARS',
    country: 'England',
    country_code: 'GB',
    league: 'Premier League',
    league_id: '2021',
    continental_confederation: 'UEFA',
    founded_year: 1886,
    venue_name: 'Emirates Stadium',
    venue_city: 'London',
    venue_capacity: 60260,
    logo_url: 'https://crests.football-data.org/57.png',
    website_url: 'https://www.arsenal.com'
  },
  {
    external_id: '61',
    name: 'Chelsea',
    short_name: 'Chelsea',
    code: 'CHE',
    country: 'England',
    country_code: 'GB',
    league: 'Premier League',
    league_id: '2021',
    continental_confederation: 'UEFA',
    founded_year: 1905,
    venue_name: 'Stamford Bridge',
    venue_city: 'London',
    venue_capacity: 40834,
    logo_url: 'https://crests.football-data.org/61.png',
    website_url: 'https://www.chelseafc.com'
  },
  {
    external_id: '65',
    name: 'Manchester City',
    short_name: 'Man City',
    code: 'MCI',
    country: 'England',
    country_code: 'GB',
    league: 'Premier League',
    league_id: '2021',
    continental_confederation: 'UEFA',
    founded_year: 1880,
    venue_name: 'Etihad Stadium',
    venue_city: 'Manchester',
    venue_capacity: 53400,
    logo_url: 'https://crests.football-data.org/65.png',
    website_url: 'https://www.mancity.com'
  },
  {
    external_id: '66',
    name: 'Manchester United',
    short_name: 'Man Utd',
    code: 'MUN',
    country: 'England',
    country_code: 'GB',
    league: 'Premier League',
    league_id: '2021',
    continental_confederation: 'UEFA',
    founded_year: 1878,
    venue_name: 'Old Trafford',
    venue_city: 'Manchester',
    venue_capacity: 74310,
    logo_url: 'https://crests.football-data.org/66.png',
    website_url: 'https://www.manutd.com'
  },
  {
    external_id: '64',
    name: 'Liverpool',
    short_name: 'Liverpool',
    code: 'LIV',
    country: 'England',
    country_code: 'GB',
    league: 'Premier League',
    league_id: '2021',
    continental_confederation: 'UEFA',
    founded_year: 1892,
    venue_name: 'Anfield',
    venue_city: 'Liverpool',
    venue_capacity: 53394,
    logo_url: 'https://crests.football-data.org/64.png',
    website_url: 'https://www.liverpoolfc.com'
  },
  {
    external_id: '73',
    name: 'Tottenham Hotspur',
    short_name: 'Spurs',
    code: 'TOT',
    country: 'England',
    country_code: 'GB',
    league: 'Premier League',
    league_id: '2021',
    continental_confederation: 'UEFA',
    founded_year: 1882,
    venue_name: 'Tottenham Hotspur Stadium',
    venue_city: 'London',
    venue_capacity: 62850,
    logo_url: 'https://crests.football-data.org/73.png',
    website_url: 'https://www.tottenhamhotspur.com'
  }
];

async function fetchTeamsFromAPI() {
  try {
    // Example using Football-Data.org API
    const response = await fetch(`${FOOTBALL_APIS.footballData.baseUrl}/competitions/2021/teams`, {
      headers: FOOTBALL_APIS.footballData.headers
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    const data = await response.json();
    return data.teams.map(team => ({
      external_id: team.id.toString(),
      name: team.name,
      short_name: team.shortName,
      code: team.tla,
      country: team.area.name,
      country_code: team.area.code,
      league: 'Premier League',
      league_id: '2021',
      continental_confederation: 'UEFA',
      founded_year: team.founded,
      venue_name: team.venue,
      venue_city: team.address,
      venue_capacity: null, // Not provided by this API
      logo_url: team.crest,
      website_url: team.website
    }));
  } catch (error) {
    console.error('Error fetching from API:', error);
    console.log('Falling back to static data...');
    return PREMIER_LEAGUE_TEAMS;
  }
}

async function seedTeams() {
  try {
    console.log('🌱 Starting team seeding process...');
    
    // Fetch team data
    const teams = await fetchTeamsFromAPI();
    console.log(`📊 Found ${teams.length} teams to seed`);
    
    // Insert teams into database
    const { data, error } = await supabase
      .from('teams')
      .insert(teams)
      .select();
    
    if (error) {
      console.error('❌ Error seeding teams:', error);
      return;
    }
    
    console.log(`✅ Successfully seeded ${data.length} teams!`);
    console.log('🎉 Teams seeded:', data.map(t => t.name).join(', '));
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  }
}

// Run the seeding function
if (require.main === module) {
  seedTeams();
}

module.exports = { seedTeams, PREMIER_LEAGUE_TEAMS };
