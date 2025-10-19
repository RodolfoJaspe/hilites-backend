require('dotenv').config();
const axios = require('axios');

async function verifyApiTeams() {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    console.log(`🔍 Checking Football-Data.org API for today's Ligue 1 matches (${today})...\n`);
    
    const response = await axios.get(`https://api.football-data.org/v4/competitions/FL1/matches?dateFrom=${today}&dateTo=${today}`, {
      headers: {
        'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY
      }
    });

    const matches = response.data.matches;
    
    console.log(`✅ Found ${matches.length} Ligue 1 matches:\n`);
    
    matches.forEach((match, index) => {
      console.log(`Match ${index + 1}:`);
      console.log(`   ${match.homeTeam.name} vs ${match.awayTeam.name}`);
      console.log(`   Time: ${match.utcDate}`);
      console.log(`   Status: ${match.status}`);
      console.log(`   Home Team ID: ${match.homeTeam.id}`);
      console.log(`   Away Team ID: ${match.awayTeam.id}`);
      console.log('');
    });

    // Check specifically for Lorient and Lens
    console.log('\n🔍 Teams with Lorient or Lens:\n');
    matches.forEach(match => {
      if (match.homeTeam.name.includes('Lorient') || match.homeTeam.name.includes('Lens')) {
        console.log(`${match.homeTeam.name} - ID: ${match.homeTeam.id}`);
      }
      if (match.awayTeam.name.includes('Lorient') || match.awayTeam.name.includes('Lens')) {
        console.log(`${match.awayTeam.name} - ID: ${match.awayTeam.id}`);
      }
    });

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }

  process.exit(0);
}

verifyApiTeams();

