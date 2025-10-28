require('dotenv').config();
const BackgroundProcessor = require('./services/backgroundProcessor');

(async () => {
  try {
    console.log('🚀 Starting manual fetch...');
    const processor = new BackgroundProcessor();
    await processor.fetchAndProcessMatches();
    console.log('✅ Manual fetch completed successfully');
  } catch (error) {
    console.error('❌ Error in manual fetch:', error);
    process.exit(1);
  }
})();
