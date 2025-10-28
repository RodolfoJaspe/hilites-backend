require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
const { zonedTimeToUtc } = require('date-fns-tz');
const BackgroundProcessor = require('./services/backgroundProcessor');

// Import routes
const authRoutes = require('./routes/auth');
const preferencesRoutes = require('./routes/preferences');
const teamsRoutes = require('./routes/teams');
const highlightsRoutes = require('./routes/highlights');
const matchesRoutes = require('./routes/matches');
const aiDiscoveryRoutes = require('./routes/ai-discovery');
const favoriteTeamsRoutes = require('./routes/favorite-teams');

const app = express();
const port = process.env.PORT || 5001;
const backgroundIntervalMs = parseInt(process.env.BACKGROUND_INTERVAL_MS || '300000', 10); // default 5 minutes

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://hilites.vercel.app'] 
    : ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200 // For legacy browser support
}));

// Rate limiting - More lenient for development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // More lenient in development
  message: {
    error: 'Too many requests',
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Test endpoint for manual match fetching
app.get('/api/test-fetch-matches', async (req, res) => {
  try {
    console.log('🚀 [TEST] Manually triggering match fetch...');
    await backgroundProcessor.fetchAndProcessMatches();
    res.json({ 
      success: true, 
      message: 'Manual match fetch completed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ [TEST] Error in manual match fetch:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/preferences', preferencesRoutes);
app.use('/api/teams', teamsRoutes);
app.use('/api/highlights', highlightsRoutes);
app.use('/api/matches', matchesRoutes);
app.use('/api/ai-discovery', aiDiscoveryRoutes);
app.use('/api/favorite-teams', favoriteTeamsRoutes);

// Background processing status endpoint (optional lightweight health for processor)
app.get('/api/background/status', (req, res) => {
  try {
    if (!app.locals.backgroundProcessor) {
      return res.json({ is_processing: false, last_processed: null, uptime: process.uptime() });
    }
    return res.json(app.locals.backgroundProcessor.getStatus());
  } catch (e) {
    return res.status(500).json({ error: 'Failed to get background status' });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: 'The requested endpoint does not exist'
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  
  res.status(error.status || 500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'production' 
      ? 'Something went wrong' 
      : error.message
  });
});

// Initialize background processor
const backgroundProcessor = new BackgroundProcessor();

// Test endpoint for manual match fetching
app.get('/api/test-fetch-matches', async (req, res) => {
  try {
    console.log('🚀 [TEST] Manually triggering match fetch...');
    await backgroundProcessor.fetchAndProcessMatches();
    res.json({ 
      success: true, 
      message: 'Manual match fetch completed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ [TEST] Error in manual match fetch:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Start regular background processing
const backgroundInterval = setInterval(() => {
  backgroundProcessor.fetchAndProcessMatches().catch(console.error);
}, backgroundIntervalMs);

// Schedule match fetching every 10 minutes
cron.schedule('*/10 * * * *', () => {
  console.log('🔄 [CRON] Running scheduled match fetch...');
  backgroundProcessor.fetchAndProcessMatches()
    .then(() => console.log('✅ [CRON] Match fetch completed successfully'))
    .catch(error => console.error('❌ [CRON] Error in match fetch:', error.message));
});

// Initial fetch on startup with error handling
console.log('🚀 [STARTUP] Running initial match fetch...');
backgroundProcessor.fetchAndProcessMatches()
  .then(() => console.log('✅ [STARTUP] Initial match fetch completed'))
  .catch(error => console.error('❌ [STARTUP] Initial match fetch failed:', error.message));

// Clean up on exit
process.on('SIGINT', () => {
  clearInterval(backgroundInterval);
  process.exit(0);
});

// Schedule daily task to process finished matches at 10 PM Eastern Time
const scheduleDailyTask = () => {
  // 10 PM Eastern Time in cron format (0 22 * * *)
  const easternTime = '0 22 * * *';
  
  console.log('⏰ Scheduling daily task to process finished matches at 10 PM Eastern Time');
  
  // Schedule the task
  cron.schedule(easternTime, async () => {
    try {
      console.log('⏰ Running scheduled task: Processing finished matches for today');
      await backgroundProcessor.processFinishedMatches();
      console.log('✅ Finished processing matches for today');
    } catch (error) {
      console.error('❌ Error in scheduled task:', error);
    }
  }, {
    timezone: 'America/New_York',
    name: 'process-finished-matches'
  });};

// Test endpoint for manual triggering
app.get('/api/test-fetch-matches', async (req, res) => {
  try {
    const backgroundProcessor = new (require('./services/backgroundProcessor'))();
    console.log('🔄 [TEST] Manually triggering match fetch...');
    await backgroundProcessor.fetchAndProcessMatches();
    res.json({ 
      success: true, 
      message: 'Manual match fetch completed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ [TEST] Error in manual match fetch:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`🚀 Hilites Backend Server is running on port ${port}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${port}/health`);
  
  // Start the scheduled task
  scheduleDailyTask();
});