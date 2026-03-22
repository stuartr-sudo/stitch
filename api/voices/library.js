import { createClient } from '@supabase/supabase-js';
import { VOICE_PRESETS } from '../lib/shortsTemplates.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: userKeys } = await supabase
    .from('user_api_keys')
    .select('elevenlabs_key')
    .eq('user_id', req.user.id)
    .maybeSingle();

  const elevenlabsKey = userKeys?.elevenlabs_key || process.env.ELEVENLABS_API_KEY;

  // Only show free preset voices (no custom/paid voices from ElevenLabs API)
  const voices = VOICE_PRESETS.map(v => ({ ...v, source: 'preset' }));

  res.json(voices);
}
