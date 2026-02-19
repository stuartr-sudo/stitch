import { createClient } from '@supabase/supabase-js';

/**
 * Look up a user's API keys from the user_api_keys table.
 * Falls back to server env vars for the owner account (OWNER_EMAIL).
 *
 * @param {string} userId - The authenticated user's UUID
 * @param {string} [userEmail] - The authenticated user's email (for owner check)
 * @returns {{ falKey: string|null, wavespeedKey: string|null }}
 */
export async function getUserKeys(userId, userEmail) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase not configured on server');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase
    .from('user_api_keys')
    .select('fal_key, wavespeed_key')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[getUserKeys] DB error:', error.message);
    throw new Error('Failed to retrieve API keys');
  }

  const falKey = data?.fal_key || null;
  const wavespeedKey = data?.wavespeed_key || null;

  // If user has their own keys, use them
  if (falKey || wavespeedKey) {
    return { falKey, wavespeedKey };
  }

  // Fall back to server env vars for the owner account
  const ownerEmail = process.env.OWNER_EMAIL;
  if (ownerEmail && userEmail && userEmail.toLowerCase() === ownerEmail.toLowerCase()) {
    return {
      falKey: process.env.FAL_KEY || null,
      wavespeedKey: process.env.WAVESPEED_API_KEY || null,
    };
  }

  return { falKey, wavespeedKey };
}
