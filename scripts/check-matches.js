require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkMatches() {
  try {
    console.log('🔍 Checking matches in the database...');
    
    // Get matches from the last 3 days
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    
    const { data: matches, error } = await supabase
      .from('matches')
      .select('*')
      .gte('match_date', threeDaysAgo.toISOString())
      .order('match_date', { ascending: true });

    if (error) {
      throw error;
    }

    console.log(`✅ Found ${matches.length} matches in the last 3 days`);
    
    // Group matches by date for better readability
    const matchesByDate = matches.reduce((acc, match) => {
      const date = new Date(match.match_date).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push({
        id: match.id,
        home_team_id: match.home_team_id,
        away_team_id: match.away_team_id,
        competition_name: match.competition_name,
        status: match.status,
        home_score: match.home_score,
        away_score: match.away_score,
        match_date: match.match_date
      });
      return acc;
    }, {});

    console.log('📅 Matches by date:', JSON.stringify(matchesByDate, null, 2));
    
    // Check for any potential issues
    if (Object.keys(matchesByDate).length === 0) {
      console.warn('⚠️ No matches found in the last 3 days. This might indicate an issue with match fetching.');
    } else {
      console.log('✅ Database check completed successfully');
    }
    
  } catch (error) {
    console.error('❌ Error checking matches:', error);
  }
}

// Run the check
checkMatches();
