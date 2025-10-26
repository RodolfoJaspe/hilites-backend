import { BackgroundProcessor } from '../../services/backgroundProcessor';

// Initialize the background processor
const backgroundProcessor = new BackgroundProcessor();

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Verify the request is coming from Vercel Cron
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.error('❌ Unauthorized cron request');
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    console.log('🔄 [VERCEL CRON] Running scheduled match fetch...');
    await backgroundProcessor.fetchAndProcessMatches();
    return res.status(200).json({ 
      success: true, 
      message: 'Match fetch completed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ [VERCEL CRON] Error in match fetch:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
}
