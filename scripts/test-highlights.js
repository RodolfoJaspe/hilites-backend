const axios = require('axios');

// Test the highlights API endpoints
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

async function testHighlightsAPI() {
  console.log('🧪 Testing Highlights API...\n');
  
  try {
    // Test 1: Get all highlights
    console.log('📺 Test 1: Fetching all highlights...');
    const allHighlights = await axios.get(`${BASE_URL}/api/highlights`);
    
    if (allHighlights.data.success) {
      console.log(`✅ Success! Found ${allHighlights.data.count} highlights`);
      console.log(`📅 Last updated: ${allHighlights.data.lastUpdated}`);
      console.log(`💾 Cached: ${allHighlights.data.cached}`);
      
      // Show first highlight as example
      if (allHighlights.data.data.length > 0) {
        const firstHighlight = allHighlights.data.data[0];
        console.log('\n🎬 First highlight example:');
        console.log(`   Title: ${firstHighlight.title}`);
        console.log(`   Teams: ${firstHighlight.teams.home} vs ${firstHighlight.teams.away}`);
        console.log(`   Competition: ${firstHighlight.competition}`);
      }
    } else {
      console.log('❌ Failed to fetch highlights');
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Test 2: Search highlights
    console.log('🔍 Test 2: Searching for "Real Madrid"...');
    const searchResults = await axios.get(`${BASE_URL}/api/highlights/search?q=${encodeURIComponent('Real Madrid')}`);
    
    if (searchResults.data.success) {
      console.log(`✅ Search successful! Found ${searchResults.data.count} matches`);
      if (searchResults.data.data.length > 0) {
        console.log('🎬 Search results:');
        searchResults.data.data.slice(0, 3).forEach((match, index) => {
          console.log(`   ${index + 1}. ${match.title}`);
        });
      }
    } else {
      console.log('❌ Search failed');
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Test 3: Get highlights by competition
    console.log('🏆 Test 3: Fetching Premier League highlights...');
    const competitionResults = await axios.get(`${BASE_URL}/api/highlights/competition/Premier League`);
    
    if (competitionResults.data.success) {
      console.log(`✅ Competition filter successful! Found ${competitionResults.data.count} Premier League matches`);
      if (competitionResults.data.data.length > 0) {
        console.log('🎬 Premier League highlights:');
        competitionResults.data.data.slice(0, 3).forEach((match, index) => {
          console.log(`   ${index + 1}. ${match.title}`);
        });
      }
    } else {
      console.log('❌ Competition filter failed');
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Test 4: Get statistics
    console.log('📊 Test 4: Fetching highlights statistics...');
    const statsResults = await axios.get(`${BASE_URL}/api/highlights/stats`);
    
    if (statsResults.data.success) {
      console.log('✅ Statistics retrieved successfully!');
      const stats = statsResults.data.stats;
      console.log(`📈 Total matches: ${stats.totalMatches}`);
      console.log(`🏆 Competitions: ${stats.competitions}`);
      console.log('\n🥇 Top 3 Competitions:');
      stats.topCompetitions.slice(0, 3).forEach((comp, index) => {
        console.log(`   ${index + 1}. ${comp.name}: ${comp.count} matches`);
      });
      console.log('\n⚽ Top 3 Teams:');
      stats.topTeams.slice(0, 3).forEach((team, index) => {
        console.log(`   ${index + 1}. ${team.name}: ${team.count} matches`);
      });
    } else {
      console.log('❌ Statistics fetch failed');
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Test 5: Force refresh cache
    console.log('🔄 Test 5: Force refreshing cache...');
    const refreshResults = await axios.get(`${BASE_URL}/api/highlights/refresh`);
    
    if (refreshResults.data.success) {
      console.log(`✅ Cache refresh successful! Updated ${refreshResults.data.count} highlights`);
      console.log(`📅 Refreshed at: ${refreshResults.data.lastUpdated}`);
    } else {
      console.log('❌ Cache refresh failed');
    }
    
    console.log('\n🎉 All tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run tests
if (require.main === module) {
  testHighlightsAPI();
}

module.exports = { testHighlightsAPI };
