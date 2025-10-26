const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

class MatchDataService {
  constructor() {
    this.footballDataApiKey = process.env.FOOTBALL_DATA_API_KEY;
    this.baseUrl = 'https://api.football-data.org/v4';
    
    // Initialize Supabase client
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Rate limiting
    this.requestCount = 0;
    this.lastReset = Date.now();
    this.maxRequestsPerMinute = 10; // Football-Data.org free tier limit
    
    // Configure axios instance for football-data.org
    this.footballDataClient = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'X-Auth-Token': this.footballDataApiKey,
        'Content-Type': 'application/json'
      },
      timeout: 10000 // 10 second timeout
    });
  }

  /**
   * Fetch matches from football-data.org API
   * @param {string} competitionId - The competition ID (e.g., 'PL', 'CL')
   * @param {Date} dateFrom - Start date for matches
   * @param {Date} dateTo - End date for matches
   * @returns {Promise<Array>} - Array of matches
   */
  async fetchMatches(competitionId, dateFrom, dateTo) {
    try {
      // Format dates as yyyy-MM-dd
      const formatDate = (date) => {
        const d = new Date(date);
        return d.toISOString().split('T')[0];
      };

      const fromDate = formatDate(dateFrom);
      const toDate = formatDate(dateTo);

      console.log(`⚽ Fetching matches for competition ${competitionId} from ${fromDate} to ${toDate}...`);

      const data = await this.makeFootballDataRequest(
        `/competitions/${competitionId}/matches?dateFrom=${fromDate}&dateTo=${toDate}`
      );
      
      return data.matches || [];
    } catch (error) {
      console.error('❌ Error fetching matches:', error.message);
      throw error;
    }
  }

  /**
   * Make a request to Football-Data.org API with rate limiting and retry logic
   */
  async makeFootballDataRequest(endpoint, retryCount = 0) {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000; // 1 second

    // Wait if we're approaching rate limits
    const now = Date.now();
    if (this.requestCount >= this.maxRequestsPerMinute) {
      const timeSinceReset = now - this.lastReset;
      if (timeSinceReset < 60000) { // 1 minute in ms
        const waitTime = 60000 - timeSinceReset + 1000; // Add 1 second buffer
        console.log(`⚠️ Approaching rate limit. Waiting ${Math.ceil(waitTime/1000)} seconds...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        this.requestCount = 0;
        this.lastReset = Date.now();
      }
    }

    try {
      const response = await this.footballDataClient.get(endpoint, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Hilites-App/1.0',
          'Accept-Encoding': 'gzip, compress, deflate, br'
        }
      });

      this.requestCount++;

      // Log rate limit info
      const remaining = response.headers['x-requests-available-minute'];
      const reset = response.headers['x-requestcounter-reset'];
      if (remaining) {
        console.log(`ℹ️ Requests remaining this minute: ${remaining}, resets in ${reset || 'unknown'} seconds`);
      }

      return response.data;

    } catch (error) {
      // Handle rate limiting
      if (error.response?.status === 429 && retryCount < MAX_RETRIES) {
        const retryAfter = parseInt(error.response.headers['retry-after'] || '5', 10) * 1000;
        console.warn(`⚠️ Rate limited. Retrying after ${retryAfter}ms... (Attempt ${retryCount + 1}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, retryAfter));
        return this.makeFootballDataRequest(endpoint, retryCount + 1);
      }

      // Log detailed error info
      if (error.response) {
        console.error('❌ Football-Data.org API error:', {
          status: error.response.status,
          statusText: error.response.statusText,
          url: error.config?.url,
          data: error.response.data,
          headers: error.response.headers
        });
      } else if (error.request) {
        console.error('❌ No response received from Football-Data.org:', error.request);
      } else {
        console.error('❌ Error setting up request to Football-Data.org:', error.message);
      }

      throw error;
    }
  }
}

module.exports = MatchDataService;
