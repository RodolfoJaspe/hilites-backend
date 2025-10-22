const MatchDataService = require('./matchDataService');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

class BackgroundProcessor {
  constructor() {
    this.matchDataService = new MatchDataService();
    this.isProcessing = false;
    this.lastProcessed = null;
  }

  /**
   * Process new matches and fetch data from APIs
   */
  async processNewMatches() {
    if (this.isProcessing) {
      console.log('⏳ Background processing already in progress, skipping...');
      return;
    }

    this.isProcessing = true;
    console.log('🚀 Starting background match processing...');

    try {
      // 1. Fetch and store today's matches
      await this.fetchTodaysMatches();

      // 2. Update match scores for live/finished matches
      await this.updateMatchScores();

      // 3. Clean up old processing logs
      await this.cleanupOldLogs();

      this.lastProcessed = new Date();
      console.log('✅ Background processing completed successfully');

    } catch (error) {
      console.error('❌ Background processing error:', error);
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Fetch today's matches from Football-Data.org
   */
  async fetchTodaysMatches() {
    try {
      console.log('📅 Fetching today\'s matches...');
      
      // Prefer multi-source ingestion (Football-Data + API-Football),
      // fallback to Football-Data-only if multi-source fails.
      const today = new Date().toISOString().split('T')[0];
      let todaysMatches = [];
      try {
        todaysMatches = await this.matchDataService.fetchMatchesByDateAllSources(today);
      } catch (e) {
        console.warn('⚠️ Multi-source fetch failed, falling back to Football-Data-only:', e.message);
        todaysMatches = await this.matchDataService.fetchTodaysMatches();
      }

      if (todaysMatches.length > 0) {
        await this.matchDataService.storeMatches(todaysMatches);
        console.log(`✅ Stored ${todaysMatches.length} matches for today`);
      } else {
        console.log('ℹ️ No matches found for today');
      }

    } catch (error) {
      console.error('❌ Error fetching today\'s matches:', error);
      throw error;
    }
  }

  /**
   * Update match scores for live and recently finished matches
   */
  async updateMatchScores() {
    try {
      console.log('⚽ Updating match scores...');

      // Get matches that are live or finished in the last 24 hours
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const { data: matchesToUpdate, error } = await supabase
        .from('matches')
        .select('id, external_id, status, match_date')
        .in('status', ['live', 'finished'])
        .gte('match_date', yesterday.toISOString())
        .order('match_date', { ascending: false });

      if (error) {
        console.error('❌ Error fetching matches to update:', error);
        return;
      }

      if (!matchesToUpdate || matchesToUpdate.length === 0) {
        console.log('ℹ️ No matches need score updates');
        return;
      }

      console.log(`🔄 Updating scores for ${matchesToUpdate.length} matches`);

      // For each match, fetch updated data
      for (const match of matchesToUpdate) {
        try {
          await this.updateSingleMatch(match.external_id);
          // Add small delay to respect rate limits
          await this.delay(1000);
        } catch (error) {
          console.error(`❌ Error updating match ${match.external_id}:`, error.message);
        }
      }

      console.log('✅ Match score updates completed');

    } catch (error) {
      console.error('❌ Error in updateMatchScores:', error);
      throw error;
    }
  }

  /**
   * Update a single match by external ID
   */
  async updateSingleMatch(externalId) {
    try {
      // Fetch match data from Football-Data.org
      const matchData = await this.matchDataService.makeFootballDataRequest(`/matches/${externalId}`);
      
      if (!matchData) {
        console.log(`⚠️ No data found for match ${externalId}`);
        return;
      }

      const updatedMatch = {
        status: this.matchDataService.mapMatchStatus(matchData.status),
        home_score: matchData.score?.fullTime?.home || null,
        away_score: matchData.score?.fullTime?.away || null,
        venue: matchData.venue || null,
        referee: matchData.referees?.[0]?.name || null,
        attendance: matchData.attendance || null
      };

      // Update the match in database
      const { error } = await supabase
        .from('matches')
        .update(updatedMatch)
        .eq('external_id', externalId);

      if (error) {
        console.error(`❌ Error updating match ${externalId}:`, error);
        throw error;
      }

      console.log(`✅ Updated match ${externalId}: ${updatedMatch.status}`);

    } catch (error) {
      console.error(`❌ Error updating single match ${externalId}:`, error);
      throw error;
    }
  }

  /**
   * Get matches that need AI processing for highlights
   */
  async getMatchesForAIProcessing(limit = 10) {
    try {
      console.log(`🤖 Getting ${limit} matches for AI processing...`);

      const matches = await this.matchDataService.getMatchesWithoutHighlights(limit);
      
      console.log(`✅ Found ${matches.length} matches for AI processing`);
      return matches;

    } catch (error) {
      console.error('❌ Error getting matches for AI processing:', error);
      throw error;
    }
  }

  /**
   * Log AI processing activity
   */
  async logAIProcessing(matchId, processingType, status, inputData = null, outputData = null, errorMessage = null) {
    try {
      const { error } = await supabase
        .from('ai_processing_logs')
        .insert({
          match_id: matchId,
          processing_type: processingType,
          status: status,
          input_data: inputData,
          output_data: outputData,
          error_message: errorMessage,
          processing_time_ms: null, // Will be calculated when completed
          retry_count: 0
        });

      if (error) {
        console.error('❌ Error logging AI processing:', error);
        throw error;
      }

    } catch (error) {
      console.error('❌ Error in logAIProcessing:', error);
      throw error;
    }
  }

  /**
   * Update AI processing log with completion status
   */
  async updateAIProcessingLog(logId, status, outputData = null, errorMessage = null, processingTimeMs = null) {
    try {
      const updateData = {
        status: status,
        completed_at: status === 'completed' ? new Date().toISOString() : null
      };

      if (outputData) updateData.output_data = outputData;
      if (errorMessage) updateData.error_message = errorMessage;
      if (processingTimeMs) updateData.processing_time_ms = processingTimeMs;

      const { error } = await supabase
        .from('ai_processing_logs')
        .update(updateData)
        .eq('id', logId);

      if (error) {
        console.error('❌ Error updating AI processing log:', error);
        throw error;
      }

    } catch (error) {
      console.error('❌ Error in updateAIProcessingLog:', error);
      throw error;
    }
  }

  /**
   * Clean up old processing logs
   */
  async cleanupOldLogs(daysToKeep = 30) {
    try {
      console.log(`🧹 Cleaning up processing logs older than ${daysToKeep} days...`);

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const { data, error } = await supabase
        .from('ai_processing_logs')
        .delete()
        .lt('created_at', cutoffDate.toISOString())
        .in('status', ['completed', 'failed']);

      if (error) {
        console.error('❌ Error cleaning up logs:', error);
        throw error;
      }

      console.log(`✅ Cleaned up old processing logs`);

    } catch (error) {
      console.error('❌ Error in cleanupOldLogs:', error);
      throw error;
    }
  }

  /**
   * Get processing statistics
   */
  async getProcessingStats() {
    try {
      const { data: stats, error } = await supabase
        .from('ai_processing_logs')
        .select('status, processing_type')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours

      if (error) {
        console.error('❌ Error fetching processing stats:', error);
        throw error;
      }

      const statsSummary = {
        total_processed: stats.length,
        completed: stats.filter(s => s.status === 'completed').length,
        failed: stats.filter(s => s.status === 'failed').length,
        pending: stats.filter(s => s.status === 'pending').length,
        processing: stats.filter(s => s.status === 'processing').length,
        by_type: {}
      };

      // Group by processing type
      stats.forEach(stat => {
        if (!statsSummary.by_type[stat.processing_type]) {
          statsSummary.by_type[stat.processing_type] = {
            total: 0,
            completed: 0,
            failed: 0
          };
        }
        statsSummary.by_type[stat.processing_type].total++;
        if (stat.status === 'completed') statsSummary.by_type[stat.processing_type].completed++;
        if (stat.status === 'failed') statsSummary.by_type[stat.processing_type].failed++;
      });

      return statsSummary;

    } catch (error) {
      console.error('❌ Error in getProcessingStats:', error);
      throw error;
    }
  }

  /**
   * Utility function to add delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get processor status
   */
  getStatus() {
    return {
      is_processing: this.isProcessing,
      last_processed: this.lastProcessed,
      uptime: process.uptime()
    };
  }
}

module.exports = BackgroundProcessor;




