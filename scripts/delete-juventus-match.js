require('dotenv').config({ path: './.env' });
const { createClient } = require('@supabase/supabase-js');

async function deleteJuventusMatch() {
  console.log('🗑️  Deleting broken Juventus match...\n');

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const matchId = 'c536dfd1-0d73-4ad4-940a-0f75b73ae454';

  try {
    const { error } = await supabase
      .from('matches')
      .delete()
      .eq('id', matchId);

    if (error) {
      console.log('❌ Error:', error.message);
      return;
    }

    console.log('✅ Match deleted successfully!');

    // Verify
    const { data, error: verifyError } = await supabase
      .from('matches')
      .select('id')
      .eq('id', matchId)
      .maybeSingle();

    if (verifyError) {
      console.log('❌ Error verifying:', verifyError.message);
    } else if (!data) {
      console.log('✅ Verified: Match no longer exists in database');
    } else {
      console.log('⚠️  Match still exists');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

deleteJuventusMatch().catch(console.error);

