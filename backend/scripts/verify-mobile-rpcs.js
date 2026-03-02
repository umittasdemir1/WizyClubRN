require('dotenv').config({ path: require('path').resolve(__dirname, '..', '..', '.env') });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/SUPABASE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function verifyReadRpc(name, params) {
  const label = params.__label || name;
  if ('__label' in params) {
    delete params.__label;
  }

  const { error } = await supabase.rpc(name, params);
  if (!error) {
    console.log(`PASS ${label}`);
    return true;
  }

  if (error.code === '42883') {
    console.log(`MISSING ${label}`);
    return false;
  }

  console.log(`PASS ${label} (reachable with db response: ${error.code || 'unknown'})`);
  return true;
}

async function verifyToggleLike() {
  const { error } = await supabase.rpc('toggle_like_v1', {
    p_user_id: '00000000-0000-0000-0000-000000000000',
    p_video_id: '00000000-0000-0000-0000-000000000000',
  });

  if (!error) {
    console.log('PASS toggle_like_v1');
    return true;
  }

  if (error.code === '42883') {
    console.log('MISSING toggle_like_v1');
    return false;
  }

  console.log(`PASS toggle_like_v1 (reachable with db response: ${error.code || 'unknown'})`);
  return true;
}

async function verifyToggleSave() {
  const { error } = await supabase.rpc('toggle_save_v1', {
    p_user_id: '00000000-0000-0000-0000-000000000000',
    p_video_id: '00000000-0000-0000-0000-000000000000',
  });

  if (!error) {
    console.log('PASS toggle_save_v1');
    return true;
  }

  if (error.code === '42883') {
    console.log('MISSING toggle_save_v1');
    return false;
  }

  console.log(`PASS toggle_save_v1 (reachable with db response: ${error.code || 'unknown'})`);
  return true;
}

async function main() {
  const checks = await Promise.all([
    verifyReadRpc('get_feed_page_v1', { p_limit: 1, __label: 'get_feed_page_v1' }),
    verifyReadRpc('get_user_interaction_v1', {
      p_user_id: '__rpc_probe__',
      p_activity_type: 'saved',
      __label: 'get_user_interaction_v1(saved)',
    }),
    verifyReadRpc('get_user_interaction_v1', {
      p_user_id: '__rpc_probe__',
      p_activity_type: 'history',
      __label: 'get_user_interaction_v1(history)',
    }),
    verifyReadRpc('search_hashtags_v1', {
      p_query: 'w',
      p_limit: 1,
      __label: 'search_hashtags_v1',
    }),
    verifyToggleLike(),
    verifyToggleSave(),
  ]);

  if (checks.every(Boolean)) {
    console.log('All mobile optimization RPCs are reachable.');
    return;
  }

  process.exitCode = 1;
}

main().catch((error) => {
  console.error('Verification failed', error);
  process.exit(1);
});
