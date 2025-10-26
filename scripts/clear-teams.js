require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role for production access
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Using SERVICE_ROLE_KEY for admin access

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Missing Supabase URL or SERVICE_ROLE_KEY in environment variables');
  process.exit(1);
}

console.log('🔌 Connecting to Supabase with service role...');
console.log(`🔗 Supabase URL: ${supabaseUrl}`);

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  }
});

async function clearTeamsTable() {
  try {
    console.log('🚀 Starting to clear teams table...');
    
    // First, check how many teams we have
    const { count, error: countError } = await supabase
      .from('teams')
      .select('*', { count: 'exact', head: true });
    
    if (countError) throw countError;
    
    if (count === 0) {
      console.log('ℹ️ Teams table is already empty');
      return;
    }
    
    console.log(`\n⚠️  WARNING: PRODUCTION DATABASE CONNECTION`);
    console.log(`⚠️  This will delete ALL ${count} teams from the PRODUCTION database`);
    console.log(`⚠️  Database: ${supabaseUrl}`);
    console.log('\nType "DELETE ALL TEAMS" to confirm this action:');
    
    // Wait for user confirmation
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    readline.question('', async (input) => {
      if (input === 'DELETE ALL TEAMS') {
        // Delete all teams
        const { error: deleteError } = await supabase
          .from('teams')
          .delete()
          .not('id', 'is', null); // This is a way to match all rows
        
        if (deleteError) throw deleteError;
        
        console.log(`✅ Successfully deleted ${count} teams`);
      } else {
        console.log('❌ Deletion cancelled');
      }
      
      readline.close();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Error clearing teams table:', error.message);
    process.exit(1);
  }
}

// Run the function
clearTeamsTable();
