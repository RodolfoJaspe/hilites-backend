const express = require('express');
const router = express.Router();
const BackgroundProcessor = require('../services/backgroundProcessor');  // Updated this line

// Initialize the background processor
const backgroundProcessor = new BackgroundProcessor();

/**
 * @route   GET /api/cron/fetch-matches
 * @desc    Trigger match fetching manually (protected by CRON_SECRET)
 * @access  Private (authenticated with CRON_SECRET)
 * @header  Authorization: Bearer {CRON_SECRET}
 */
router.get('/fetch-matches', async (req, res) => {
  // Verify the request is coming from an authorized source
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.error('❌ [CRON] Unauthorized request');
    return res.status(401).json({ 
      success: false, 
      message: 'Unauthorized',
      timestamp: new Date().toISOString()
    });
  }

  try {
    console.log('🔄 [CRON] Running scheduled match fetch...');
    await backgroundProcessor.fetchAndProcessMatches();
    
    return res.status(200).json({ 
      success: true, 
      message: 'Match fetch completed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ [CRON] Error in match fetch:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
});

module.exports = router;