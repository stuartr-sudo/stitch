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

  const voices = VOICE_PRESETS.map(v => ({ ...v, source: 'preset' }));

  if (elevenlabsKey) {
    try {
      const elRes = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: { 'xi-api-key': elevenlabsKey },
      });
      if (elRes.ok) {
        const data = await elRes.json();
        const customVoices = (data.voices || [])
          .filter(v => !VOICE_PRESETS.some(p => p.id === v.voice_id))
          .map(v => ({
            id: v.voice_id,
            name: v.name,
            description: v.labels?.description || v.labels?.accent || 'Custom voice',
            source: 'custom',
            niches: [],
          }));
        voices.push(...customVoices);
      }
    } catch (err) {
      console.error('[voices/library] ElevenLabs fetch error:', err.message);
    }
  }

  res.json(voices);
}
