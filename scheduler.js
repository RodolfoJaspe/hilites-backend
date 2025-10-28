const cron = require('node-cron');
const BackgroundProcessor = require('./services/backgroundProcessor');

// Initialize the background processor
const processor = new BackgroundProcessor();

// Log when the scheduler starts
console.log('⏰ Scheduler started. Setting up match fetching jobs...');

// Schedule match fetching to run every 30 minutes
cron.schedule('*/30 * * * *', async () => {
  console.log('🔄 Running scheduled match fetch at', new Date().toISOString());
  try {
    await processor.fetchAndProcessMatches();
    console.log('✅ Scheduled match fetch completed at', new Date().toISOString());
  } catch (error) {
    console.error('❌ Error in scheduled match fetch:', error);
  }
});

// Run immediately on start (optional, remove if not desired)
(async () => {
  console.log('🏃 Running initial match fetch...');
  try {
    await processor.fetchAndProcessMatches();
    console.log('✅ Initial match fetch completed');
  } catch (error) {
    console.error('❌ Error in initial match fetch:', error);
  }
})();

// Handle process termination
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM. Shutting down scheduler...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT. Shutting down scheduler...');
  process.exit(0);
});

// Keep the process alive
setInterval(() => {}, 1 << 30);
