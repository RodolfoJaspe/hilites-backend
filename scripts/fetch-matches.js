require('dotenv').config();
const BackgroundProcessor = require('../services/backgroundProcessor');

async function run() {
  try {
    const processor = new BackgroundProcessor();
    console.log('🚀 Starting match fetching process...');
    await processor.fetchAndProcessMatches();
    console.log('✅ Match fetching completed');
  } catch (error) {
    console.error('❌ Error in match fetching process:', error);
    process.exit(1);
  }
}

run();
