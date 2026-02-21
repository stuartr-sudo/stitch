import { createClient } from '@supabase/supabase-js';

/**
 * Look up a user's API keys from the user_api_keys table.
 * Falls back to server env vars for the owner account (OWNER_EMAIL).
 *
 * @param {string} userId - The authenticated user's UUID
 * @param {string} [userEmail] - The authenticated user's email (for owner check)
 * @returns {{ falKey: string|null, wavespeedKey: string|null, openaiKey: string|null, elevenlabsKey: string|null, huggingfaceKey: string|null }}
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
    .select('fal_key, wavespeed_key, openai_key, elevenlabs_key, huggingface_key')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[getUserKeys] DB error:', error.message);
    throw new Error('Failed to retrieve API keys');
  }

  const isOwner = process.env.OWNER_EMAIL
    && userEmail
    && userEmail.toLowerCase() === process.env.OWNER_EMAIL.toLowerCase();

  const envFallback = (dbVal, envVar) => dbVal || (isOwner ? (process.env[envVar] || null) : null);

  return {
    falKey:         envFallback(data?.fal_key,         'FAL_KEY'),
    wavespeedKey:   envFallback(data?.wavespeed_key,   'WAVESPEED_API_KEY'),
    openaiKey:      envFallback(data?.openai_key,      'OPENAI_API_KEY'),
    elevenlabsKey:  envFallback(data?.elevenlabs_key,  'ELEVENLABS_API_KEY'),
    huggingfaceKey: envFallback(data?.huggingface_key, 'HUGGINGFACE_API_KEY'),
  };
}
