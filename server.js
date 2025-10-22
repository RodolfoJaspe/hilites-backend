require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const BackgroundProcessor = require('./services/backgroundProcessor');

// Import routes
const authRoutes = require('./routes/auth');
const preferencesRoutes = require('./routes/preferences');
const teamsRoutes = require('./routes/teams');
const highlightsRoutes = require('./routes/highlights');
const matchesRoutes = require('./routes/matches');
const aiDiscoveryRoutes = require('./routes/ai-discovery');
const multiSourceMatchesRoutes = require('./routes/multi-source-matches');
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

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/preferences', preferencesRoutes);
app.use('/api/teams', teamsRoutes);
app.use('/api/highlights', highlightsRoutes);
app.use('/api/matches', matchesRoutes);
app.use('/api/ai-discovery', aiDiscoveryRoutes);
app.use('/api/multi-source-matches', multiSourceMatchesRoutes);
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

app.listen(port, () => {
  console.log(`🚀 Hilites Backend Server is running on port ${port}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${port}/health`);

  // Initialize and schedule background processing
  const processor = new BackgroundProcessor();
  app.locals.backgroundProcessor = processor;

  // Kick off immediately on server start
  processor.processNewMatches().catch((err) => {
    console.error('Initial background processing failed:', err.message);
  });

  // Schedule periodic processing
  setInterval(() => {
    processor.processNewMatches().catch((err) => {
      console.error('Scheduled background processing failed:', err.message);
    });
  }, backgroundIntervalMs);
});